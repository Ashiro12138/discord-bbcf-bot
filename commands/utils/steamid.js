const { SlashCommandBuilder } = require('discord.js');
const { getFirestore } = require('firebase-admin/firestore');

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
            return;
        }
        const [, steam_id] = result;
        setSteamId(interaction.user.id, steam_id);
        await interaction.reply(`Saved ${steam_id}'s Steam ID.`);
    },
};
