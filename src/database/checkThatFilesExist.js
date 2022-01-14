import { database } from "./database.js";

export async function checkThatFilesExist(speaker, agent){
    const meta = await database.instance.getMeta(agent, speaker);
    if (!meta || meta.length <= 0) {
        await database.instance.setMeta(agent, speaker, JSON.stringify({ messages: 0 }));
    }
}