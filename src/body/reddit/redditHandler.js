import { postgres } from "../postgres.js";
import { reddit } from "./reddit-client.js";

export class redditHandler {
    static getInstance
    reddit;

    constructor(reddit) {
        redditHandler.getInstance = this
        this.reddit = reddit
    }

    async handleMessage(responses, messageId, chat_id, args) {
        Object.keys(responses).map(function(key, index) {
            if (args === 'isChat') {
                redditHandler.getInstance.reddit.getMessage(messageId).reply(responses[key]).then(res => {
                    postgres.getInstance.addMessageInHistory('reddit', chat_id, res.id, process.env.BOT_NAME, responses[key])
                })
            } else if (args === 'isPost') {
                reddit.getSubmission(chat_id).reply(responses[key]).then(res => {
                    postgres.getInstance.addMessageInHistory('reddit', chat_id, res.id, process.env.BOT_NAME, responses[key])
                })
            }
        })
    }
}