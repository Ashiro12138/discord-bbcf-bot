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

		const { gameid, lobbysteamid, communityvisibilitystate, gameextrainfo, profilestate } =
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

		const {
			data: { response: ownedGameContents },
		} = await axios.get(
			`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steam_id}&include_played_free_games=1`,
		);

		if (!ownedGameContents.game_count) {
			await interaction.reply(
				`SteamAPI: GetPlayerSummaries() failed for ${interaction.user.username}. Is the Steam Web API down?`,
			);
		} else if (communityvisibilitystate !== 3) {
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Your profile's Game Details are not public, so the bot can't see if you're in a lobby.`,
			);
			await interaction.channel.send(
				'https://raw.githubusercontent.com/ctmatthews/sglobbylink-discord.py/master/public_profile_instructions.jpg',
			);
		} else if (profilestate === 0) {
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Steam thinks you're offline. Make sure you're connected to Steam, and not set to Appear Offline on your friends list.`,
			);
		} else if (!gameid) {
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Steam thinks you're online but not playing a game.`,
			);
		} else {
			const gameName = gameextrainfo ?? 'a game';
			await interaction.reply(
				`Lobby not found for ${interaction.user.username}: Steam thinks you're playing ${gameName} but not in a lobby.`,
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
