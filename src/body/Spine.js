import { handleInput } from "../brain/handleInput.js";

export class Spine {
    static getInstance
    client

    async init(ip, port) {
        Spine.getInstance = this
    }

    async send(data) {
        console.log("Attempting to send data");
        console.log(data);
        console.log("Handling message")
        // if(data.message)
        const inputResponse = await handleInput(data.message, client_name);
        console.log("input response is: " + inputResponse);

        // if (this.client !== undefined) {
        //     this.client.write(json)
        // }
    }

    async sendMessage(message, message_id, client_name, chat_id, createdAt, addPing, author, args = 'none') {

        return await this.send({
            id: 0, 
            message: message, 
            message_id: message_id, 
            client_name: client_name, 
            chat_id: chat_id, 
            createdAt: createdAt, 
            addPing: addPing,
            author: author,
            args: args })
    }
    async sendSlashCommand(sender, command, args, client_name, chat_id, createdAt) {
        return await this.send({
            id: 1,
            sender: sender,
            command: command,
            args: args,
            client_name: client_name,
            chat_id: chat_id,
            createdAt: createdAt
        })
    }
    async sendUserUpdateEvent(client_name, event, user, createdAt) {
        return await this.send({
            id: 2,
            client_name: client_name,
            event: event,
            user: user,
            createdAt: createdAt
        })
    }
    async sendGetAgents(client_name, chat_id) {
        return await this.send({
            id: 3,
            client_name: client_name,
            chat_id: chat_id
        })
    }
    async sendSetAgentsFields(client_name, chat_id, name, context) {
        return await this.send({
            id: 4,
            client_name: client_name,
            chat_id: chat_id,
            name: name,
            context: context
        })
    }
    async sendPingSoloAgent(client_name, chat_id, message_id, message, agent, addPing, author) {
        return await this.send({
            id: 5,
            client_name: client_name,
            chat_id: chat_id,
            message_id: message_id,
            message: message,
            agent: agent,
            addPing: addPing,
            author: author
        })
    }
    async sendMessageReactionAdd(client_name, chat_id, message_id, content, user, reaction, createdAt) {
        return await this.send({
            id: 6,
            client_name: client_name,
            chat_id: chat_id,
            message_id: message_id,
            content: content,
            user: user,
            reaction: reaction,
            createdAt: createdAt
        })
    }
    async sendMessageEdit(message, message_id, client_name, chat_id, createdAt, addPing, args = 'none') {
        return await this.send({
            id: 7, 
            message: message, 
            message_id: message_id, 
            client_name: client_name, 
            chat_id: chat_id, 
            createdAt: createdAt, 
            addPing: addPing,
            args: args
        })
    }
    async sendMetadata(channel_name, client_name, channel_id, metadata) {
        return await this.send({
            id: 8,
            channel_name: channel_name,
            client_name: client_name,
            channel_id: channel_id,
            metadata: metadata
        })
    }
}