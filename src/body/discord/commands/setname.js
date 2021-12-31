import * as fs from 'fs';

const config = {
    "prefix": "!",
    "prefixOptionalWhenMentionOrDM": true,
    "bot_name": "Cat"
  }  

export async function run (client, message, args, author, addPing, channel) {
    if (args.parsed_words === undefined || args.parsed_words.length !== 1) {
        message.channel.send('Invalid format, !setname name')
        message.channel.stopTyping()
        return
    }

    const name = args.parsed_words[0]
    process.env.BOT_NAME = 'test'
    client.bot_name = name
    client.name_regex = new RegExp(name, 'ig')
    config.bot_name = name
    console.log(client.bot_name + ' - ' + client.name_regex)
    message.channel.send('Updated bot name to: ' + name)
    message.channel.stopTyping()
}