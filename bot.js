import http from 'http';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  AttachmentBuilder,
} from "discord.js";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
});
server.listen(3000, () => {
  console.log('✅ Web server running on port 3000');
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable.");
  process.exit(1);
}

// ===== Channel Settings (Kurokai IDs) =====
const WELCOME_CHANNEL_ID = "1565748965385830420";
const GANG_LIST_CHANNEL_ID = "1565748999833526412";
const COMMANDS_INFO_CHANNEL_ID = "1565751983854456904";
const WARN_CHANNEL_ID = "1565749002522075136";
const PROMO_CHANNEL_ID = "1565749001439940628";
const DEMOTE_CHANNEL_ID = "1565749001439940628";
const ALL_LOGS_CHANNEL_ID = "1565749004795515072";
const AFWEZIGHEID_CHANNEL_ID = "1565748997086515291";
const AANGENOMEN_CHANNEL_ID = "1565752657761665218";
const ONTSLAGEN_CHANNEL_ID = "1565752732659228733";

// ===== Ticket settings =====
const TICKET_PANEL_CHANNEL_ID = "1565748970750353479";
const TICKET_SUPPORT_ROLE_ID = "1565752859746898112";
const TICKET_TRANSCRIPT_CHANNEL_ID = "1565748972012839083";

const TICKET_CATEGORIES = {
  application: {
    name: "Sollicitatie",
    prefix: "sollicitatie",
    categoryId: "1565753071315845371",
    emoji: "📝",
    color: 0xf39c12,
    isApplication: true,
  },
  partner: {
    name: "Partner",
    prefix: "partner",
    categoryId: "1565753161342525460",
    emoji: "🤝",
    color: 0xe91e63,
  },
};

// ===== EXACTE SOLLICITATIE VRAGEN (4 KOPJES) =====
const APPLICATION_PARTS = {
  part1: {
    title: "01 — Persoonlijke gegevens",
    emoji: "👤",
    questions: [
      { id: "naam", label: "Naam", placeholder: "Vul je naam in", style: TextInputStyle.Short, max: 100 },
      { id: "leeftijd", label: "Leeftijd", placeholder: "Vul je leeftijd in", style: TextInputStyle.Short, max: 10 },
      { id: "discord", label: "Discord", placeholder: "Vul je Discord tag in", style: TextInputStyle.Short, max: 100 },
      { id: "ic_naam", label: "IC-naam", placeholder: "Vul je IC-naam in", style: TextInputStyle.Short, max: 100 },
      { id: "ic_leeftijd", label: "IC-leeftijd", placeholder: "Vul je IC-leeftijd in", style: TextInputStyle.Short, max: 10 }
    ]
  },
  part2: {
    title: "02 — Ervaring",
    emoji: "🎮",
    questions: [
      { id: "rp_ervaring", label: "Ervaring met Serious RP", placeholder: "Vertel over je ervaring", style: TextInputStyle.Paragraph, max: 500 },
      { id: "gang_ervaring", label: "Eerdere gangervaring", placeholder: "Vertel over je ervaring", style: TextInputStyle.Paragraph, max: 500 },
      { id: "activiteit", label: "Activiteit per dag", placeholder: "Bijv. 4 uur", style: TextInputStyle.Short, max: 50 }
    ]
  },
  part3: {
    title: "03 — Character",
    emoji: "💼",
    questions: [
      { id: "waarde", label: "Totale waarde van je character", placeholder: "Bijv. €500.000", style: TextInputStyle.Short, max: 50 },
      { id: "waarom", label: "Waarom wil je bij Kurokai?", placeholder: "Leg uit...", style: TextInputStyle.Paragraph, max: 500 },
      { id: "toevoegen", label: "Wat kun jij toevoegen aan Kurokai?", placeholder: "Leg uit...", style: TextInputStyle.Paragraph, max: 500 },
      { id: "waarom_jou", label: "Waarom moeten wij jou aannemen?", placeholder: "Overtuig ons...", style: TextInputStyle.Paragraph, max: 500 }
    ]
  },
  part4: {
    title: "04 — Akkoord",
    emoji: "📜",
    questions: [
      { id: "serverregels", label: "Ben je bekend met de serverregels?", placeholder: "Ja of Nee", style: TextInputStyle.Short, max: 10 },
      { id: "regels_hiërarchie", label: "Bereid aan regels/hiërarchie te houden?", placeholder: "Ja of Nee", style: TextInputStyle.Short, max: 10 }
    ]
  }
};

const SUPPORT_TICKET_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis,
];

// ===== Role settings =====
const ADMIN_ROLE_ID = "1565753233022910575";
const MOD_ROLE_ID = "1565753233022910575";
const LID_ROLE_ID = "1565753339256242316";
const LID_NAME_PREFIX = "[KRK] ";
const PLACEHOLDER_IMAGE = "https://cdn.discordapp.com/attachments/1565740832060080190/1565751274790461440/e6d3e4cd-e858-4868-ab85-19cb06084de4.png?ex=6ae60b02&is=6ae4b982&hm=1c8c9aad8934de0edcfcfd0e07bebe89e24c687eea906cc97696b00774856dd9&";

const FOOTER_TEXT = "Kurokai • Future Roleplay";

const ranks = [
  { name: "Founder", roleId: "1565748939821547652", level: 10, emoji: "👑" },
  { name: "Boss", roleId: "1565750203259031593", level: 9, emoji: "🖤" },
  { name: "Rechterhand", roleId: "1565748940702220338", level: 8, emoji: "🤝" },
  { name: "Underboss", roleId: "1565748941671112875", level: 7, emoji: "🎩" },
  { name: "Head Hitman", roleId: "1565748942900035685", level: 6, emoji: "🎯" },
  { name: "Hitman", roleId: "1565750620298936391", level: 5, emoji: "⚔️" },
  { name: "Jr Hitman", roleId: "1565750676955340861", level: 4, emoji: "🗡️" },
  { name: "Full Member", roleId: "1565748945643249734", level: 3, emoji: "💎" },
  { name: "Member", roleId: "1565748946561798155", level: 2, emoji: "🔗" },
  { name: "Hang Around", roleId: "1565748943894225100", level: 1, emoji: "🚬" },
];

const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);

// ===== Helpers =====
function getNumber(name) {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

function displayName(member) { return member.displayName; }
function memberLink(id, _name) { return `<@!${id}>`; }

function getCurrentDate() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getFullDate() {
  return new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function hasAdminRole(member) { return member.roles.cache.has(ADMIN_ROLE_ID); }
function hasModRole(member) { return member.roles.cache.has(MOD_ROLE_ID) || member.roles.cache.has(ADMIN_ROLE_ID); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
});

let messageId = null;
const activeApplications = new Map();

// ===== STATUS SYSTEEM =====
let statusToggle = false;

async function updateBotStatus() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    if (statusToggle) {
      client.user.setActivity(`${guild.memberCount} Discord Members`, { type: 3 }); 
    } else {
      let uniqueMembers = new Set();
      for (const rank of ranks) {
        const role = guild.roles.cache.get(rank.roleId);
        if (role) {
          role.members.forEach(m => uniqueMembers.add(m.id));
        }
      }
      client.user.setActivity(`${uniqueMembers.size} Gang Members`, { type: 3 }); 
    }
    statusToggle = !statusToggle;
  } catch (error) {
    console.error("Failed to update status:", error);
  }
}

function startStatusInterval() {
  updateBotStatus();
  setInterval(updateBotStatus, 10000); 
}

// ===== OVERIGE FUNCTIES =====
async function buildEmbed() {
  const guild = client.guilds.cache.first();
  if (!guild) return null;
  let body = "";
  const uniqueMembers = new Set();
  for (const rank of sortedRanks) {
    const role = guild.roles.cache.get(rank.roleId);
    if (!role) {
      body += `**${rank.emoji} ${rank.name} (0)**\n➤ Rol niet gevonden\n\n`;
      continue;
    }
    const members = [...role.members.values()].map((m) => ({ id: m.id, name: displayName(m) })).sort((a, b) => getNumber(a.name) - getNumber(b.name));
    for (const m of members) uniqueMembers.add(m.id);
    body += `**${rank.emoji} ${rank.name} (${members.length})**\n`;
    if (members.length > 0) for (const m of members) body += `➤ ${memberLink(m.id, m.name)}\n`;
    else body += `➤ Geen leden\n`;
    body += `\n`;
  }
  const description = `**Totaal: ${uniqueMembers.size} leden**\n\n${body}`;
  return new EmbedBuilder().setTitle("🏴 Kurokai Ledenlijst").setColor(0x2b2b2b).setDescription(description.slice(0, 4096)).setFooter({ text: FOOTER_TEXT }).setTimestamp();
}

async function updateList() {
  const embed = await buildEmbed();
  if (!embed) throw new Error("Bot zit niet in een server.");
  const channel = await client.channels.fetch(GANG_LIST_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) throw new Error(`Channel ${GANG_LIST_CHANNEL_ID} is geen tekstkanaal.`);
  const payload = { embeds: [embed], allowedMentions: { parse: [] } };
  if (messageId) {
    try {
      const existing = await channel.messages.fetch(messageId);
      await existing.edit(payload);
      return;
    } catch (err) { messageId = null; }
  }
  const sent = await channel.send(payload);
  messageId = sent.id;
}

async function sendWelcomeMessage(member) {
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    const userAvatar = member.user?.avatarURL() || member.displayAvatarURL() || PLACEHOLDER_IMAGE;
    const embed = new EmbedBuilder()
      .setTitle("👋 WELKOM!")
      .setDescription(`Welkom ${memberLink(member.id, member.displayName)} in de **Kurokai** Discord server!`)
      .addFields(
        { name: "📊 Totaal leden", value: `${member.guild.memberCount}`, inline: true },
        { name: "📅 Datum", value: getCurrentDate(), inline: true }
      )
      .setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
    await channel.send({ embeds: [embed] });
  } catch (error) { console.error("Welcome error:", error); }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  startStatusInterval();
  updateList().catch(console.error);
});

client.login(TOKEN);
