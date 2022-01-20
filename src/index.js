import express, { urlencoded, json } from 'express';
import cors from "cors";
import dotenv from "dotenv";
import { database } from "./database/database.js";
import { createServer } from "http";
import { initTerminal } from "./connectors/terminal.js"
import { handleInput } from './cognition/handleInput.js';
import cors_server from "./utilities/cors-server.js";
import { customConfig } from './utilities/customConfig.js';
import { registerRoutes } from './utilities/routes.js';

new cors_server(process.env.CORS_PORT, '0.0.0.0');

dotenv.config();

export let app;
export let defaultAgent = '';

const db = new database();
(async function(){  
    await db.connect()

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

    //reads the enabled services from the config and puts them in an array
    let enabled_services = customConfig.instance.get('enabledServices').split(',');
    for(let i = 0; i < enabled_services.length; i++) {
        enabled_services[i] = enabled_services[i].trim().toLowerCase();
    }
    enabled_services = enabled_services.filter(function(elem, pos) {
        return enabled_services.indexOf(elem) == pos;
    });

    //creates an express servr and enables CORs for it
    app = express();
    const router = express.Router();
        
    const server = createServer(app);
        
    app.use(json());

    server.listen(process.env.SOCKETIO_PORT, () => {
        console.log()
    })
            
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    
    //to enable all remote clients use '*' in the allowed origins, otherwise just put the URLs that will be allowed
    const allowedOrigins = ['*']
    //dissalowed origins can be used to block some URLs, it should be used only if allowedOrigins is set to allow all
    const dissalowedOrigins = [ /*'http://localhost:3001'*/ ]
    const corsOptions = {
        origin: function (origin, callback) {
            console.log("Origin is", origin);
            if (dissalowedOrigins.indexOf(origin) !== -1) {
                callback(new Error('Not allowed by CORS'));
            }
            else if (allowedOrigins.indexOf('*') !== -1) {
                callback(null, true);
            } 
            else {
                if (allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        }
    }
        
    app.use(cors(corsOptions));
    router.use(urlencoded({ extended: false }));
    
    await registerRoutes();

    const agent = customConfig.instance.get('agent')?.replace('_', ' ');
    defaultAgent = agent;
        
    app.listen(process.env.PORT, () => { console.log(`Server listening on http://localhost:${process.env.PORT}`); })
    
    //this can enable the terminal use of the AI, which is used to chat with the agent directly through the terminal
    if (process.env.TERMINAL) {
        initTerminal(agent);
    }

    if(process.env.BATTLEBOTS){
        const speaker = process.env.SPEAKER?.replace('_', ' ');
        const agent = customConfig.instance.get('agents')?.replace('_', ' ');
        const message = "Hello, " + agent;
        console.log(speaker + " >>> " + message);
        let ignoreContentFilter = true;
        // Make a function that self-invokes with the opposites
        runBattleBot(speaker, agent, message, ignoreContentFilter);
            
            
        async function runBattleBot(speaker, agent, message, ignoreContentFilter) {
            console.log(speaker, agent, message, ignoreContentFilter)
            const m = await handleInput(message, speaker, agent, ignoreContentFilter, 'battlebots', '0');
            setTimeout(() => runBattleBot(agent, speaker, m, ignoreContentFilter), 10000);
        }
    }


    //based on which clients are added in the array, it will run its script
    // Discord support
    if (enabled_services.includes('discord')) {
     import('./connectors/discord.js').then(module => module.default());
    }
    // Reddit support
    if (enabled_services.includes('reddit')) {
        import('./connectors/reddit.js').then(module => module.default());
    }
    // Facebook Page Messenger
    if (enabled_services.includes('messenger')) {
        import('./connectors/messenger.js').then(module => module.default());
    }
    // Instagram support
    if (enabled_services.includes('instagram')) {
        import('./connectors/instagram.js').then(module => module.default());
    }
    // Telegram support
    if (enabled_services.includes('telegram')) {
        import('./connectors/telegram.js').then(module => module.default());
    }
    // Twilio support for SMS
    if (enabled_services.includes('twilio')) {
        import('./connectors/twilio.js').then(module => module.default(app, router));
    }
    // Whatsapp support
    if (enabled_services.includes('whatsapp')) {
        import('./connectors/whatsapp.js').then(module => module.default());
    }
    // Twitter support
    if (enabled_services.includes('twitter')) {
        import('./connectors/twitter.js').then(module => module.default());
    }
    // Harmony support
    if (enabled_services.includes('harmony')) {
        import('./connectors/harmony.js').then(module => module.default());
    }
    // XREngine support
    if (enabled_services.includes('xrengine')) {
        import('./connectors/xrengine.js').then(module => module.default());
    }
    // Zoom support
    if (enabled_services.includes('zoom')) {
        await require('./zoom/zoom-client').createZoomClient();
    }
})();

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});