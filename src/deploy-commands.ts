import * as dotenv from 'dotenv';
dotenv.config();

import { REST, Routes } from 'discord.js';
import { data } from './commands/lobby';

const commands = [data.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('🔄  Refreshing slash commands…');



    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands },
    );

    console.log('✅  Commands deployed to guild.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
