
export class instagramPacketHandler {
    static getInstance
    ig

    constructor(ig) {
        instagramPacketHandler.getInstance = this
        this.ig = ig
    }

    async handle(chatId, responses) {
        Object.keys(responses).map(async function(key, index) {
            const thread = instagramPacketHandler.getInstance.ig.entity.directThread(chatId)
            await thread.broadcastText(responses[key])
        })
    }
}