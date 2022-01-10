import Twilio from 'twilio';
import { database } from '../database/database.js';
import { getRandomEmptyResponse } from './utils.js';

export async function message(req, res) {
    if (await database.instance.isUserBanned(req.body.From, 'twilio')) return
    console.log('received message: ' + req.body.Body)
    await database.instance.getNewMessageId('twilio', req.body.From, async (msgId) => {
        addMessageToHistory(req.body.From, req.body.From, req.body.Body, msgId)   
        const message = '!ping ' + req.body.Body
          
        const args = {}
        args['grpc_args'] = {};
    
        args['parsed_words'] = message.slice('!'.length).trim().split(/ +/g);
        
        // Grab the command data from the client.commands Enmap
        args['command_info'] = [
            'ping',
            [ 'HandleMessage' ],
            [ 'sender', 'message', 'client_name', 'chat_id', 'createdAt' ],
            'ping all agents'
          ]
        args['grpc_args']['sender'] = req.body.From
        if (args['command_info']) {
            args['command'] = args['command_info'][0];
            args['grpc_args']['message'] = message.replace("!" + args['command'], "");  //remove .command from message
            args['grpc_method'] = args['command_info'][1][0];
            args['grpc_method_params'] = args['command_info'][2];
        }
    
        args['grpc_args']['client_name'] = 'twilio'
        args['grpc_args']['chat_id'] = req.body.From + ''
    
        const dateNow = new Date();
        var utc = new Date(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate(), dateNow.getUTCHours(), dateNow.getUTCMinutes(), dateNow.getUTCSeconds());
        const utcStr = dateNow.getDate() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
        
        // TODO: Replace me with direct message handler
        // MessageClient.instance.sendMessage(req.body.Body, msgId + '' || '1', 'Twilio', req.body.From, utcStr, false, req.body.From)
    })
}

export class handleTwilio {
    static instance
    client;

    constructor(client) {
        handleTwilio.instance = this
        this.client = client
    }

    async handleTwilioMsg(chat_id, responses) {
        Object.keys(responses).map(async function(key, index) {
            await database.instance.getNewMessageId('twilio', chat_id, async (msgId) => {
                console.log('response: ' + responses[key])
                if (responses[key] !== undefined && responses[key].length <= 2000 && responses[key].length > 0) {
                    let text = responses[key]
                    while (text === undefined || text === '' || text.replace(/\s/g, '').length === 0) text = getRandomEmptyResponse()
                    sendMessage(handleTwilio.instance.client, chat_id, text); 
                    addMessageToHistory(chat_id, process.env.BOT_NAME, text, msgId)                 
                }
                else if (responses[key].length > 160) {
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
                                sendMessage(handleTwilio.instance.client, chat_id, text); 
                                addMessageToHistory(chat_id, process.env.BOT_NAME, text, msgId)
                        }
                    }
                }
            }
                else {
                    let emptyResponse = getRandomEmptyResponse()
                    while (emptyResponse === undefined || emptyResponse === '' || emptyResponse.replace(/\s/g, '').length === 0) emptyResponse = getRandomEmptyResponse()
                    sendMessage(handleTwilio.instance.client, chat_id, emptyResponse); 
                    addMessageToHistory(chat_id, process.env.BOT_NAME, emptyResponse, msgId)
                }
            })
        })
    }
}
export function getDbKey(chatId, messageId) {
    return 'twilio.' + chatId + '.' + messageId
}
export async function getChatHistory(chatId, length) {
    return await database.instance.getHistory(length, 'twilio', chatId)
}

export async function addMessageToHistory(chatId, senderName, content, messageId) {
    database.instance.addMessageInHistory('twilio', chatId, messageId + '', senderName, content)
}

export const createTwilioClient = async (app, router) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    console.log('init')
    if (!accountSid || !authToken || !twilioNumber)  return console.warn("No API token for Twilio bot, skipping");
    console.log('twilio client created, sid: ' + accountSid + ' auth token: ' + authToken)

    const client = new Twilio(accountSid, authToken);
    new handleTwilio(client)

    app.use('/sms', router.post("/", async (req, res) => {
        await message(req, res)
    }))

}

export function sendMessage(client, toNumber, body) {
    console.log('sending sms: ' + body)
    client.messages.create({from: process.env.TWILIO_PHONE_NUMBER,
        to: toNumber,
        body: body
    }).then((message) => console.log('sent message: ' + message.sid)).catch(console.error)
    console.log('send message to: ' + toNumber + ' body: ' + body)
}