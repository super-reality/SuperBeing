import dotenv from "dotenv";
import { database } from "./database/database.js";
import cors_server from "./utilities/cors-server.js";
import { customConfig } from './utilities/customConfig.js';
import { createExpressServer } from './utilities/expressServer.js';
import { runClients } from "./utilities/runClients.js";

new cors_server(process.env.CORS_PORT, '0.0.0.0');

dotenv.config();

export let defaultAgent = '';

const db = new database();
(async function(){  
    await db.connect()
    const agent = customConfig.instance.get('agent')?.replace('_', ' ');
    defaultAgent = agent;

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

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});