import { getRandomEmptyResponse } from "../utils.js";

export class xrEnginePacketHandler {
    static getInstance
    bot

    constructor(bot) {
        console.log('creating packet handler')
        this.bot = bot
        xrEnginePacketHandler.getInstance = this
    }

    async handleXREngineResponse(responses, addPing, _sender) {
            console.log('response: ' + responses)
            if (responses !== undefined && responses.length <= 2000 && responses.length > 0) {
                let text = responses
                while (text === undefined || text === '' || text.replace(/\s/g, '').length === 0) text = getRandomEmptyResponse()
                if (addPing) text = _sender + ' ' + text
                xrEnginePacketHandler.getInstance.bot.sendMessage(text)         
            }
            else if (responses.length > 2000) {
                const lines = []
                let line = ''
                for(let i = 0; i < responses.length; i++) {
                    line+= responses
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
                            if (addPing) { 
                                text = _sender + ' ' + text
                                addPing = false
                            }
                            xrEnginePacketHandler.getInstance.bot.sendMessage(text)                  
                        }
                    }
                }
            }
            else {
                let emptyResponse = getRandomEmptyResponse()
                while (emptyResponse === undefined || emptyResponse === '' || emptyResponse.replace(/\s/g, '').length === 0) emptyResponse = getRandomEmptyResponse()
                if (addPing) emptyResponse = _sender + ' ' + emptyResponse
                xrEnginePacketHandler.getInstance.bot.sendMessage(emptyResponse)         
            }
    }
}