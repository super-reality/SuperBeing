import { Spine } from "../../Spine.js";

export async function run (client, message, args, author, addPing, channel) {
    Spine.getInstance.sendGetAgents('Discord', message.channel.id)
}