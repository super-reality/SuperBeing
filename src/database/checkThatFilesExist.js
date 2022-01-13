import { database } from "./database.js";

export function checkThatFilesExist(speaker, agent){
    const meta = database.instance.getMeta(agent, speaker);
    if (!meta || meta.length <= 0) {
        database.instance.setMeta(agent, speaker, JSON.stringify({ messages: 0 }));
    }
}