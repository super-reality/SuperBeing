import express, { urlencoded, json } from 'express';
import dotenv from "dotenv";
import { database } from "./database/database.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initTerminal } from "./connectors/terminal.js"
import cors from "cors";
import { handleInput } from './cognition/handleInput.js';

dotenv.config();

export let defaultAgent = '';

new database().connect()

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

let enabled_services = (process.env.ENABLED_SERVICES || '').split(',').map(
    (item) => item.trim().toLowerCase()
).filter(
    (value, index, self) => self.indexOf(value) === index
);

(async function(){  
    const app = express();
    const router = express.Router();
    
    const server = createServer(app);
    const io = new Server(server);
    
    app.use(json())
   
    app.get('/facebook', (req, res) => {
        res.send('Hello World I am running locally');
    });

    server.listen(process.env.SOCKETIO_PORT, () => {
            console.log()
    })
    
    io.on("connection", (socket) => {
            console.log("Connected", socket.id);
            socket.emit("message", `hello ${socket.id}`);
    })
        
    app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
    });
    
    const allowedOrigins = ['http://localhost:3000', 'https://supermind-client.vercel.app', 'https://superreality.com', 'http://localhost:65535']
    const corsOptions = {
            origin: function (origin, callback) {
                    console.log("Origin is", origin);
                    if (allowedOrigins.indexOf(origin) !== -1) {
                            callback(null, true)
                    } else {
                            callback(new Error('Not allowed by CORS'))
                    }
            }
    }
    
    app.use(cors(corsOptions));
    router.use(urlencoded({ extended: false }));
    
    
    const agent = process.env.AGENT?.replace('_', ' ');
    defaultAgent = agent;
    
    app.get("/health", async function (req, res) {
            res.send(`Server is alive and running! ${new Date()}`);
    });
    
    app.post("/msg", async function (req, res) {
            const message = req.body.command
            const speaker = req.body.sender
            await handleInput(message, speaker, agent, res)
    });
    
    
    app.post("/execute", async function (req, res) {
            const message = req.body.command
            const speaker = req.body.sender
            const agent = req.body.agent
            console.log("executing for ", req.body)
            if (message.includes("/become")) {
                    const out = await createWikipediaAgent("Speaker", agent, "", "");
                    while (out === null) {
                        out = await createWikipediaAgent('Speaker', defaultAgent, "", "");
                    }
                    return res.send(out);
            }
            await handleInput(message, speaker, agent, res)
    });
    
    app.listen(process.env.PORT, () => { console.log(`Server listening on http://localhost:${process.env.PORT}`); })
    
    if (process.env.TERMINAL) {
            initTerminal(agent);
    }
    
    if(process.env.BATTLEBOTS){
            const speaker = process.env.SPEAKER?.replace('_', ' ');
            const agent = process.env.AGENT?.replace('_', ' ');
            const message = "Hello, " + agent;
            console.log(speaker + " >>> " + message);
            let ignoreContentFilter = true;
            // Make a function that self-invokes with the opposites
            runBattleBot(speaker, agent, message, ignoreContentFilter);
    }
    
    
    async function runBattleBot(speaker, agent, message, ignoreContentFilter) {
            console.log(speaker, agent, message, ignoreContentFilter)
            const m = await handleInput(message, speaker, agent, null, ignoreContentFilter);
            setTimeout(() => runBattleBot(agent, speaker, m, ignoreContentFilter), 10000);
    }


        // Discord support
        if (enabled_services.includes('discord')) {
            import('./connectors/discord.js').then(module => module.default());
            console.log("Created Discord client");
        }
        // Reddit support
        if (enabled_services.includes('reddit')) {
            import('./connectors/reddit.js').then(module => module.default());
        }
        // TODO: MSN? Facebook? Messenger support
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
