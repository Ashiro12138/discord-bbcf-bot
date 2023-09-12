const { SlashCommandBuilder } = require('discord.js');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('../../logger');

const getSteamIdFromProfileLink = (steam_profile_link) => {
	return steam_profile_link.match(/https:\/\/steamcommunity\.com\/id\/([^\/]+)/);
};

const setSteamId = async (discord_user_id, steam_id) => {
	const db = getFirestore();
	return db.collection('discord_user_id').doc(discord_user_id).set({
		steam_id,
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
		const [, steam_id] = result;
		setSteamId(interaction.user.id, steam_id);
		await interaction.reply(`Saved ${steam_id}'s Steam ID.`);
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
