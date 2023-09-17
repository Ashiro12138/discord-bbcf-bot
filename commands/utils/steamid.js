const { SlashCommandBuilder } = require('discord.js');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('../../logger');
const { steamApiKey } = require('../../config.json');
const axios = require('axios');

const getSteamIdFromProfileLink = (steam_profile_link) => {
	return steam_profile_link.match(
		/https:\/\/steamcommunity\.com\/(id\/([^\/\n]+)|profiles\/([0-9]{17}))/,
	);
};

const setSteamId = async (discord_user_id, steam_id, discord_username) => {
	const db = getFirestore();
	return db.collection('discord_user_id').doc(discord_user_id).set({
		steam_id,
		discord_username,
	});
};

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('steamid')
		.setDescription('Sets your steam id for game lobby link searching')
		.addStringOption((option) =>
			option
				.setName('steam_profile_link')
				.setDescription('Your full steam profile link')
				.setRequired(true),
		),
	async execute(interaction) {
		const steam_profile_link = interaction.options.getString('steam_profile_link');
		const result = getSteamIdFromProfileLink(steam_profile_link);
		if (!result) {
			await interaction.reply(`\`${steam_profile_link}\` is not a valid steam profile link.`);
			logger.info({
				command: '/steamid',
				userId: interaction.user.id,
				username: interaction.user.username,
				guildId: interaction.guildId,
				channelId: interaction.channelId,
				saveSuccess: false,
				attemptedLink: steam_profile_link,
			});
			return;
		}
		const [, , group2, group3] = result;
		let steam_id;
		if (group3) {
			// Matches `.../profiles/...`
			steam_id = group3;
		} else {
			// Matches `.../id/...`
			const {
				data: { response },
			} = await axios.get(
				`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${group2}`,
			);
			steam_id = response.steamid;
			if (!steam_id) {
				logger.info({
					command: '/steamid',
					userId: interaction.user.id,
					username: interaction.user.username,
					guildId: interaction.guildId,
					channelId: interaction.channelId,
					saveSuccess: false,
					attemptedLink: steam_profile_link,
				});
				return;
			}
		}
		setSteamId(interaction.user.id, steam_id, interaction.user.username);
		await interaction.reply(`Saved ${interaction.user.username}'s Steam ID.`);
		logger.info({
			command: '/steamid',
			userId: interaction.user.id,
			username: interaction.user.username,
			guildId: interaction.guildId,
			channelId: interaction.channelId,
			saveSuccess: true,
		});
	},
};
