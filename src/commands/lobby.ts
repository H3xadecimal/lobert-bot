import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
  } from 'discord.js';
  import { lobbyManager } from '../lib/LobbyManager';
  import { parseStartTime } from '../lib/startTime';
  
  export const data = new SlashCommandBuilder()
    .setName('lobby')
    .setDescription('Create or manage game lobbies')
    .addSubcommand(sc =>
      sc.setName('create')
        .setDescription('Create a new lobby')
        .addStringOption(o =>
          o.setName('game').setDescription('Game name').setRequired(true))
        .addIntegerOption(o =>
          o.setName('size').setDescription('Number of players').setRequired(true))
        .addStringOption(o =>
          o.setName('time').setDescription('24-hour HH:mm, e.g. 19:00 (not 1900). Mauritius UTC+4; optional offset: 19:00-05:00')))
    .addSubcommand(sc =>
      sc.setName('list').setDescription('List open lobbies'))
    .addSubcommand(sc =>
      sc.setName('cancel').setDescription('Cancel your lobby'));
  
  export async function execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
  
    /* ──────────────── CREATE ──────────────── */
    if (sub === 'create') {
      const game = interaction.options.getString('game', true);
      const size = interaction.options.getInteger('size', true);
      const time = interaction.options.getString('time');
      let startsAt: number | undefined;
      if (time !== null) {
        try {
          startsAt = parseStartTime(time);
        } catch (error) {
          return interaction.reply({ content: (error as Error).message, ephemeral: true });
        }
      }
  
      const embed = new EmbedBuilder()
        .setTitle(`${game.toUpperCase()} lobby (${1}/${size})`)
        .setDescription(`<@${interaction.user.id}> *(creator)*`)
        .setColor(0x57f287);
      if (startsAt !== undefined) {
        const mauritiusTime = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Indian/Mauritius',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).format(startsAt);
        const timestamp = Math.floor(startsAt / 1000);
        embed.addFields({
          name: 'Scheduled start (Mauritius, UTC+4)',
          value: `**${mauritiusTime}**\nYour local time: <t:${timestamp}:F>\nStarts <t:${timestamp}:R>`,
        });
      }
  
      const tempRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`join:${interaction.id}`)        // placeholder; fix after send
          .setLabel('Join')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`leave:${interaction.id}`)
          .setLabel('Leave')
          .setStyle(ButtonStyle.Secondary)
      );
  
      // Send the message first
      const reply = await interaction.reply({
        embeds: [embed],
        components: [tempRow],
      });
      const msg = await reply.fetch();
  
      /* --- save lobby in memory --- */
      lobbyManager.create({
        id: msg.id,
        channelId: msg.channel.id,
        creatorId: interaction.user.id,
        game,
        size,
        players: [interaction.user.id],
        startsAt,
        expiresAt: (startsAt ?? Date.now()) + 3 * 60 * 60 * 1000,
      });
  
      /* --- replace temp IDs with the real message ID (TS‑safe casts) --- */
      const fixedRow = ActionRowBuilder.from(
        tempRow as any
      ) as ActionRowBuilder<ButtonBuilder>;
  
      fixedRow.components.forEach(btn => {
        const b = btn as ButtonBuilder & { data: { custom_id?: string } };
        b.setCustomId(b.data.custom_id!.replace(interaction.id, msg.id));
      });
  
      await msg.edit({ components: [fixedRow as any] });
    }
  
    /* ──────────────── LIST ──────────────── */
    else if (sub === 'list') {
      const open = lobbyManager.list();
      if (!open.length) {
        return interaction.reply({ content: 'No open lobbies.', ephemeral: true });
      }

      for (const [i, lobby] of open.entries()) {
        const channel = await interaction.client.channels.fetch(lobby.channelId);
        if (!channel?.isTextBased()) continue;
        try {
          const msg = await channel.messages.fetch(lobby.id);
          const embed = msg.embeds[0];
          const components = msg.components;
          if (i === 0) {
            await interaction.reply({ embeds: [embed], components });
          } else {
            await interaction.followUp({ embeds: [embed], components });
          }
        } catch {
          /* message may be gone */
        }
      }
    }
  
    /* ──────────────── CANCEL ──────────────── */
    else if (sub === 'cancel') {
      const lobby = lobbyManager
        .list()
        .find(l => l.creatorId === interaction.user.id);
  
      if (!lobby) {
        return interaction.reply({
          content: 'You have no active lobby.',
          ephemeral: true,
        });
      }
  
      lobbyManager.delete(lobby.id);
      const channel = await interaction.client.channels.fetch(lobby.channelId);
      if (channel?.isTextBased()) {
        channel.messages.delete(lobby.id).catch(() => null);
      }
      await interaction.reply('❌  Lobby cancelled.');
    }
  }
