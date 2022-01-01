import { handleGuildMemberAdd } from './response-events/guildMemberAdd.js'
import { handleGuildMemberRemove } from './response-events/guildMemberRemove.js'
import { handleMessageReactionAdd } from './response-events/messageReactionAdd.js'
import { handleSlashCommand } from './slash_commands/handler.js'
import { helpFields, _findCommand, _parseWords } from './util.js'
import { discordPackerHandler } from './discordPackerHandler.js'
import fs from 'fs'
import { __dirname } from "../../__dirname.js";
import { handleDigitalBeingInput } from "../../brain/handleInput.js"

import agents from "./commands/agents.js"
import ban from "./commands/ban.js"
import commands from "./commands/commands.js"
import ping from "./commands/ping.js"
import pingagent from "./commands/pingagent.js"
import setagent from "./commands/setagent.js"
import setname from "./commands/setname.js"
import unban from "./commands/unban.js"

import messageCreate from "./events/messageCreate.js"
import messageDelete from "./events/messageDelete.js"
import messageUpdate from "./events/messageUpdate.js"
import presenceUpdate from "./events/presenceUpdate.js"

import Discord, {Util, Intents} from 'discord.js'
// required for message.lineReply
import 'discord-inline-reply'

const config = {
  "prefix": "!",
  "prefixOptionalWhenMentionOrDM": true,
  "bot_name": "Cat"
}

const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN 

export let client = undefined

export const createDiscordClient = () => {
    if (!process.env.DISCORD_API_TOKEN) return console.warn('No API token for Discord bot, skipping');
    console.log("Creating Discord client");
    client = new Discord.Client({
      partials: ['MESSAGE', 'USER', 'REACTION'],
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES]
    })
    //{ intents: [ Intents.GUILDS, Intents.GUILD_MEMBERS, Intents.GUILD_VOICE_STATES, Intents.GUILD_PRESENCES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });
    // We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
    client.config = config;
    client.helpFields = helpFields;
    client._findCommand = _findCommand;
    client._parseWords = _parseWords;
    client.bot_name = config.bot_name
    client.name_regex = new RegExp(config.bot_name, 'ig')
    client.username_regex = new RegExp(process.env.BOT_NAME_REGEX, 'ig')
    client.edit_messages_max_count = process.env.EDIT_MESSAGES_MAX_COUNT

    const embed = new Discord.MessageEmbed()
    .setColor(0x00AE86)

    client.embed = embed;

    client.on("messageCreate", messageCreate.bind(null, client));
    client.on("messageDelete", messageDelete.bind(null, client));
    client.on("messageUpdate", messageUpdate.bind(null, client));
    client.on("presenceUpdate", presenceUpdate.bind(null, client));

    client.on('interactionCreate', async interaction => {
      console.log("Handling interaction", interaction);
      handleSlashCommand(client, interaction)
    });
    client.on('guildMemberAdd', async user => {
      handleGuildMemberAdd(user);
    });
    client.on('guildMemberRemove', async user => {
      handleGuildMemberRemove(user)
    });
    client.on('messageReactionAdd', async (reaction, user) => {
      handleMessageReactionAdd(reaction, user)
    });

// TODO: Move to the message create handler now that it's loading

//     client.on("message", async message => {
//       if(message.author.username.includes("GPTBot")) return;
//       handleDigitalBeingInput({ message, username: message.author.username, client_name: "Discord" });
// });

    client.commands = new Discord.Collection();

    client.commands.set("agents", agents);
    client.commands.set("ban", ban);
    client.commands.set("commands", commands);
    client.commands.set("ping", ping);
    client.commands.set("pingagent", pingagent);
    client.commands.set("setagent", setagent);
    client.commands.set("setname", setname);
    client.commands.set("unban", unban);

    client.login(process.env.DISCORD_API_TOKEN);
    console.log("Creating new discord packer handler");
    new discordPackerHandler(client)
};