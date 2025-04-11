const { Client, GatewayIntentBits, EmbedBuilder, Partials, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const express = require("express");
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3080;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.GuildMember, Partials.User]
});

const invites = new Map();
const inviteCounts = new Map();

const SERVER_ID = '1360048473260691587';
const WELCOME_CHANNEL_ID = '1360048701845934140';
const GOODBYE_CHANNEL_ID = '1360048744942403734';
const ALLOWED_VERIFICATION_ROLES = ['1360049930454171803', '1360050042052022472'];
const VERIFIED_CHANNEL_ID = '1360049141438353478';
const UNVERIFIED_ROLE_ID = '1360050193894211644';
const VERIFIED_ROLE_ID = '1360050167293939874';

const keepAlive = () => {
    setInterval(() => {
        http.get("http://courageous-jacquetta-k4rp4tek-754678e4.koyeb.app/");
    }, 300000);
};
keepAlive();

app.get("/", (req, res) => res.send("Bot działa!"));
app.listen(PORT);

async function sendVerificationMessage(channel) {
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    const existingMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].description === "**Aby się zweryfikować, kliknij przycisk poniżej!**");

    if (!existingMessage) {
        const embed = new EmbedBuilder()
            .setDescription('# `Aby się zweryfikować, kliknij przycisk poniżej!`')
            .setColor('#0066ff');

        const button = new ButtonBuilder()
            .setCustomId('verify_button')
            .setLabel('Zweryfikuj się!')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
    }
}

client.once('ready', async () => {
    client.user.setPresence({ status: 'invisible' });

    client.guilds.cache.forEach(async guild => {
        try {
            const firstInvites = await guild.invites.fetch();
            invites.set(guild.id, new Map(firstInvites.map(invite => [invite.code, invite.uses])));

            const userInvites = new Map();
            firstInvites.forEach(invite => {
                if (invite.inviter) {
                    userInvites.set(invite.inviter.id, (userInvites.get(invite.inviter.id) || 0) + invite.uses);
                }
            });
            inviteCounts.set(guild.id, userInvites);
        } catch (error) {}
    });
});

client.on('messageCreate', async (message) => {
    if (message.content === '!weryfikacja') {
        if (!message.member.roles.cache.some(role => ALLOWED_VERIFICATION_ROLES.includes(role.id))) {
            return message.reply('Nie masz uprawnień do użycia tej komendy.');
        }
        const channel = await client.channels.fetch(VERIFIED_CHANNEL_ID);
        await sendVerificationMessage(channel);
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID);
        if (!channel) return;

        const role = await member.guild.roles.fetch(UNVERIFIED_ROLE_ID);
        if (role) {
            await member.roles.add(role);
        }

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('👋')
            .setAuthor({ name: 'Witaj na serwerze!' })
            .setColor('#0066ff')
            .setDescription(`**Siemano \`{user}\`, sigmo! Obyś został/a tu na dłużej.**`.replace("{user}", member.user.username))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));

        channel.send({ embeds: [welcomeEmbed] });
    } catch (error) {}
});

client.on('guildMemberRemove', async (member) => {
    try {
        const channel = await member.guild.channels.fetch(GOODBYE_CHANNEL_ID);
        if (!channel) return;

        const goodbyeEmbed = new EmbedBuilder()
            .setTitle('👋')
            .setAuthor({ name: 'Do zobaczenia!' })
            .setColor('#0066ff')
            .setDescription(`**Żegnaj \`{user}\`! Mamy nadzieję, że kiedyś wrócisz!**`.replace("{user}", member.user.username))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));

        channel.send({ embeds: [goodbyeEmbed] });
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'verify_button') {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (member) {
                if (UNVERIFIED_ROLE_ID) {
                    await member.roles.remove(UNVERIFIED_ROLE_ID);
                }
                await member.roles.add(VERIFIED_ROLE_ID);
                await interaction.reply({
                    content: 'Pomyślnie się zweryfikowałeś/aś!',
                    flags: 64
                });
            }
        } catch (error) {}
    }
});

client.login(process.env.TOKEN);
