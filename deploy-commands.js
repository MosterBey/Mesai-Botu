require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'set-mesai-channel',
    description: 'Mesai butonlarının gönderileceği kanalı ayarla',
    options: [{ name: 'kanal', type: 7, description: 'Mesai kanalı', required: true }]
  },
  {
    name: 'set-log-channel',
    description: 'Mesai loglarının gideceği kanalı ayarla',
    options: [{ name: 'kanal', type: 7, description: 'Log kanalı', required: true }]
  },
  {
    name: 'mesai-gonder',
    description: 'Mesai butonlu mesajını ayarlı mesai kanalına gönderir'
  },
  {
    name: 'mesai-kontrol',
    description: 'Kullanıcının mesai süresini gösterir',
    options: [
      { name: 'kullanici', type: 6, description: 'Mesai süresini görmek istediğiniz kullanıcı', required: false },
      { name: 'tip', type: 3, description: 'Toplam mı yoksa bugünkü mü?', required: false, choices: [
        { name: 'toplam', value: 'toplam' }, { name: 'bugun', value: 'bugun' }
      ]}
    ]
  },
  {
    name: 'mesai-leaderboard',
    description: 'En çok mesai yapanları gösterir'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Slash komutları deploy ediliyor...');
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('Komutlar guild scope ile yüklendi.');
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('Komutlar global olarak yüklendi.');
    }
  } catch (err) {
    console.error(err);
  }
})();
