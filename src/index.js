import dotenv from "dotenv";
import { database } from "./database/database.js";
import cors_server from "./utilities/cors-server.js";
import { customConfig } from './utilities/customConfig.js';
import { createExpressServer } from './utilities/expressServer.js';
import { initLogger, log } from "./utilities/logger.js";
import roomManager from "./utilities/roomManager.js";
import { runClients } from "./utilities/runClients.js";
import { initClassifier, initProfanityClassifier } from "./utilities/textClassifier.js";
import { error } from './utilities/logger.js';

new cors_server(process.env.CORS_PORT, '0.0.0.0');

dotenv.config();

export let defaultAgent = '';
export let isInFastMode = false;

const db = new database();
(async function(){  
    await db.connect()
    await initClassifier();
    await initProfanityClassifier();
    await initLogger();
    new roomManager();
    const agent = customConfig.instance.get('agent')?.replace('_', ' ');
    defaultAgent = agent;
    isInFastMode = customConfig.instance.getBool('fastMode');

    const expectedServerDelta = 1000 / 60;
    let lastTime = 0;

    // @ts-ignore
    globalThis.requestAnimationFrame = (f) => {
        const serverLoop = () => {
            const now = Date.now();
            if (now - lastTime >= expectedServerDelta) {
                lastTime = now;
                f(now);
            } else {
                setImmediate(serverLoop);
            }
        }
        serverLoop()
    }

    await createExpressServer();
    await runClients();
})();

process.on('unhandledRejection', err => {
    error('Unhandled Rejection at:', err.stack || err);
});