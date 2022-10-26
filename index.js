require('dotenv').config()

const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/Client');
const config = require('./config.json');
const {Player} = require('discord-player');

const { ActivityType } = require('discord.js');

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

console.log(client.commands);

const player = new Player(client);

player.on('error', (queue, error) => {
  console.log(`[${queue.guild.name}] Erro emitido da fila: ${error.message}`);
});

player.on('connectionError', (queue, error) => {
  console.log(`[${queue.guild.name}] Erro emitido da conexão: ${error.message}`);
});

player.on('trackStart', (queue, track) => {
  queue.metadata.send(`▶ | Começou a jogar: **${track.title}** em **${queue.connection.channel.name}**!`);
});

player.on('trackAdd', (queue, track) => {
  queue.metadata.send(`🎶 |Acompanha **${track.title}** enfileiradas!`);
});

player.on('botDisconnect', queue => {
  queue.metadata.send('❌ | Eu fui desconectado manualmente do canal de voz, limpando a fila!');
});

player.on('channelEmpty', queue => {
  queue.metadata.send('❌ | Ninguém está no canal de voz, deixando...');
});

player.on('queueEnd', queue => {
  queue.metadata.send('✅ | Fila concluída!');
});

client.once('ready', async () => {
  console.log('Ready!');
});

client.on('ready', function() {
  client.user.setPresence({
    activities: [{ name: config.activity, type: config.activityType }],
    status: 'Playing music',
  });
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (!client.application?.owner) await client.application?.fetch();

  if (message.content === '!deploy' && message.author.id === client.application?.owner?.id) {
    await message.guild.commands
      .set(client.commands)
      .then(() => {
        message.reply('Implantado!');
      })
      .catch(err => {
        message.reply('Não foi possível implantar comandos! Certifique-se de que o bot tenha o aplicativo.!');
        console.error(err);
      });
  }
});

client.on('interactionCreate', async interaction => {
  const command = client.commands.get(interaction.commandName.toLowerCase());

  try {
    if (interaction.commandName == 'ban' || interaction.commandName == 'userinfo') {
      command.execute(interaction, client);
    } else {
      command.execute(interaction, player);
    }
  } catch (error) {
    console.error(error);
    interaction.followUp({
      content: 'Ocorreu um erro ao tentar executar esse comando!',
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
