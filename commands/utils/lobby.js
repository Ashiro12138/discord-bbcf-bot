const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const getJoinLink = async (username = 'Ashiro12138') => {
		const { data } = await axios.get(
			`https://steamcommunity.com/id/${username}/`
		);
		const $ = cheerio.load(data);

        return $('div.profile_in_game_joingame > a').first().attr('href')
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lobby')
        .setDescription('Searches for join game link and replies'),
    async execute(interaction) {
        const link = await getJoinLink();
        if (link) {
            await interaction.reply(`${interaction.user.username}'s BlazBlue Centralfiction lobby: ${link}`);
        } else {
            await interaction.reply(`Lobby not found for ${interaction.user.username}: Steam thinks you're offline. Make sure you're connected to Steam, and not set to Appear Offline on your friends list.`)
        }
    }
}