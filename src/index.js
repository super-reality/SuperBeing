import express, { urlencoded, json } from 'express';
import cors from "cors";
import dotenv from "dotenv";
import { database } from "./database/database.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initTerminal } from "./connectors/terminal.js"
import { handleInput } from './cognition/handleInput.js';
import { createWikipediaAgent } from './connectors/wikipedia.js';
import cors_server from "./utilities/cors-server.js";
import { customConfig } from './utilities/customConfig.js';

new cors_server(process.env.CORS_PORT, '0.0.0.0');

dotenv.config();

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

    let enabled_services = (customConfig.instance.get('enabledServices') || '').split(',').map(
        (item) => {
            item.trim().toLowerCase()
        }
    ).filter(
        (value, index, self) => self.indexOf(value) === index
    );

    const app = express();
    const router = express.Router();
        
    const server = createServer(app);
        
    app.use(json())
    
    app.get('/facebook', (req, res) => {
        res.send('Hello World I am running locally');
    });

    server.listen(process.env.SOCKETIO_PORT, () => {
        console.log()
    })
            
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
        
    const allowedOrigins = ['*']
    const corsOptions = {
        origin: function (origin, callback) {
            console.log("Origin is", origin);
            if (allowedOrigins.indexOf('*') !== -1) {
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
    
    const agent = customConfig.instance.get('agent')?.replace('_', ' ');
    defaultAgent = agent;
        
    app.get("/health", async function (req, res) {
        res.send(`Server is alive and running! ${new Date()}`);
    });
        
    app.post("/msg", async function (req, res) {
        const message = req.body.command
        const speaker = req.body.sender
        await handleInput(message, speaker, agent, res, 'web', '0');
    });

    app.get('/get_agents', async function (req, res) {
        const agents = await database.instance.getAgents();
        return res.send(agents);
    });

    app.get('/get_agent', async function(req, res) {
        const agent = req.query.agent;
        const data = { 
            actions: (await database.instance.getActions(agent)).trim(),
            dialogue: (await database.instance.getDialogue(agent)).trim(),
            ethics: (await database.instance.getEthics(agent)).trim(),
            facts: (await database.instance.getAgentFacts(agent)).trim(),
            monologue: (await database.instance.getMonologue(agent)).trim(),
            needsAndMotivation: (await database.instance.getNeedsAndMotivations(agent)).trim(),
            personality: (await database.instance.getPersonality(agent)).trim(),
            relationshipMatrix: (await database.instance.getRelationshipMatrix(agent)).trim(),
            room: (await database.instance.getRoom(agent)).trim()
        };
        return res.send(data);
    });

    app.post('/update_agent', async function(req, res) {
        const agentName = req.body.agent;
        const data = req.body.data;

        try {
            await database.instance.setActions(agentName, data.actions);
            await database.instance.setDialogue(agentName, data.dialogue);
            await database.instance.setEthics(agentName, data.ethics);
            await database.instance.setAgentFacts(agentName, data.facts);
            await database.instance.setMonologue(agentName, data.monologue);
            await database.instance.setNeedsAndMotivations(agentName, data.needsAndMotivation);
            await database.instance.setPersonality(agentName, data.personality);
            await database.instance.setRelationshipMatrix(agentName, data.relationshipMatrix);
            await database.instance.setRoom(agentName, data.room);
        } catch (e) {
            console.log(e + '\n' + e.stack);
            return res.send('internal error');
        }

            return res.send('ok');
        });

    app.get('/get_config', async function(req, res) {
        const data = {
            config: customConfig.instance.allToArray()
        };

        return res.send(data);
    });

    app.post('/update_config', async function(req, res) {
        const data = req.body.config;

        try {
            for (let i = 0; i < data.length; i++) {
                await customConfig.instance.set(data[i].key, data[i].value);
            }

            res.send('ok');
            process.exit(1);
        } catch (e) {
            console.log(e + '\n' + e.stack);
            return res.send('internal error');
        }
    });
        
    app.post("/execute", async function (req, res) {
        const message = req.body.command
        const speaker = req.body.sender
        const agent = req.body.agent
        console.log("executing for ", req.body)
        if (message.includes("/become")) {
            console.log("becoming")
            const out = await createWikipediaAgent("Speaker", agent, "", "");
            while (out === null) {
                out = await createWikipediaAgent('Speaker', defaultAgent, "", "");
            }
            console.log("sending out", out)
            return res.send(out);
        }
        await handleInput(message, speaker, agent, res, 'web', '0')
    });
        
    app.listen(process.env.PORT, () => { console.log(`Server listening on http://localhost:${process.env.PORT}`); })
        
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


    // Discord support
    if (enabled_services.includes('discord')) {
     import('./connectors/discord.js').then(module => module.default());
        console.log("Created Discord client");
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