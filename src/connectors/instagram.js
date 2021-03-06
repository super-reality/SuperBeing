import { IgApiClient } from 'instagram-private-api';
import { handleInput } from '../cognition/handleInput.js';
import { database } from '../database.js';
import customConfig from '../utilities/customConfig.js';
import { log } from '../utilities/logger.js';


export const createInstagramClient = async () => {
    const username = customConfig.instance.get('instagramUsername')
    const password = customConfig.instance.get('instagramPassword')
    if (!username || !password) return console.warn("No Instagram credentials found, skipping");

    //creates the instagram client and logs in using the credentials
    const ig = new IgApiClient()
    ig.state.generateDevice(username);

    await ig.simulate.preLoginFlow()
    const loggedInUser = await ig.account.login(username, password)
    process.nextTick(async () => await ig.simulate.postLoginFlow())

    const history = { 
        pending: await ig.feed.directInbox().items(),
        unread:[]
    }

    for (var idx in history.pending) {
        let pending = history.pending[idx]
        if (pending.last_permanent_item.item_type === 'text') {
            await database.instance.messageExists('instagram', 
                pending.thread_id, 
                pending.last_permanent_item.item_id + '',
                pending.last_permanent_item.user_id === loggedInUser.pk ? customConfig.instance.get('botName') : pending.thread_title,
                pending.last_permanent_item.text, 
                parseInt(pending.last_permanent_item.timestamp) / 1000)
        }
    }

    setInterval(async () => {
        const inbox = { 
            pending: await ig.feed.directInbox().items()
        }

        for (var idx in inbox.pending) {
            let pending = inbox.pending[idx]
            if (pending.last_permanent_item.item_type === 'text') {
                if (pending.last_permanent_item.user_id === loggedInUser.pk) {
                    await database.instance.messageExists('instagram', 
                        pending.thread_id, 
                        pending.last_permanent_item.item_id + '',
                        pending.last_permanent_item.user_id === loggedInUser.pk ? customConfig.instance.get('botName') : pending.thread_title,
                        pending.last_permanent_item.text, 
                        parseInt(pending.last_permanent_item.timestamp) / 1000)

                    continue
                }

                await database.instance.messageExistsAsyncWitHCallback('instgram', 
                    pending.thread_id,
                    pending.last_permanent_item.item_id + '',
                    pending.users[0].username, 
                    pending.last_permanent_item.text, 
                    parseInt(pending.last_permanent_item.timestamp), () => {
                        const timestamp = parseInt(pending.last_permanent_item.timestamp)
                        var date = new Date(timestamp / 1000);
                        const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                        const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
            
                        log('got new message: ' + pending.last_permanent_item.text)

                        const resp = await handleInput(pending.last_permanent_item.text, pending.users[0].username,
                            customConfig.instance.get('agent') ?? "Agent", null, 'instagram', pending.last_permanent_item.item_id);
                        
                        const thread = ig.entity.directThread(chatId)
                        await thread.broadcastText(resp)

                        database.instance.addMessageInHistoryWithDate('instagram',
                            pending.thread_id, 
                            pending.last_permanent_item.item_id + '', 
                            pending.users[0].username, 
                            pending.last_permanent_item.text, 
                            utcStr)
                    })
            }
        }
    }, 5000)
}