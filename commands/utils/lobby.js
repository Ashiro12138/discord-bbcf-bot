const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('../../logger');
const { steamApiKey } = require('../../config.json');

const getSteamId = async (discord_user_id) => {
	const db = getFirestore();
	return db.collection('discord_user_id').doc(discord_user_id).get();
};

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('lobby')
		.setDescription('Searches for join game link and replies'),
	async execute(interaction) {
		const steamId = await getSteamId(interaction.user.id);
		if (!steamId.exists) {
			await interaction.reply(
				`Steam ID not found for ${interaction.user.username}. Type \`/steamid\` and enter your full Steam profile URL, e.g. \`/steamid https://steamcommunity.com/id/Ashiro12138/\` or \`/steamid https://steamcommunity.com/profiles/76561198131623683/\``,
			);
			await interaction.channel.send(
				'https://raw.githubusercontent.com/ctmatthews/sglobbylink-discord.py/master/steam_url_instructions.jpg',
			);
			logger.info({ command: '/lobby', user: interaction.user.username, hasSteamId: false });
			return;
		}

		const steam_id = steamId.data().steam_id;

		const {
			data: { response },
		} = await axios.get(
			`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steam_id}`,
		);

		if (!response) {
			await interaction.reply(
				`SteamAPI: GetPlayerSummaries() failed for ${interaction.user.username}. Is the Steam Web API down?`,
			);
		}

		const { gameid, lobbysteamid, communityvisibilitystate, gameextrainfo } =
			response['players'][0];

		if (steam_id && gameid && lobbysteamid) {
			const link = `steam://joinlobby/${gameid}/${lobbysteamid}/${steam_id}`;
			const gameName = gameextrainfo ? `${gameextrainfo}'s ` : '';
			await interaction.reply(`${interaction.user.username}'s ${gameName}lobby: ${link}`);
			logger.info({
				command: '/lobby',
				userId: interaction.user.id,
				username: interaction.user.username,
				guildId: interaction.guildId,
				channelId: interaction.channelId,
				hasSteamid: true,
				hasLink: true,
			});
			return;
		}

		if (communityvisibilitystate === 3) {
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Steam thinks you're offline. Make sure you're connected to Steam, and not set to Appear Offline on your friends list.`,
			);
		} else {
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Your profile is not public, so the bot can't see if you're in a lobby.`,
			);
		}

		logger.info({
			command: '/lobby',
			userId: interaction.user.id,
			username: interaction.user.username,
			guildId: interaction.guildId,
			channelId: interaction.channelId,
			hasSteamId: true,
			hasLink: false,
		});
	},
};
