import SnooStream from 'snoostream';
import * as snoowrap from 'snoowrap';
import { database } from '../database/database.js';

export let reddit;

export const prevMessage = {}
export const prevMessageTimers = {}
export const messageResponses = {}
export const conversation = {}

export function onMessageDeleted(channel, messageId) {
    if (messageResponses[channel] !== undefined && messageResponses[channel][messageId] !== undefined) {
        delete messageResponses[channel][messageId]
    }
}
export function onMessageResponseUpdated(channel, messageId, newResponse) {
    if (messageResponses[channel] === undefined) messageResponses[channel] = {}
    messageResponses[channel][messageId] = newResponse
}

export function getMessage(channel, messageId) {
    return channel.messages.fetchMessage(messageId)
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
            if (conversation[user] !== undefined) {
                conversation[user].timeoutId = undefined
                conversation[user].timeOutFinished = true
            }
        }, 480000)
    } else {
        conversation[user].timeoutId = setTimeout(() => {
            if (conversation[user] !== undefined) {
                conversation[user].timeoutId = undefined
                conversation[user].timeOutFinished = true
            }
        }, 480000)
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

export function getResponse(channel, message) {
    if (messageResponses[channel] === undefined) return undefined
    return messageResponses[channel][message]
}

export function addMessageToHistory(chatId, messageId, senderName, content) {
    database.instance.addMessageInHistory('reddit-chat', chatId, messageId, senderName, content)
}
export async function addMessageInHistoryWithDate(chatId, messageId, senderName, content, timestamp) {
    await database.instance.addMessageInHistoryWithDate('reddit-chat', chatId, messageId, senderName, content, timestamp)
}
export async function deleteMessageFromHistory(chatId, messageId) {
    await database.instance.deleteMessage('reddit-chat', chatId, messageId)
}
export async function updateMessage(chatId, messageId, newContent) {
    await database.instance.updateMessage('reddit-chat', chatId, messageId, newContent, true)
}
export async function wasHandled(chatId, messageId, sender, content, timestamp) {
    return await database.instance.messageExistsAsync('reddit-chat', chatId, messageId, sender, content, timestamp)
}

export class redditHandler {
    static instance
    reddit;

    constructor(reddit) {
        redditHandler.instance = this
        this.reddit = reddit
    }

    async handleMessage(responses, messageId, chat_id, args) {
        Object.keys(responses).map(function(key, index) {
            if (args === 'isChat') {
                redditHandler.instance.reddit.getMessage(messageId).reply(responses[key]).then(res => {
                    database.instance.addMessageInHistory('reddit', chat_id, res.id, process.env.BOT_NAME, responses[key])
                })
            } else if (args === 'isPost') {
                reddit.getSubmission(chat_id).reply(responses[key]).then(res => {
                    database.instance.addMessageInHistory('reddit', chat_id, res.id, process.env.BOT_NAME, responses[key])
                })
            }
        })
    }
}

export const createRedditClient = async () => {
    const appId = process.env.REDDIT_APP_ID;
    const appSecredId = process.env.REDDIT_APP_SECRED_ID;
    const oauthToken = process.env.REDDIT_OATH_TOKEN;
    //https://github.com/not-an-aardvark/reddit-oauth-helper
    if (!appId || !appSecredId) return console.warn("No API token for Reddit bot, skipping");
    
    const snooWrapOpptions =  {
        continueAfterRatelimitError: true,
        requestDelay: 1100
    }

    reddit = new snoowrap({
        userAgent: 'test_db_app',
        clientId: appId,
        clientSecret: appSecredId,
        refreshToken: oauthToken
    });
    reddit.config(snooWrapOpptions);
    const stream = new SnooStream(reddit)
    new redditHandler(reddit)
    console.log('loaded reddit client')

    const regex = new RegExp('((?:carl|sagan)(?: |$))', 'ig')

    let commentStream = stream.commentStream('test_db')
    commentStream.on('post', async (post, match) => {
        let _match;
        if (post.hasOwnProperty('body')) {
            _match = post.body.match(regex);
        } else if (post.hasOwnProperty('selftext')) {
            _match = post.selftext.match(regex);
        }
    
        if (_match) {
            console.log('got new commend')// - ' + JSON.stringify(post))
            const id = post.id
            const chat_id = post.link_url.split('/')[6]
            const senderId = post.author_fullname
            const author = post.author.name
            const body = post.body
            const timestamp = post.created_utc
            // TODO: Replace me with input handler
            // MessageClient.instance.sendMessage(body, id, 'reddit', chat_id, timestamp, false, author, 'isPost') 
            const date = new Date(post.created)
            const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
            const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
        
            database.instance.addMessageInHistoryWithDate('reddit', chat_id, id, author, body, utcStr)
        } else {
            await database.instance.messageExistsAsyncWitHCallback2('reddit', post.link_url.split('/')[6], post.id, post.author.name, post.body, post.timestamp, () => {
                console.log('got new commend')// - ' + JSON.stringify(post))
                const id = post.id
                const chat_id = post.link_url.split('/')[6]
                const senderId = post.author_fullname
                const author = post.author
                const body = post.body
                const timestamp = post.created_utc
                // TODO: Replace with direct message handler
                console.log(body, id, 'reddit', chat_id, timestamp, false, author, 'isPost');
                // MessageClient.instance.sendMessage(body, id, 'reddit', chat_id, timestamp, false, author, 'isPost') 
                const date = new Date(post.created)
                const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
            
                database.instance.addMessageInHistoryWithDate('reddit', chat_id, id, author, body, utcStr)
            })
        }
    });
    let submissionStream = stream.submissionStream('test_db', { regex: '((?:carl|sagan)(?: |$))' })
    submissionStream.on('post', async (post, match) => {
        let _match;
        if (post.hasOwnProperty('body')) {
            _match = post.body.match(regex);
        } else if (post.hasOwnProperty('selftext')) {
            _match = post.selftext.match(regex);
        }
        
        if (_match) {
            console.log('got new post' + JSON.stringify(post))
            const id = post.id
            const chat_id = post.id
            const senderId = post.author_fullname
            const author = post.author.name
            const body = post.selftext
            const timestamp = post.created_utc
            // TODO: Replace with direct message handler
            console.log(body, id, 'reddit', id, timestamp, false, author, 'isPost');
            // MessageClient.instance.sendMessage(body, id, 'reddit', id, timestamp, false, author, 'isPost') 
            const date = new Date(post.created)
            const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
            const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
        
            database.instance.addMessageInHistoryWithDate('reddit', chat_id, id, author, body, utcStr)
        } else {
            await database.instance.messageExistsAsyncWitHCallback2('reddit', post.id, post.id, post.author.name, post.body, post.timestamp, () => {
                console.log('got new post')// - ' + JSON.stringify(post))
                const id = post.id
                const chat_id = post.id
                const senderId = post.author_fullname
                const author = post.author
                const body = post.selftext
                const timestamp = post.created_utc
                // TODO: Replace with direct message handler
                console.log(body, id, 'reddit', id, timestamp, false, author, 'isPost');
                // MessageClient.instance.sendMessage(body, id, 'reddit', id, timestamp, false, author, 'isPost') 
                const date = new Date(post.created)
                const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
            
                database.instance.addMessageInHistoryWithDate('reddit', chat_id, id, author, body, utcStr)
            })
        }
    });

    setInterval(async () => {
        (await reddit.getInbox()).forEach(async (message) => {
            const id = message.name;
            const senderId = message.id;
            const author = message.author.name;
            const body = message.body;
            const timestamp = message.created_utc
            if (!author.includes('reddit')) {
                //console.log('current message: ' + body)
                await database.instance.messageExistsAsyncWitHCallback('reddit', senderId, id, author, body, timestamp, () => {
                    console.log('got new message: ' + body)
                    // TODO: Replace with direct message handler
                    console.log(body, id, 'reddit', senderId, timestamp, false, author, 'isChat');
                    // MessageClient.instance.sendMessage(body, id, 'reddit', senderId, timestamp, false, author, 'isChat')
                    const date = new Date(timestamp)
                    const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                    const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
                
                    database.instance.addMessageInHistoryWithDate('reddit', id, id, author, body, utcStr)
                })
            }
        })
    }, 1000)
    /*submissionStream.on('post', async (post, match) => {
        console.log('22')
        console.log('submission stream: ' + JSON.stringify(await post))    
    });*/
    
    /*reddit.getSubreddit('test_db')
        .submitSelfpost({
            subredditName: 'test_db',
            title: 'test',
            text: 'test'
        })*/

    /*;(await reddit.getSubreddit('test_db').getTop().then()).forEach(post => {
        console.log(post.title)
    })
    reddit.getSubreddit('test_db').getNew().then(posts => {
        posts.forEach(post => console.log(post.title))
    })

    await (await reddit.getInbox()).forEach(post => {
        console.log(post.body)
    })*/

    /*;(await reddit.getHot()).map(post => {
        const date = new Date(post.created)
        const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
        console.log(utcStr)
    });

    console.log(reddit.getSubmission('2np694'))
    console.log('author: ' + (reddit.getSubmission('2np694').then(console.log)))
    reddit.getSubreddit('test_db').getModqueue({limit: -1}).then(console.log)*/
}