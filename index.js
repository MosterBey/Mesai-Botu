require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const moment = require("moment-timezone");
const db = require("./db");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, () => console.log(`Bot hazır: ${client.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { guildId, user } = interaction;

  try {
    // ===== SLASH =====
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      // Mesai kanalı
      if (commandName === "set-mesai-channel") {
        const channel = interaction.options.getChannel("kanal");
        const settings = db.getSettings(guildId);
        settings.mesaiChannel = channel.id;
        db.setSettings(guildId, settings);
        return interaction.reply({ content: `✅ Mesai kanalı ayarlandı: ${channel}`, ephemeral: true });
      }

      // Log kanalı
      if (commandName === "set-log-channel") {
        const channel = interaction.options.getChannel("kanal");
        const settings = db.getSettings(guildId);
        settings.logChannel = channel.id;
        db.setSettings(guildId, settings);
        return interaction.reply({ content: `✅ Log kanalı ayarlandı: ${channel}`, ephemeral: true });
      }

      // Mesai gönder (butonlu)
      if (commandName === "mesai-gonder") {
        const settings = db.getSettings(guildId);
        if (!settings.mesaiChannel) return interaction.reply({ content: "⚠️ Mesai kanalı ayarlanmamış!", ephemeral: true });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("mesai_gir").setLabel("🟢 Mesai Gir").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mesai_cik").setLabel("🔴 Mesai Çık").setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setTitle("⏰ Mesai Takip")
          .setDescription("Mesai'ye Başlamak için **🟢Mesai Gir** butonuna, Mesai'yi Bitirmek için **🔴Mesai Çık** butonuna tıklayın.")
          .setColor("Blue");

        const channel = await client.channels.fetch(settings.mesaiChannel);
        await channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({ content: "📢 Mesai mesajı gönderildi!", ephemeral: true });
      }

     // Mesai kontrol
if (commandName === "mesai-kontrol") {
  const target = interaction.options.getUser("kullanici") || user;
  const tip = interaction.options.getString("tip") || "toplam";
  let shifts = db.getShifts(guildId, target.id);

  if (tip === "bugun") {
    const today = new Date();
    shifts = shifts.filter(s => new Date(s.start).toDateString() === today.toDateString());
  }

  if (!shifts.length) return interaction.reply({ content: "⚠️ Hiç mesai kaydı yok.", ephemeral: true });

  let totalMs = 0;
  shifts.forEach(s => { const end = s.end ? new Date(s.end) : new Date(); totalMs += end - new Date(s.start); });

  const hours = Math.floor(totalMs / 1000 / 60 / 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  const embed = new EmbedBuilder()
    .setTitle(`⏱ Mesai Kontrol - ${target.tag}`)
    .setDescription(`Toplam süre: **${hours} saat ${minutes} dakika ${seconds} saniye**`)
    .setColor("Blue");

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// Leaderboard
if (commandName === "mesai-leaderboard") {
  const leaderboard = db.getLeaderboard(guildId).slice(0, 10);
  if (!leaderboard.length) return interaction.reply({ content: "⚠️ Mesai kaydı yok.", ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle("🏆 Mesai Leaderboard")
    .setColor("Gold")
    .setDescription(
      leaderboard.map((l, i) => {
        const ms = l.ms;
        const h = Math.floor(ms / 1000 / 60 / 60);
        const m = Math.floor((ms / 1000 / 60) % 60);
        const s = Math.floor((ms / 1000) % 60);
        return `${i + 1}. <@${l.userId}> - **${h} saat ${m} dakika ${s} saniye**`;
      }).join("\n")
    );

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
    }

    // ===== BUTTON =====
    if (interaction.isButton()) {
      const { customId } = interaction;
      const settings = db.getSettings(guildId);
      if (!settings.logChannel) return interaction.reply({ content: "⚠️ Log kanalı ayarlanmamış!", ephemeral: true });

      const logChannel = await client.channels.fetch(settings.logChannel);

     // Mesai gir
if (customId === "mesai_gir") {
  const aktif = db.getActiveShift(guildId, user.id);
  if (aktif) return interaction.reply({ content: "⚠️ Zaten mesaiye girmişsin!", ephemeral: true });

  const now = new Date().toISOString();
  db.createShift(guildId, user.id, now);

  const logEmbed = new EmbedBuilder()
    .setTitle("🟢 Mesai Girişi")
    .setDescription(`${user} mesaiye **${moment(now).tz("Europe/Istanbul").format("HH:mm:ss")}** saatinde giriş yaptı.`)
    .setColor("Green")
    .setTimestamp();
  await logChannel.send({ embeds: [logEmbed] });

  return interaction.reply({ embeds: [logEmbed], ephemeral: true });
}

// Mesai çık
if (customId === "mesai_cik") {
  const aktif = db.getActiveShift(guildId, user.id);
  if (!aktif) return interaction.reply({ content: "⚠️ Mesaiye girmemişsin!", ephemeral: true });

  const end = new Date().toISOString();
  db.endShift(guildId, user.id, end);

  const start = moment(aktif.start);
  const durationMs = new Date(end) - new Date(aktif.start);
  const diffH = Math.floor(durationMs / (1000 * 60 * 60));
  const diffM = Math.floor((durationMs / (1000 * 60)) % 60);
  const diffS = Math.floor((durationMs / 1000) % 60); // saniye ekledik

  const logEmbed = new EmbedBuilder()
    .setTitle("🔴 Mesai Çıkışı")
    .setDescription(`${user} mesaiyi **${moment(end).tz("Europe/Istanbul").format("HH:mm:ss")}** saatinde bitirdi.\n⏳ Toplam Süre: **${diffH} saat ${diffM} dakika ${diffS} saniye**`)
    .setColor("Red")
    .setTimestamp();
  await logChannel.send({ embeds: [logEmbed] });

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ Mesaiden Çıktın")
        .setDescription(`Bitiş saati: **${moment(end).tz("Europe/Istanbul").format("HH:mm:ss")}**\nToplam süre: **${diffH} saat ${diffM} dakika ${diffS} saniye**`)
        .setColor("Red"),
    ],
    ephemeral: true,
  });
}
    }
  } catch (err) {
    console.error("Interaction hata:", err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "❌ Bir hata oluştu.", ephemeral: true });
    } else {
      await interaction.reply({ content: "❌ Bir hata oluştu.", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
