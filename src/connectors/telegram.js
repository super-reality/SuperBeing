import { database } from "../database/database.js"
import { getRandomEmptyResponse, startsWithCapital } from "./utils.js"

export class telegramPacketHandler {
    static instance
    bot
    botName

    constructor(bot, botName) {
        telegramPacketHandler.instance = this
        this.bot = bot
        this.botName = botName
    }

    async handleMessage(chat_id, responses, message_id, addPing, args) { 
        let senderId = ''
        let senderName = ''
        if (args !== 'none' && args.startsWith('[') && args[args.length-1] === ']') {
            args = JSON.parse(args)
            senderId = args[0]
            senderName = args[1]
        }
        console.log(JSON.stringify(responses))
        Object.keys(responses).map(function(key, index) {
            console.log('response: ' + responses[key])
            if (responses[key] !== undefined && responses[key].length > 0) {
                let text = responses[key]
                while (text === undefined || text === '' || text.replace(/\s/g, '').length === 0) text = getRandomEmptyResponse()
                if (addPing) telegramPacketHandler.instance.bot.sendMessage(chat_id,`<a href="tg://user?id=${senderId}">${senderName}</a> ${text}`, {parse_mode: 'HTML'}).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, process.env.BOT_NAME, text)
                    }).catch(console.error)
                else telegramPacketHandler.instance.bot.sendMessage(chat_id,text).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, process.env.BOT_NAME, text)
                }).catch(console.error)       
        }
            else {
                let emptyResponse = getRandomEmptyResponse()
                while (emptyResponse === undefined || emptyResponse === '' || emptyResponse.replace(/\s/g, '').length === 0) emptyResponse = getRandomEmptyResponse()
                if (addPing) telegramPacketHandler.instance.bot.sendMessage(chat_id,`<a href="tg://user?id=${senderId}">${senderName}</a> ${emptyResponse}`, {parse_mode: 'HTML'}).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, process.env.BOT_NAME, emptyResponse)
                    }).catch(console.error)           
                else telegramPacketHandler.instance.bot.sendMessage(chat_id,emptyResponse).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, process.env.BOT_NAME, emptyResponse)
                    }).catch(console.error)
            }
        });          
    }

    async handleEditMessage(chat_id, message_id, responses, args) {
        let senderId = ''
        let senderName = ''
        if (args !== 'none' && args.startsWith('[') && args[args.length-1] === ']') {
            args = JSON.parse(args)
            senderId = args[0]
            senderName = args[1]
        }
        Object.keys(responses).map(function(key, index) {
            console.log('response: ' + responses[key])
            if (responses[key] !== undefined && responses[key].length <= 2000 && responses[key].length > 0) {
                let text = responses[key]
                while (text === undefined || text === '' || text.replace(/\s/g, '').length === 0) text = getRandomEmptyResponse()
                telegramPacketHandler.instance.bot.sendMessage(chat_id,`<a href="tg://user?id=${senderId}">${senderName}</a> ${text}`, {parse_mode: 'HTML'}).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, telegramPacketHandler.instance.botName, text)
                    }).catch(console.error)
            }
            else if (responses[key].length > 2000) {
                const lines = []
                let line = ''
                for(let i = 0; i < responses[key].length; i++) {
                    line+= responses[key]
                    if (i >= 1980 && (line[i] === ' ' || line[i] === '')) {
                        lines.push(line)
                        line = ''
                    }
                }

                for (let i = 0; i< lines.length; i++) {
                    if (lines[i] !== undefined && lines[i] !== '' && lines[i].replace(/\s/g, '').length !== 0) {
                        if (i === 0) {
                            let text = lines[1]
                            while (text === undefined || text === '' || text.replace(/\s/g, '').length === 0) text = getRandomEmptyResponse()
                            telegramPacketHandler.instance.bot.sendMessage(chat_id,`<a href="tg://user?id=${senderId}">${senderName}</a> ${text}`, {parse_mode: 'HTML'}).then(function (_resp) {
                                onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                                addMessageToHistory(_resp.chat.id, _resp.message_id, telegramPacketHandler.instance.botName, text)
                                }).catch(console.error) 
                        }
                    }
                }
            }
            else {
                let emptyResponse = getRandomEmptyResponse()
                while (emptyResponse === undefined || emptyResponse === '' || emptyResponse.replace(/\s/g, '').length === 0) emptyResponse = getRandomEmptyResponse()
                telegramPacketHandler.instance.bot.sendMessage(chat_id,`<a href="tg://user?id=${senderId}">${senderName}</a> ${emptyResponse}`, {parse_mode: 'HTML'}).then(function (_resp) {
                    onMessageResponseUpdated(_resp.chat.id, message_id, _resp.message_id)
                    addMessageToHistory(_resp.chat.id, _resp.message_id, telegramPacketHandler.instance.botName, emptyResponse)
                }).catch(console.error)   
            }
        })
    }
}

export async function onMessageEdit(bot, msg, botName) {
    if (database.instance.isUserBanned(msg.from.id + '', 'telegram')) return
    console.log('edited_message: ' + JSON.stringify(msg))
    const date = Date.now() / 1000
    const msgDate = msg.date
    const diff = date - msgDate
    const hours_diff = Math.ceil(diff/3600)
    const mins_diff = Math.ceil((diff-hours_diff)/60)
    if (mins_diff > 12 || (mins_diff <= 12 && hours_diff > 1)) return
    const _sender = msg.from.username === undefined ? msg.from.first_name : msg.from.username

    updateMessage(msg.chat.id, msg.message_id, msg.text)
    if (msg.from.is_bot) return

    const oldResponse = getResponse(msg.chat.id, msg.message_id)
    if (oldResponse === undefined) return
    
    const dateNow = new Date();
    var utc = new Date(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate(), dateNow.getUTCHours(), dateNow.getUTCMinutes(), dateNow.getUTCSeconds());
    const utcStr = dateNow.getDate() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()

    // TODO: Replace with the direct message handler
    // MessageClient.instance.sendMessageEdit(msg.text, msg.message_id + '', 'Telegram', msg.chat.id + '', utcStr, true, '[ \''+ msg.from.id + '\', \'' + msg.from.first_name + '\' ]')
}

export async function onMessage(bot, msg, botName, username_regex) {
    addMessageToHistory(msg.chat.id, msg.message_id, msg.from.username === undefined ? msg.from.first_name : msg.from.username, msg.text)
    console.log(JSON.stringify(msg))
    const date = Date.now() / 1000
    const msgDate = msg.date
    const diff = date - msgDate
    const hours_diff = Math.ceil(diff/3600)
    const mins_diff = Math.ceil((diff-hours_diff)/60)
    if (mins_diff > 12 || (mins_diff <= 12 && hours_diff > 1)) return

    if (database.instance.isUserBanned(msg.from.id + '', 'telegram')) return    
    let content = msg.text
    const _sender = msg.from.username === undefined ? msg.from.first_name : msg.from.username
    addMessageToHistory(msg.chat.id, msg.message_id, _sender, content)
    let addPing = false
    if (msg.chat.type == 'supergroup') {
        if (content === '') content = '{sent media}'
        let isReply = false
        if (msg.reply_to_message !== undefined) {
            if (msg.reply_to_message.from.username === botName) isReply = true
            else {
                exitConversation(_sender)
                const _replyTo = msg.reply_to_message.from.username === undefined ? msg.reply_to_message.from.first_name : msg.reply_to_message.from.username
                exitConversation(_replyTo)
                return
            }
        }
        let _prev = undefined
        if (!msg.from.is_bot) {
            _prev = prevMessage[msg.chat.id]
            prevMessage[msg.chat.id] = _sender
            if (prevMessageTimers[msg.chat.id] !== undefined) clearTimeout(prevMessageTimers[msg.chat.id])
            prevMessageTimers[msg.chat.id] = setTimeout(() => prevMessage[msg.chat.id] = '', 120000)
        }
        addPing = (_prev !== undefined && _prev !== '' && _prev !== _sender) || moreThanOneInConversation()

        const isMention = msg.entities !== undefined && msg.entities.length === 1 && msg.entities[0].type === 'mention' && content.includes('@' + process.env.TELEGRAM_BOT_NAME)
        const otherMention = msg.entities !== undefined && msg.entities.length > 0 && msg.entities[0].type === 'mention'  && !content.includes('@' + process.env.TELEGRAM_BOT_NAME)
        let startConv = false
        let startConvName = ''
        if (!isMention && !otherMention) {
            const trimmed = content.trimStart()
            if (trimmed.toLowerCase().startsWith('hi')) {
                const parts = trimmed.split(' ')
                if (parts.length > 1) {
                    if (!startsWithCapital(parts[1])) {
                        startConv = true
                    }
                    else {
                        startConv = false
                        startConvName = parts[1]
                    }
                }
                else {
                    if (trimmed.toLowerCase() === 'hi') {
                        startConv = true
                    } 
                }
            }
        }
        if (otherMention) {
            exitConversation(_sender)
            for(let i = 0; i < msg.entities.length; i++) {
                if (msg.entities[i].type === 'mention') {
                    const _user = msg.text.slice(msg.entities[i].offset + 1, msg.entities[i].length)
                    exitConversation(_user)
                }
            }
        }
        if (!startConv) {
            if (startConvName.length > 0) {
                exitConversation(_sender)
                exitConversation(startConvName)
            }
        }

        const isUserNameMention = content.toLowerCase().replace(',', '').replace('.', '').replace('?', '').replace('!', '').match(username_regex)
        const isInDiscussion = isInConversation(_sender)
        if (!content.startsWith('!') && !otherMention) {
            if (isMention) content = '!ping ' + content.replace('!', '').trim()
            else if (isUserNameMention) content = '!ping ' + content.replace(username_regex, '').trim()   
            else if (isInDiscussion || startConv || isReply) content = '!ping ' + content
        }

        if (!otherMention && content.startsWith('!ping')) sentMessage(_sender)
    }
    else {
        content = '!ping ' + content
    }

    if (content === '!ping ' || !content.startsWith('!ping')) return

    const dateNow = new Date();
    var utc = new Date(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate(), dateNow.getUTCHours(), dateNow.getUTCMinutes(), dateNow.getUTCSeconds());
    const utcStr = dateNow.getDate() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()

    // TODO: Replace with direct message handler
    // MessageClient.instance.sendMessage(content.replace("!ping", ""), msg.message_id + '', 'Telegram', msg.chat.id + '', utcStr, addPing, _sender, addPing ? '[ \''+ msg.from.id + '\', \'' + msg.from.first_name + '\' ]' : 'none')
}

export const prevMessage = {}
export const prevMessageTimers = {}
export const messageResponses = {}
export const conversation = {}
export const chatHistory = {}

export function onMessageDeleted(chatId, messageId) {
    if (messageResponses[chatId] !== undefined && messageResponses[chatId][messageId] !== undefined) {
        delete messageResponses[chatId][messageId]
    }
}
export function onMessageResponseUpdated(chatId, messageId, newResponse) {
    if (messageResponses[chatId] === undefined) messageResponses[chatId] = {}
    messageResponses[chatId][messageId] = newResponse
}

export function getMessage(chatId, messageId) {
    return chatId.messages.fetchMessage(messageId)
}

export function isInConversation(user) {
    return conversation[user] !== undefined && conversation[user].isInConversation === true
}

export function sentMessage(user) {
    for(let c in conversation) {
        if (c === user) continue
        if (conversation[c] !== undefined && conversation[c].timeOutFinished === true) {
            exitConversation(c)
        }
    }

    if (conversation[user] === undefined) {
        conversation[user] = { timeoutId: undefined, timeOutFinished: true, isInConversation: true }
        if (conversation[user].timeoutId !== undefined) clearTimeout(conversation[user].timeoutId)
        conversation[user].timeoutId = setTimeout(() => {
            console.log('conversation for ' + user + ' ended')
            if (conversation[user] !== undefined) {
                conversation[user].timeoutId = undefined
                conversation[user].timeOutFinished = true
            }
        }, 720000)
    } else {
        conversation[user].timeoutId = setTimeout(() => {
            console.log('conversation for ' + user + ' ended')
            if (conversation[user] !== undefined) {
                conversation[user].timeoutId = undefined
                conversation[user].timeOutFinished = true
            }
        }, 720000)
    }
}

export function exitConversation(user) {
    if (conversation[user] !== undefined) {
        if (conversation[user].timeoutId !== undefined) clearTimeout(conversation[user].timeoutId)
        conversation[user].timeoutId = undefined
        conversation[user].timeOutFinished = true
        conversation[user].isInConversation = false
        delete conversation[user]
    }
}

export function moreThanOneInConversation() {
    let count = 0
    for(let c in conversation) {
        if (conversation[c] === undefined) continue
        if (conversation[c].isInConversation !== undefined && conversation[c].isInConversation === true && conversation[c].timeOutFinished === false) count++
    }

    return count > 1
}

export function getResponse(chatId, message) {
    if (messageResponses[chatId] === undefined) return undefined
    return messageResponses[chatId][message]
}

export async function addMessageToHistory(chatId, messageId, senderName, content) {
    await database.instance.addMessageInHistory('telegram', chatId, messageId, senderName, content)
}
export async function getChatHistory(chatId, length) {
    return await database.instance.getHistory(length, 'telegram', chatId)
}
export async function updateMessage(chatId, messageId, newContent) {
    await database.instance.updateMessage('telegram', chatId, messageId, newContent, true)
}

export const createTelegramClient = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) return console.warn("No API token for Telegram bot, skipping");
    const username_regex = new RegExp(process.env.BOT_NAME_REGEX, 'ig')
    let botName = ''

    const bot = new TelegramBot(token, {polling: true})
    bot.getMe().then(info => botName = info.username).catch(console.error)

    bot.on('message', async (msg) => {
        await onMessage(bot, msg, botName, username_regex)
    })
    bot.on('edited_message', async (msg) => {
        await onMessageEdit(bot, msg, botName)
    });
    new telegramPacketHandler(bot, botName)
    console.log('telegram client loaded')
}