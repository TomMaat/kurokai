const http = require('http');
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    ActivityType,
    MessageFlags,
    AuditLogEvent,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder
} = require('discord.js');

// --- KLEINE HTTP SERVER ZODAT RENDER EEN POORT ZIET ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Familie Zoet bot is online');
}).listen(PORT, () => {
    console.log(`HTTP server luistert op poort ${PORT}`);
});

// --- PAARS THEMA ---
const PURPLE = {
    main: '#9b59b6',
    dark: '#7d3c98',
    light: '#bb8fce',
    accent: '#a569bd',
    soft: '#d2b4de'
};

// --- INSTELLINGEN ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GIST_ID: process.env.GIST_ID || '',
    SERVER_NAME: 'Familie Zoet',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1559589352185528421/1567249653492351066/Zoet.png?ex=6aeb7e7b&is=6aea2cfb&hm=7f4e899aec06642e8509c44999dd0368c84e56983cc0bbc1b0cc69f57470b62d&',

    WELCOME_CHANNEL_ID: '1567280566041190410',
    VERIFY_CHANNEL_ID: '1567280670915436705',
    VERIFY_ROLE_ID: '1554510750092099690',
    VERIFY_BUTTON_ID: 'verify_click',

    SNAP_CHANNEL_ID: '1567284467347751042',
    SNAP_ROLE_ID: '1559951158951419954',
    SNAP_BUTTON_ID: 'snap_ping_click',

    HONEYPOT_CHANNEL_ID: '1567295355740229733',

    CALL_CHANNEL_ID: '1567542253633933402',
    CALL_CATEGORY_ID: '1567297941146829040',

    VERIFY_LOG_ID: '1567547632211988640',
    SNAP_LOG_ID: '1567547761912578141',
    CALL_LOG_ID: '1567547888119058562',
    JOIN_LEAVE_LOG_ID: '1567549266635788370',

    MEMBERS_LIST_CHANNEL_ID: '1567644680659927121',
    LID_ROLE_ID: '1567227107258671145',

    EMPTY_CALL_TIMEOUT_MS: 60 * 60 * 1000,
    EMPTY_CALL_CHECK_MS: 5 * 60 * 1000,

    ANTINUKE_ALLOWED_USERS: [
        '1033753872927293520',
        '1559586201348866050'
    ],
    ANTINUKE_LIMITS: {
        channelDelete: 3,
        roleDelete: 3,
        banAdd: 3,
        kickAdd: 3,
        memberRoleUpdate: 10
    },
    ANTINUKE_WINDOW_MS: 10000
};

// --- RANGEN (geen emoji's) ---
const RANKS = [
    { name: '𝐙𝐨𝐞𝐭 𝐊𝐨𝐧𝐢𝐧𝐠', roleId: '1567226745143300106', level: 6 },
    { name: '𝐙𝐨𝐞𝐭 𝐎𝐩𝐩𝐞𝐫𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐚𝐧𝐭', roleId: '1567241269082726450', level: 5 },
    { name: '𝐙𝐨𝐞𝐭 𝐃𝐢𝐜𝐭𝐚𝐭𝐨𝐫', roleId: '1567245029255413890', level: 4 },
    { name: '𝐙𝐨𝐞𝐭 𝐋𝐮𝐢𝐭𝐞𝐧𝐚𝐧𝐭', roleId: '1567264503744299109', level: 3 },
    { name: '𝐙𝐨𝐞𝐭 𝐆𝐞𝐧𝐞𝐫𝐚𝐥', roleId: '1567246499069566987', level: 2 },
    { name: '𝐙𝐨𝐞𝐭 𝐌𝐚𝐧𝐚𝐠𝐞𝐫', roleId: '1567643616745230459', level: 1 }
];
const SORTED_RANKS = [...RANKS].sort((a, b) => b.level - a.level);
const WATCHED_ROLE_IDS = new Set(RANKS.map(r => r.roleId));

// --- GIST DATABASE ---
const GIST_FILE = 'zoet.json';
let gistId = CONFIG.GIST_ID;
let kickData = { total: 0 };
let antinukeData = { enabled: true };
let joinTimes = {};
let gistReady = false;

async function gistRequest(method, endpoint, body) {
    const url = `https://api.github.com${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${CONFIG.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Zoet-Family-Bot',
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
    }
    return res.json();
}

async function initGist() {
    if (!CONFIG.GITHUB_TOKEN) {
        console.log('Geen GITHUB_TOKEN ingesteld, database uitgeschakeld.');
        return;
    }
    try {
        if (gistId) {
            await gistRequest('GET', `/gists/${gistId}`);
            gistReady = true;
            console.log(`Gist geladen: ${gistId}`);
        } else {
            const gist = await gistRequest('POST', '/gists', {
                description: 'Familie Zoet bot database',
                public: false,
                files: {
                    [GIST_FILE]: {
                        content: JSON.stringify({
                            kicks: { total: 0 },
                            antinuke: { enabled: true },
                            joinTimes: {}
                        }, null, 2)
                    }
                }
            });
            gistId = gist.id;
            gistReady = true;
            console.log('========================================');
            console.log(`NIEUWE GIST AANGEMAAKT: ${gistId}`);
            console.log(`Zet GIST_ID=${gistId} in Render Environment`);
            console.log('========================================');
        }
        await loadFromGist();
    } catch (err) {
        console.error('Fout bij initialiseren gist:', err.message);
    }
}

async function loadFromGist() {
    if (!gistReady || !gistId) return;
    try {
        const gist = await gistRequest('GET', `/gists/${gistId}`);
        const file = gist.files[GIST_FILE];
        if (file?.content) {
            const data = JSON.parse(file.content);
            if (data.kicks) kickData = data.kicks;
            if (data.antinuke) antinukeData = data.antinuke;
            if (data.joinTimes) joinTimes = data.joinTimes;
        }
        console.log(`Database geladen: kicks=${kickData.total}, antinuke=${antinukeData.enabled}, joinTimes=${Object.keys(joinTimes).length}`);
    } catch (err) {
        console.error('Fout bij laden database:', err.message);
    }
}

async function saveToGist() {
    if (!gistReady || !gistId) return;
    try {
        await gistRequest('PATCH', `/gists/${gistId}`, {
            files: {
                [GIST_FILE]: {
                    content: JSON.stringify({
                        kicks: kickData,
                        antinuke: antinukeData,
                        joinTimes
                    }, null, 2)
                }
            }
        });
    } catch (err) {
        console.error('Fout bij opslaan database:', err.message);
    }
}

// --- FONT HELPER ---
const FONT_MAP = {
    a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣',
    k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭',
    u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
    A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉',
    K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓',
    U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙',
    0: '𝟎', 1: '𝟏', 2: '𝟐', 3: '𝟑', 4: '𝟒', 5: '𝟓', 6: '𝟔', 7: '𝟕', 8: '𝟖', 9: '𝟗'
};
function toFont(text) {
    return text.split('').map(ch => FONT_MAP[ch] || ch).join('');
}

function formatDuration(ms) {
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}u`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0 || s > 0) parts.push(`${s}s`);
    return parts.join(' ');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const actionTracker = new Map();
const activeCalls = new Map();
const callAllowed = new Map();
const roleCountCache = new Map();
const callInfoMessages = new Map();

let membersListMessageId = null;
let membersUpdateTimeout = null;

// --- HELPERS ---
async function countRoleMembers(guild, roleId, forceFetch = false) {
    const now = Date.now();
    const cached = roleCountCache.get(roleId);
    if (!forceFetch && cached && now - cached.fetchedAt < 60000) {
        return cached.count;
    }
    try {
        await guild.members.fetch();
    } catch (err) {
        console.error('Fout bij members fetch:', err.message);
    }
    const role = guild.roles.cache.get(roleId);
    const count = role ? role.members.size : 0;
    roleCountCache.set(roleId, { count, fetchedAt: now });
    return count;
}

async function cleanupOldPanels(channel, markerText) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const old = messages.filter(m =>
            m.author.id === client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].description &&
            m.embeds[0].description.includes(markerText)
        );
        for (const msg of old.values()) {
            await msg.delete().catch(() => {});
        }
    } catch (err) {
        console.error('Fout bij opruimen oude panels:', err);
    }
}

async function clearChannel(channel) {
    try {
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 });
            if (fetched.size === 0) break;
            for (const msg of fetched.values()) {
                await msg.delete().catch(() => {});
            }
        } while (fetched.size > 0);
    } catch (err) {
        console.error('Fout bij leegmaken kanaal:', err);
    }
}

function updateStatus(guild) {
    if (!guild) return;
    client.user.setActivity(`${guild.memberCount} leden`, { type: ActivityType.Watching });
}

async function refreshPanel(channelId, buttonId, emoji, style, roleId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;
        const messages = await channel.messages.fetch({ limit: 20 });
        const panel = messages.find(m =>
            m.author.id === client.user.id &&
            m.components.length > 0 &&
            m.components[0].components.some(b => b.customId === buttonId)
        );
        if (!panel) return;

        const count = await countRoleMembers(channel.guild, roleId, false);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel(`${count}`)
                .setEmoji(emoji)
                .setStyle(style)
        );
        await panel.edit({ components: [row] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij refresh panel:', err);
    }
}

async function sendLog(guild, channelId, { title, description, color, thumbnail }) {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color || PURPLE.main)
            .setTimestamp();
        if (thumbnail) embed.setThumbnail(thumbnail);
        else embed.setThumbnail(CONFIG.LOGO_URL);
        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij sturen log:', err);
    }
}

function buildHoneypotEmbed() {
    return new EmbedBuilder()
        .setTitle('🍯 Dit is een honeypot kanaal!')
        .setDescription(
            '⚡ **Actie:** KICK\n\n' +
            '**PLAATS HIER NIETS** - Elk bericht, elke afbeelding, bijlage of sticker die hier geplaatst wordt, zorgt ervoor dat je **direct** gekickt wordt. Geen uitzonderingen!\n\n' +
            `**Totaal aantal kicks:** ${kickData.total}\n\n` +
            '🛡️ **Dit kanaal wordt 24/7 automatisch gecontroleerd**'
        )
        .setColor(PURPLE.main)
        .setThumbnail(CONFIG.LOGO_URL);
}

async function refreshHoneypotEmbed(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const panel = messages.find(m =>
            m.author.id === client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].description &&
            m.embeds[0].description.includes('honeypot kanaal')
        );
        if (!panel) return;
        await panel.edit({ embeds: [buildHoneypotEmbed()] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij updaten honeypot embed:', err);
    }
}

// --- LEDENLIJST (paars, geen emoji's bij rangen) ---
function buildMembersEmbed(guild) {
    let body = '';
    const uniqueMembers = new Set();

    for (const rank of SORTED_RANKS) {
        const role = guild.roles.cache.get(rank.roleId);
        if (!role) {
            body += `**${rank.name} (0)**\n➤ Rol niet gevonden\n\n`;
            continue;
        }

        const members = [...role.members.values()]
            .map(m => ({ id: m.id, name: m.displayName }))
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const m of members) uniqueMembers.add(m.id);

        body += `**${rank.name} (${members.length})**\n`;
        if (members.length > 0) {
            for (const m of members) body += `➤ <@${m.id}>\n`;
        } else {
            body += `➤ Geen leden\n`;
        }
        body += `\n`;
    }

    const lidRole = guild.roles.cache.get(CONFIG.LID_ROLE_ID);
    const lidCount = lidRole ? lidRole.members.size : 0;

    const description = `**Totaal Familie Zoet: ${uniqueMembers.size} leden**\n` +
        `**Algemeen leden: ${lidCount}**\n\n${body}`;

    return new EmbedBuilder()
        .setTitle('🏴 Familie Zoet Ledenlijst')
        .setColor(PURPLE.main)
        .setDescription(description.slice(0, 4096))
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setThumbnail(CONFIG.LOGO_URL)
        .setTimestamp();
}

async function updateMembersList() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return;

        const channel = await client.channels.fetch(CONFIG.MEMBERS_LIST_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.log('Ledenlijst kanaal niet gevonden');
            return;
        }

        const embed = buildMembersEmbed(guild);
        const payload = { embeds: [embed], allowedMentions: { parse: [] } };

        if (membersListMessageId) {
            try {
                const existing = await channel.messages.fetch(membersListMessageId);
                await existing.edit(payload);
                return;
            } catch (err) {
                membersListMessageId = null;
            }
        }

        try {
            const fetched = await channel.messages.fetch({ limit: 50 });
            const botMessages = fetched.filter(m => m.author.id === client.user.id);
            for (const m of botMessages.values()) {
                await m.delete().catch(() => {});
            }
        } catch (err) {}

        const sent = await channel.send(payload);
        membersListMessageId = sent.id;
        console.log('Ledenlijst gestuurd');
    } catch (err) {
        console.error('Fout bij updaten ledenlijst:', err);
    }
}

function scheduleMembersUpdate() {
    if (membersUpdateTimeout) return;
    membersUpdateTimeout = setTimeout(() => {
        membersUpdateTimeout = null;
        updateMembersList().catch(() => {});
    }, 3000);
}

// --- ANTI-NUKE ---
function checkThreshold(userId, type) {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const list = (actionTracker.get(key) || []).filter(t => now - t < CONFIG.ANTINUKE_WINDOW_MS);
    list.push(now);
    actionTracker.set(key, list);
    const limit = CONFIG.ANTINUKE_LIMITS[type] || 999;
    return list.length >= limit;
}

async function findExecutor(guild, type, targetId) {
    try {
        const logs = await guild.fetchAuditLogs({ type, limit: 5 });
        const entry = logs.entries.find(e =>
            (!targetId || e.target?.id === targetId) &&
            Date.now() - e.createdTimestamp < 15000
        );
        return entry ? entry.executor : null;
    } catch (err) {
        return null;
    }
}

async function punishUser(guild, userId, reason) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        const removable = member.roles.cache.filter(r =>
            r.id !== guild.id && guild.members.me.roles.highest.position > r.position
        );
        if (removable.size > 0) {
            await member.roles.remove(removable, `Anti-nuke: ${reason}`).catch(() => {});
        }
        await member.kick(`Anti-nuke: ${reason}`).catch(() => {});
        await sendLog(guild, CONFIG.JOIN_LEAVE_LOG_ID, {
            title: '🚨 Anti-nuke actie',
            description: `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n**Reden:** ${reason}`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } catch (err) {
        console.error('Fout bij straffen user:', err);
    }
}

async function handleNukeAction(guild, type, targetId) {
    if (!antinukeData.enabled) return;
    const executor = await findExecutor(guild, type, targetId);
    if (!executor) return;
    if (executor.id === client.user.id) return;
    if (CONFIG.ANTINUKE_ALLOWED_USERS.includes(executor.id)) return;
    if (checkThreshold(executor.id, type)) {
        await punishUser(guild, executor.id, `Te veel ${type} acties binnen ${CONFIG.ANTINUKE_WINDOW_MS / 1000}s`);
    }
}

// --- CALL PANEL ---
function buildCallPanel() {
    const embed = new EmbedBuilder()
        .setTitle('🔊 Calls')
        .setDescription(
            'Maak een call aan met de knop hieronder.\n\n' +
            '**Openbaar** — iedereen met verify kan joinen.\n' +
            '**Privé** — alleen jij kan mensen toelaten.\n\n' +
            '**Kantoor** — stuur je eigen call-paneel opnieuw om mensen toe te voegen of te verwijderen.'
        )
        .setColor(PURPLE.main)
        .setThumbnail(CONFIG.LOGO_URL);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('call_open_public')
            .setLabel('Openbaar')
            .setEmoji('🔊')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('call_open_private')
            .setLabel('Privé')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('call_office_panel')
            .setLabel('Kantoor')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

async function setupCallCategory(guild) {
    try {
        const category = guild.channels.cache.get(CONFIG.CALL_CATEGORY_ID);
        if (!category) return console.log('Call categorie niet gevonden');
        await category.permissionOverwrites.set([
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: CONFIG.VERIFY_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel] }
        ]);
        console.log('Call categorie rechten ingesteld');
    } catch (err) {
        console.error('Fout bij instellen call categorie:', err);
    }
}

function buildCallInfoMessage(channelId, ownerId, isPrivate) {
    const allowed = callAllowed.get(channelId) || new Set();

    let allowedList = '_Niemand anders heeft toegang._';
    if (allowed.size > 1) {
        allowedList = Array.from(allowed)
            .filter(id => id !== ownerId)
            .map(id => `<@${id}>`)
            .join('\n');
    }

    const embed = new EmbedBuilder()
        .setTitle(isPrivate ? '🔒 Privé call aangemaakt' : '🔊 Openbare call aangemaakt')
        .setDescription(
            `**Eigenaar:** <@${ownerId}>\n` +
            `**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n` +
            `**Kanaal:** <#${channelId}>\n\n` +
            `**Toegang:**\n${allowedList}\n\n` +
            (isPrivate
                ? 'Alleen jij kan mensen toelaten of verwijderen.'
                : 'Iedereen met verify kan joinen.')
        )
        .setColor(PURPLE.main)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

    const rows = [];

    if (isPrivate) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_allow_${channelId}`)
                    .setLabel('Iemand toelaten')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`call_remove_${channelId}`)
                    .setLabel('Iemand verwijderen')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`call_hide_${channelId}`)
                .setLabel('Verberg dit bericht')
                .setEmoji('🙈')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`call_delete_${channelId}`)
                .setLabel('Verwijder call')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return { embeds: [embed], components: rows };
}

function buildCallControlMessage(channelId, ownerId, isPrivate) {
    const embed = new EmbedBuilder()
        .setTitle(isPrivate ? '🔒 Privé call' : '🔊 Openbare call')
        .setDescription(
            `**Eigenaar:** <@${ownerId}>\n` +
            `**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n\n` +
            (isPrivate
                ? 'Alleen de eigenaar kan mensen toelaten of verwijderen via de knoppen hieronder.'
                : 'Iedereen met verify kan joinen.')
        )
        .setColor(PURPLE.main)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

    const rows = [];

    if (isPrivate) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_allow_${channelId}`)
                    .setLabel('Iemand toelaten')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`call_remove_${channelId}`)
                    .setLabel('Iemand verwijderen')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`call_delete_${channelId}`)
                .setLabel('Verwijder call')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return { embeds: [embed], components: rows };
}

async function updateCallControlMessage(channelId, ownerId, isPrivate) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const controlId = callInfoMessages.get(channelId);
        if (!controlId) return;

        const msg = await channel.messages.fetch(controlId).catch(() => null);
        if (!msg) return;

        const payload = buildCallControlMessage(channelId, ownerId, isPrivate);
        await msg.edit(payload).catch(() => {});
    } catch (err) {
        console.error('Fout bij updaten call control message:', err);
    }
}

async function createCall(interaction, name, isPrivate) {
    const guild = interaction.guild;
    const member = interaction.member;
    const prefix = isPrivate ? '🔒︱' : '🔊︱';
    const channelName = `${prefix}${toFont(name)}`;

    const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: CONFIG.VERIFY_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: isPrivate ? [PermissionFlagsBits.Connect] : []
        },
        {
            id: member.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers
            ]
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers
            ]
        }
    ];

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: CONFIG.CALL_CATEGORY_ID,
        permissionOverwrites: overwrites,
        reason: `Call van ${member.user.tag}`
    });

    activeCalls.set(channel.id, {
        ownerId: member.id,
        isPrivate,
        guildId: guild.id,
        emptySince: Date.now()
    });
    callAllowed.set(channel.id, new Set([member.id]));

    const controlMsg = await channel.send(buildCallControlMessage(channel.id, member.id, isPrivate)).catch(() => null);
    if (controlMsg) {
        callInfoMessages.set(channel.id, controlMsg.id);
    }

    const payload = buildCallInfoMessage(channel.id, member.id, isPrivate);
    await interaction.editReply(payload).catch(() => {});

    await sendLog(guild, CONFIG.CALL_LOG_ID, {
        title: isPrivate ? '🔒 Privé call gemaakt' : '🔊 Openbare call gemaakt',
        description: `**Eigenaar:** ${member.user.tag} (\`${member.id}\`)\n**Kanaal:** <#${channel.id}>`,
        color: PURPLE.main,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
}

// --- BOT ONLINE ---
client.once('clientReady', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);
    await initGist();

    const guild = client.guilds.cache.first();
    if (guild) {
        updateStatus(guild);
        await setupCallCategory(guild);
    }

    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('clear')
                .setDescription('Verwijder een aantal berichten in dit kanaal')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Aantal berichten (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder()
                .setName('antinuke')
                .setDescription('Zet het anti-nuke systeem aan of uit')
                .addStringOption(opt =>
                    opt.setName('actie')
                        .setDescription('enable of disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'enable', value: 'enable' },
                            { name: 'disable', value: 'disable' }
                        )
                ),
            new SlashCommandBuilder()
                .setName('refresh')
                .setDescription('Werk de ledenlijst handmatig bij')
        ].map(c => c.toJSON());
        await client.application.commands.set(commands);
        console.log('Slash commands geregistreerd');
    } catch (err) {
        console.error('Fout bij registreren commands:', err);
    }

    try {
        const verifyChannel = await client.channels.fetch(CONFIG.VERIFY_CHANNEL_ID);
        if (verifyChannel) {
            await cleanupOldPanels(verifyChannel, 'Welkom bij Familie Zoet');
            const verifyCount = await countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID, true);
            const embed = new EmbedBuilder()
                .setTitle('Familie Zoet Verification')
                .setDescription('Welkom bij Familie Zoet!\n\nKlik op de knop hieronder om jezelf te verifiëren en toegang te krijgen tot de server.')
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder()
                .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                .setLabel(`${verifyCount}`)
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder().addComponents(button);
            await verifyChannel.send({ embeds: [embed], components: [row] });
            console.log(`Verify panel gestuurd (${verifyCount} geverifieerd)`);
        }
    } catch (err) {
        console.error('Fout bij verify panel:', err);
    }

    await new Promise(r => setTimeout(r, 5000));

    try {
        const snapChannel = await client.channels.fetch(CONFIG.SNAP_CHANNEL_ID);
        if (snapChannel) {
            await cleanupOldPanels(snapChannel, 'Snapchat Ping');
            const snapCount = await countRoleMembers(snapChannel.guild, CONFIG.SNAP_ROLE_ID, false);
            const embed = new EmbedBuilder()
                .setTitle('Snapchat Ping')
                .setDescription(
                    'Klik op de knop hieronder om de **Snapchat Ping** rol te krijgen.\n\n' +
                    'Je krijgt dan een ping wanneer er snaps gedropped worden.'
                )
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder()
                .setCustomId(CONFIG.SNAP_BUTTON_ID)
                .setLabel(`${snapCount}`)
                .setEmoji('👻')
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(button);
            await snapChannel.send({ embeds: [embed], components: [row] });
            console.log(`Snapchat panel gestuurd (${snapCount} met rol)`);
        }
    } catch (err) {
        console.error('Fout bij snapchat panel:', err);
    }

    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) {
            await clearChannel(honeyChannel);
            console.log('Honeypot kanaal leeggemaakt');
            await honeyChannel.send({ embeds: [buildHoneypotEmbed()] });
            console.log('Honeypot waarschuwing gestuurd');
        }
    } catch (err) {
        console.error('Fout bij honeypot panel:', err);
    }

    try {
        const callChannel = await client.channels.fetch(CONFIG.CALL_CHANNEL_ID);
        if (callChannel) {
            await cleanupOldPanels(callChannel, 'Maak een call aan');
            await callChannel.send(buildCallPanel());
            console.log('Call panel gestuurd');
        }
    } catch (err) {
        console.error('Fout bij call panel:', err);
    }

    await updateMembersList();

    setInterval(checkEmptyCalls, CONFIG.EMPTY_CALL_CHECK_MS);
    console.log(`Lege-call checker gestart (elke ${CONFIG.EMPTY_CALL_CHECK_MS / 60000} min, timeout ${CONFIG.EMPTY_CALL_TIMEOUT_MS / 60000} min)`);
});

// --- WELCOME + DM + JOIN LOG ---
client.on('guildMemberAdd', async (member) => {
    updateStatus(member.guild);
    scheduleMembersUpdate();

    joinTimes[member.id] = Date.now();
    await saveToGist();

    try {
        const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (channel) {
            const memberCount = member.guild.memberCount;
            const embed = new EmbedBuilder()
                .setDescription(
                    `Welkom ${member}!\n` +
                    `Je bent lid **${memberCount}** van **${CONFIG.SERVER_NAME}**.`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setColor(PURPLE.main)
                .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (err) {
        console.error('Fout bij welcome:', err);
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle(`Welkom bij ${CONFIG.SERVER_NAME}!`)
            .setDescription(
                `Hey ${member.user.username}!\n\n` +
                `Leuk dat je er bent. Verifieer jezelf in <#${CONFIG.VERIFY_CHANNEL_ID}> om toegang te krijgen tot de server.\n\n` +
                `Als je vragen hebt, kan je altijd een admin aanspreken.`
            )
            .setColor(PURPLE.main)
            .setThumbnail(CONFIG.LOGO_URL);
        await member.send({ embeds: [dmEmbed] });
    } catch (err) {}

    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📥 Lid gejoint',
        description:
            `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n` +
            `**Account aangemaakt:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
            `**Leden nu:** ${member.guild.memberCount}`,
        color: PURPLE.main,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
});

client.on('guildMemberRemove', async (member) => {
    updateStatus(member.guild);
    scheduleMembersUpdate();

    const joinedAt = joinTimes[member.id];
    let durationText = 'Onbekend';
    if (joinedAt) {
        durationText = formatDuration(Date.now() - joinedAt);
        delete joinTimes[member.id];
        await saveToGist();
    }

    const hadVerify = member.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const hadSnap = member.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📤 Lid verlaten',
        description:
            `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n` +
            `**In server voor:** ${durationText}\n` +
            `**Had verify:** ${hadVerify ? 'ja' : 'nee'}\n` +
            `**Had snapchat ping:** ${hadSnap ? 'ja' : 'nee'}`,
        color: PURPLE.dark,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });

    if (hadVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(member.guild, CONFIG.VERIFY_LOG_ID, {
            title: '❌ Verify verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de verify rol.`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (hadSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(member.guild, CONFIG.SNAP_LOG_ID, {
            title: '❌ Snapchat Ping verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de Snapchat Ping rol.`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (!antinukeData.enabled) return;
    const executor = await findExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    if (!executor) return;
    if (executor.id === client.user.id) return;
    if (CONFIG.ANTINUKE_ALLOWED_USERS.includes(executor.id)) return;

    if (checkThreshold(executor.id, 'kickAdd')) {
        await punishUser(member.guild, executor.id, `Te veel kicks binnen ${CONFIG.ANTINUKE_WINDOW_MS / 1000}s`);
    }
});

// --- ROLLEN + DM NA VERIFY ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldVerify = oldMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const newVerify = newMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const oldSnap = oldMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    const newSnap = newMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    let rankChanged = false;
    for (const id of WATCHED_ROLE_IDS) {
        if (oldMember.roles.cache.has(id) !== newMember.roles.cache.has(id)) {
            rankChanged = true;
            break;
        }
    }
    if (rankChanged) scheduleMembersUpdate();

    if (!oldVerify && newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.VERIFY_LOG_ID, {
            title: '✅ Verify gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de verify rol gekregen.`,
            color: PURPLE.main,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle(`Je bent geverifieerd!`)
                .setDescription(
                    `Bedankt voor het verifiëren bij **${CONFIG.SERVER_NAME}**!\n\n` +
                    `Je hebt nu toegang tot de server. Veel plezier! 🎉`
                )
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            await newMember.send({ embeds: [dmEmbed] });
        } catch (err) {}
    } else if (oldVerify && !newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.VERIFY_LOG_ID, {
            title: '❌ Verify verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) is niet meer geverifieerd.`,
            color: PURPLE.dark,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (!oldSnap && newSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.SNAP_LOG_ID, {
            title: '👻 Snapchat Ping gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol gekregen.`,
            color: PURPLE.main,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } else if (oldSnap && !newSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.SNAP_LOG_ID, {
            title: '❌ Snapchat Ping verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol niet meer.`,
            color: PURPLE.dark,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }
});

// --- ANTI-NUKE EVENTS ---
client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    await handleNukeAction(channel.guild, 'channelDelete', channel.id);
});

client.on('roleDelete', async (role) => {
    if (!role.guild) return;
    await handleNukeAction(role.guild, 'roleDelete', role.id);
});

client.on('guildBanAdd', async (ban) => {
    await handleNukeAction(ban.guild, 'banAdd', ban.user.id);
});

// --- HONEYPOT ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CONFIG.HONEYPOT_CHANNEL_ID) return;

    await message.delete().catch(() => {});

    const member = message.member;
    if (!member) return;

    try {
        await member.kick('Honeypot kanaal - bericht geplaatst');
        kickData.total += 1;
        await saveToGist();
        await refreshHoneypotEmbed(message.channel);

        const embed = new EmbedBuilder()
            .setTitle('🍯 Honeypot geactiveerd')
            .setDescription(
                `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                `**Actie:** KICK\n` +
                `**Totaal aantal kicks:** ${kickData.total}`
            )
            .setColor(PURPLE.dark)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij honeypot kick:', err);
    }
});

// --- CALL: voice state ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    const channelId = oldState.channelId || newState.channelId;
    if (!channelId) return;
    if (!activeCalls.has(channelId)) return;

    const call = activeCalls.get(channelId);
    if (!call) return;

    const channel = newState.guild.channels.cache.get(channelId) || oldState.guild.channels.cache.get(channelId);
    if (!channel) return;

    if (oldState.channelId === channelId && newState.channelId !== channelId && oldState.id === call.ownerId) {
        try {
            await channel.delete('Call eigenaar heeft de call verlaten').catch(() => {});
        } catch (err) {
            console.error('Fout bij verwijderen call:', err);
        }
        activeCalls.delete(channelId);
        callAllowed.delete(channelId);
        callInfoMessages.delete(channelId);
        return;
    }

    const members = channel.members.filter(m => !m.user.bot);
    if (members.size === 0) {
        if (!call.emptySince) call.emptySince = Date.now();
    } else {
        call.emptySince = null;
    }
    activeCalls.set(channelId, call);
});

async function checkEmptyCalls() {
    const now = Date.now();
    for (const [channelId, call] of activeCalls.entries()) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                activeCalls.delete(channelId);
                callAllowed.delete(channelId);
                callInfoMessages.delete(channelId);
                continue;
            }

            const members = channel.members.filter(m => !m.user.bot);
            if (members.size > 0) {
                call.emptySince = null;
                activeCalls.set(channelId, call);
                continue;
            }

            if (!call.emptySince) {
                call.emptySince = now;
                activeCalls.set(channelId, call);
                continue;
            }

            if (now - call.emptySince >= CONFIG.EMPTY_CALL_TIMEOUT_MS) {
                await channel.delete('Call was leeg voor 1 uur').catch(() => {});
                activeCalls.delete(channelId);
                callAllowed.delete(channelId);
                callInfoMessages.delete(channelId);
                console.log(`Lege call verwijderd: ${channelId}`);
            }
        } catch (err) {
            console.error('Fout bij check lege call:', err);
        }
    }
}

// --- INTERACTIONS ---
client.on('interactionCreate', async (interaction) => {

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te doen.', flags: MessageFlags.Ephemeral });
            }
            try {
                await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ content: `${amount} berichten verwijderd.`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                console.error('Fout bij clear:', err);
                await interaction.reply({ content: 'Kon de berichten niet verwijderen.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'antinuke') {
            if (!CONFIG.ANTINUKE_ALLOWED_USERS.includes(interaction.user.id)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            const actie = interaction.options.getString('actie');
            if (actie === 'enable') {
                if (antinukeData.enabled) {
                    return interaction.reply({ content: 'Anti-nuke is al ingeschakeld.', flags: MessageFlags.Ephemeral });
                }
                antinukeData.enabled = true;
                await saveToGist();
                await sendLog(interaction.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
                    title: '🛡️ Anti-nuke ingeschakeld',
                    description: `Ingeschakeld door ${interaction.user.tag}.`,
                    color: PURPLE.main
                });
                return interaction.reply({ content: 'Anti-nuke is nu **ingeschakeld**.', flags: MessageFlags.Ephemeral });
            }
            if (actie === 'disable') {
                if (!antinukeData.enabled) {
                    return interaction.reply({ content: 'Anti-nuke is al uitgeschakeld.', flags: MessageFlags.Ephemeral });
                }
                antinukeData.enabled = false;
                await saveToGist();
                await sendLog(interaction.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
                    title: '🛡️ Anti-nuke uitgeschakeld',
                    description: `Uitgeschakeld door ${interaction.user.tag}.`,
                    color: PURPLE.dark
                });
                return interaction.reply({ content: 'Anti-nuke is nu **uitgeschakeld**.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'refresh') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                await updateMembersList();
                await interaction.editReply({ content: '✅ Ledenlijst bijgewerkt.' });
            } catch (err) {
                console.error('Fout bij refresh:', err);
                await interaction.editReply({ content: '❌ Kon ledenlijst niet bijwerken.' });
            }
        }
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'call_modal_public' || interaction.customId === 'call_modal_private') {
            const isPrivate = interaction.customId === 'call_modal_private';
            const name = interaction.fields.getTextInputValue('call_name');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

            try {
                await createCall(interaction, name, isPrivate);
            } catch (err) {
                console.error('Fout bij maken call:', err);
                try {
                    await interaction.editReply({ content: 'Kon de call niet aanmaken.', embeds: [], components: [] });
                } catch (e) {}
            }
        }
        return;
    }

    if (interaction.isUserSelectMenu()) {
        if (interaction.customId.startsWith('call_allow_select_')) {
            const channelId = interaction.customId.replace('call_allow_select_', '');
            const call = activeCalls.get(channelId);
            if (!call) {
                return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== call.ownerId) {
                return interaction.reply({ content: 'Alleen de eigenaar kan mensen toelaten.', flags: MessageFlags.Ephemeral });
            }

            const userId = interaction.values[0];
            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.edit(userId, { ViewChannel: true, Connect: true });
                if (!callAllowed.has(channelId)) callAllowed.set(channelId, new Set());
                callAllowed.get(channelId).add(userId);

                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);

                await interaction.reply({ content: `<@${userId}> is toegelaten tot de call.`, flags: MessageFlags.Ephemeral });

                try {
                    const payload = buildCallInfoMessage(channelId, call.ownerId, call.isPrivate);
                    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
                } catch (e) {}

                await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
                    title: '✅ Toegelaten tot call',
                    description: `**Eigenaar:** <@${call.ownerId}>\n**Toegelaten:** <@${userId}>\n**Call:** <#${channelId}>`,
                    color: PURPLE.main
                });
            } catch (err) {
                console.error('Fout bij toelaten user:', err);
                await interaction.reply({ content: 'Kon de gebruiker niet toelaten.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('call_remove_select_')) {
            const channelId = interaction.customId.replace('call_remove_select_', '');
            const call = activeCalls.get(channelId);
            if (!call) {
                return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== call.ownerId) {
                return interaction.reply({ content: 'Alleen de eigenaar kan mensen verwijderen.', flags: MessageFlags.Ephemeral });
            }

            const userId = interaction.values[0];
            if (userId === call.ownerId) {
                return interaction.reply({ content: 'Je kan jezelf niet verwijderen.', flags: MessageFlags.Ephemeral });
            }

            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.delete(userId).catch(() => {});
                const allowed = callAllowed.get(channelId);
                if (allowed) allowed.delete(userId);

                const voiceMember = channel.members.get(userId);
                if (voiceMember) {
                    await voiceMember.voice.disconnect('Verwijderd uit call door eigenaar').catch(() => {});
                }

                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);

                await interaction.reply({ content: `<@${userId}> is verwijderd uit de call.`, flags: MessageFlags.Ephemeral });

                try {
                    const payload = buildCallInfoMessage(channelId, call.ownerId, call.isPrivate);
                    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
                } catch (e) {}

                await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
                    title: '➖ Verwijderd uit call',
                    description: `**Eigenaar:** <@${call.ownerId}>\n**Verwijderd:** <@${userId}>\n**Call:** <#${channelId}>`,
                    color: PURPLE.dark
                });
            } catch (err) {
                console.error('Fout bij verwijderen user uit call:', err);
                await interaction.reply({ content: 'Kon de gebruiker niet verwijderen.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
        return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === 'call_open_public' || interaction.customId === 'call_open_private') {
        const isPrivate = interaction.customId === 'call_open_private';
        const modal = new ModalBuilder()
            .setCustomId(isPrivate ? 'call_modal_private' : 'call_modal_public')
            .setTitle(isPrivate ? 'Privé call maken' : 'Openbare call maken');
        const input = new TextInputBuilder()
            .setCustomId('call_name')
            .setLabel('Naam van de call')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setMinLength(1)
            .setRequired(true)
            .setPlaceholder('bijv. chillen');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (interaction.customId === 'call_office_panel') {
        const myCalls = [];
        for (const [channelId, call] of activeCalls.entries()) {
            if (call.ownerId === interaction.user.id) {
                myCalls.push({ channelId, ...call });
            }
        }

        if (myCalls.length === 0) {
            return interaction.reply({
                content: 'Je hebt momenteel geen actieve call. Maak eerst een call aan met **Openbaar** of **Privé**.',
                flags: MessageFlags.Ephemeral
            });
        }

        for (let i = 0; i < myCalls.length; i++) {
            const c = myCalls[i];
            const payload = buildCallInfoMessage(c.channelId, c.ownerId, c.isPrivate);
            if (i === 0) {
                await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            }
        }
        return;
    }

    if (interaction.customId.startsWith('call_allow_') && !interaction.customId.startsWith('call_allow_select_')) {
        const channelId = interaction.customId.replace('call_allow_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan mensen toelaten.', flags: MessageFlags.Ephemeral });
        }

        const selectRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`call_allow_select_${channelId}`)
                .setPlaceholder('Kies een lid om toe te laten')
                .setMinValues(1)
                .setMaxValues(1)
        );
        return interaction.reply({ content: 'Kies een lid om toe te laten:', components: [selectRow], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('call_remove_') && !interaction.customId.startsWith('call_remove_select_')) {
        const channelId = interaction.customId.replace('call_remove_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan mensen verwijderen.', flags: MessageFlags.Ephemeral });
        }

        const selectRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`call_remove_select_${channelId}`)
                .setPlaceholder('Kies een lid om te verwijderen')
                .setMinValues(1)
                .setMaxValues(1)
        );
        return interaction.reply({ content: 'Kies een lid om te verwijderen:', components: [selectRow], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('call_hide_')) {
        try {
            await interaction.update({ content: '🙈 Bericht verborgen. Je kan de knoppen in het call-kanaal gebruiken, of via **Kantoor** opnieuw openen.', embeds: [], components: [] });
        } catch (err) {}
        return;
    }

    if (interaction.customId.startsWith('call_delete_')) {
        const channelId = interaction.customId.replace('call_delete_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan de call verwijderen.', flags: MessageFlags.Ephemeral });
        }

        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) await channel.delete('Eigenaar heeft de call verwijderd').catch(() => {});
        } catch (err) {
            console.error('Fout bij verwijderen call:', err);
        }
        activeCalls.delete(channelId);
        callAllowed.delete(channelId);
        callInfoMessages.delete(channelId);

        try {
            await interaction.update({ content: '🗑️ Call verwijderd.', embeds: [], components: [] });
        } catch (err) {}

        await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
            title: '🗑️ Call verwijderd',
            description: `**Eigenaar:** <@${call.ownerId}>\n**Kanaal:** <#${channelId}>`,
            color: PURPLE.dark
        });
        return;
    }

    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De verify rol is niet gevonden.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) {
                return interaction.reply({ content: 'Je bent al geverifieerd!', flags: MessageFlags.Ephemeral });
            }
            await interaction.member.roles.add(role);
            const newCount = await countRoleMembers(interaction.guild, CONFIG.VERIFY_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            await interaction.reply({ content: 'Je bent geverifieerd! Welkom bij Familie Zoet.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij verify:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
        return;
    }

    if (interaction.customId === CONFIG.SNAP_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.SNAP_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De Snapchat Ping rol is niet gevonden.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.member.roles.cache.has(CONFIG.SNAP_ROLE_ID)) {
                return interaction.reply({ content: 'Je hebt de Snapchat Ping rol al!', flags: MessageFlags.Ephemeral });
            }
            await interaction.member.roles.add(role);
            const newCount = await countRoleMembers(interaction.guild, CONFIG.SNAP_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.SNAP_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('👻')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            await interaction.reply({ content: 'Je hebt de Snapchat Ping rol gekregen.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij snapchat:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
});

client.on('error', (err) => {
    console.error('Client error:', err);
});

// --- LOGIN ---
client.login(CONFIG.TOKEN);
