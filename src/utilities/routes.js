import { handleInput } from '../cognition/handleInput.js';
import { clientSettingsToInstance } from '../connectors/utils.js';
import { createWikipediaAgent } from '../connectors/wikipedia.js';
import { database } from '../database.js';
import { defaultAgent } from '../index.js';
import customConfig from './customConfig.js';
import { error } from './logger.js';

//Routes for the express server
export async function registerRoutes(app) {
    //a health check for the server
    app.get("/health", async function (req, res) {
        res.send(`Server is alive and running! ${new Date()}`);
    });

    //image post from the web client for the agents
    app.post("/msg", async function (req, res) {
        const message = req.body.command
        const speaker = req.body.sender
        await handleInput(message, speaker, agent, res, 'web', '0');
    });

    //returns all the current agents in the database
    app.get('/get_agents', async function (req, res) {
        const agents = await database.instance.getAgents();
        return res.send(agents);
    });

    //gets the data from an agent
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
            room: (await database.instance.getRoom(agent)).trim(),
            startingPhrases: (await database.instance.getStartingPhrases(agent)).trim(),
            ignoredKeywords: (await database.instance.getIgnoredKeywordsData(agent)).trim(),
        };

        return res.send(data);
    });

    //updates an agent's data
    app.post('/update_agent', async function(req, res) {
        const agentName = req.body.agentName;
        const data = req.body.data;
        try {
            await database.instance.setActions(agentName, data.actions);
            await database.instance.setDialogue(agentName, data.dialogue);
            await database.instance.setEthics(agentName, data.ethics);
            await database.instance.setAgentFacts(agentName, data.facts, true);
            await database.instance.setMonologue(agentName, data.monologue);
            await database.instance.setNeedsAndMotivations(agentName, data.needsAndMotivation);
            await database.instance.setPersonality(agentName, data.personality);
            await database.instance.setRoom(agentName, data.room);
            await database.instance.setStartingPhrases(agentName, data.startingPhrases);
            await database.instance.setIgnoredKeywords(agentName, data.ignoredKeywords);
        } catch (e) {
            error(e);
            return res.send('internal error');
        }

        return res.send('ok');
    });

    //delete the selected agent
    app.post('/delete_agent', async function(req, res) { 
        const agentName = req.body.agentName;
        if (agentName === 'common') {
            return res.send('you can\'t delete the default agent');
        }

        await database.instance.deleteAgent(agentName);

        return res.send('ok');
    });

    //creates an agent using an sql file directly
    app.post('/create_agent_sql', async function(req, res) {
        const sql = req.body.sql;
        try {
            const resp = await database.instance.createAgentSQL(sql);
            if (!resp || resp === false) {
                return res.send('invalid sql format');
            }
        } catch (e) {
            error(e);
            return res.send('internal error');
        }

        return res.send('ok');
    });

    app.get('/get_profanity_data', async function(req, res) {
        const editorId = req.query.editor_id;

        if (editorId == 1) {
            return res.send({data: (await database.instance.getBadWords()).toString().split("\n")});
        } else if (editorId == 2) {
            return res.send({data: (await database.instance.getSensitiveWords()).toString().split("\r\n")});
        } else if (editorId == 3) {
            return res.send({data: (await database.instance.getSensitivePhrases()).toString().split("\n")});
        } else if (editorId == 4) {
            return res.send({data: (await database.instance.getLeadingStatements()).toString().split("\n")});
        }

        return res.send('invalid editor id');
    });
    app.post('/add_profanity_word', async function(req, res) {
        const word = req.body.word;
        const editorId = req.body.editorId;

        if (editorId == 1) {
            if (await database.instance.badWordExists(word)) {
                return res.send('already exists');
            }

            await database.instance.addBadWord(word);
            return res.send('ok');
        } else if (editorId == 2) {
            if (await database.instance.sensitiveWordExists(word)) {
                return res.send('already exists');
            }

            await database.instance.addSensitiveWord(word);
            return res.send('ok');
        } else if (editorId == 3) {
            if (await database.instance.sensitivePhraseExists(word)) {
                return res.send('already exists');
            }

            await database.instance.addSensitivePhrase(word);
            return res.send('ok');
        } else if (editorId == 4) {
            if (await database.instance.leadingStatementExists(word)) {
                return res.send('already exists');
            }

            await database.instance.addLeadingStatement(word);
            return res.send('ok');
        }

        return res.send('invalid editor id');
    });
    app.post('/remove_profanity_word', async function(req, res) {
        const word = req.body.word;
        const editorId = req.body.editorId;

        if (editorId == 1) {
            await database.instance.removeBadWord(word);
            return res.send('ok');
        } else if (editorId == 2) {
            await database.instance.removeSensitiveWord(word);
            return res.send('ok');
        } else if (editorId == 3) {
            await database.instance.removeSensitivePhrase(word);
            return res.send('ok');
        } else if (editorId == 4) {
            await database.instance.removeLeadingStatement(word);
            return res.send('ok');
        }

        return res.send('invalid editor id');
    });

    //creates an agent using the web editor's form
    app.post('/create_agent', async function(req, res) {
        const data = req.body.data;
        const agentName = data.agentName;
        if (!agentName || agentName == undefined || agentName.length <= 0) {
            return res.send('invalid agent name');
        }

        try {
            await database.instance.setAgentExists(agentName);
            if (!data.actions || data.actions === undefined) data.actions = '';
            await database.instance.setActions(agentName, data.actions);
            if (!data.dialogue || data.dialogue === undefined) data.dialogue = '';
            await database.instance.setDialogue(agentName, data.dialogue);
            if (!data.ethics || data.ethics === undefined) data.ethics = '';
            await database.instance.setEthics(agentName, data.ethics);
            if (!data.facts || data.facts === undefined) data.facts = '';
            await database.instance.setAgentFacts(agentName, data.facts);
            if (!data.monologue || data.monologue === undefined) data.monologue = '';
            await database.instance.setMonologue(agentName, data.monologue);
            if (!data.needsAndMotivation || data.needsAndMotivation === undefined) data.needsAndMotivation = '';
            await database.instance.setNeedsAndMotivations(agentName, data.needsAndMotivation);
            if (!data.personality || data.personality === undefined) data.personality = '';
            await database.instance.setPersonality(agentName, data.personality);
            if (!data.room || data.room === undefined) data.room = '';
            await database.instance.setRoom(agentName, data.room);
            if (!data.startingPhrases || data.startingPhrases === undefined) data.startingPhrases = '';
            await database.instance.setStartingPhrases(agentName, data.startingPhrases);
            if (!data.ignoredKeywords || data.ignoredKeywords === undefined) data.ignoredKeywords = '';
            await database.instance.setIgnoredKeywords(agentName, data.ignoredKeywords);
        } catch (e) {
            error(e);
            return res.send('internal error');
        }

        return res.send('ok');
    });

    //return the configurations of the server
    app.get('/config', async function(req, res) {
        const data = {
            config: customConfig.instance.allToArray()
        };

        return res.send(data);
    });

    //updates the config values and restarts the server afterwords
    app.put('/config', async function(req, res) {
        const data = req.body.config;

        try {
            for (let i = 0; i < data.length; i++) {
                await customConfig.instance.set(data[i].key, data[i].value);
            }

            res.send('ok');
            console.log("TODO: Not exiting process here, we need to make sure we set config properly in this process")
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.delete('/config', async function(req, res) {
        const data = req.body.data;

        try {
            await customConfig.instance.delete(data.key);
            res.send('ok');
            console.log("TODO: Not exiting process here, we need to make sure we set config properly in this process")
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.post('/config', async function(req, res) {
        const data = req.body.data;

        try {
            await customConfig.instance.set(data.key, data.value);
            res.send('ok');
            console.log("TODO: Not exiting process here, we need to make sure we set config properly in this process")
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    //execute is used to run a command, like become an agent
    app.post("/execute", async function (req, res) {
        const message = req.body.command
        const speaker = req.body.sender
        const agent = req.body.agent
        const id = req.body.id;
        const msg = database.instance.getRandomStartingMessage(agent)
        if (message.includes("/become")) {
            let out = {}
            if (!(await database.instance.getAgentExists(agent))) {
                out = await createWikipediaAgent("Speaker", agent, "", "");
                // if (!out || out === undefined) {
                //     out = createWikipediaAgent('Speaker', defaultAgent, "", "");
                // }
            }

            out.startingMessage = (await msg);
            database.instance.setConversation(agent, 'web', id, agent, out.startingMessage, false);
            return res.send(out);

        }
        await handleInput(message, speaker, agent, res, 'web', id)
    });

    app.get('/agentConfig', async function (req, res) {
        try {
        return res.send(await database.instance.getAgentsConfig('common'));
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });
    app.post('/agentConfig', async function (req, res) {
        const data = req.body.data;

        try {
            await database.instance.setAgentsConfig('common', data);
            return res.send('ok');
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.get('/prompts', async function (req, res) { 
        try {
            const data = {
                _3d_world: await database.instance.get3dWorldUnderstandingPrompt(),
                fact: await database.instance.getAgentsFactsSummarization(),
                opinion: await database.instance.getOpinionFormPrompt(),
                xr: await database.instance.getXrEngineRoomPrompt(),
            }

            return res.send(data);
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });
    app.post('/prompts', async function (req, res) {
        const data = req.body.data;

        try {
            await database.instance.set3dWorldUnderstandingPrompt(data._3d_world);
            await database.instance.setAgentsFactsSummarization(data.fact);
            await database.instance.setOpinionFormPrompt(data.opinion);
            await database.instance.setXrEngineRoomPrompt(data.xr);

            return res.send('ok');
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.get('/agentInstances', async function (req, res) {
        try {
            let data = await database.instance.getAgentInstances();
            return res.send(data);
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.get('/agentInstance', async function (req, res) {
        try {
            const instanceId = req.query.instanceId;
            const isNum = /^\d+$/.test(instanceId);
            const _instanceId = isNum ? parseInt(instanceId) ? parseInt(instanceId) >= 1 ? parseInt(instanceId) : 1 : 1 : 1;
            let data = await database.instance.getAgentInstance(_instanceId);
            if (data === undefined || !data) {
                let newId = _instanceId;
                while (await database.instance.instanceIdExists(newId) || newId <= 0) {
                    newId++;
                }

                data = {
                    id: newId,
                    personality: '',
                    clients: clientSettingsToInstance(await database.instance.getAllClientSettings()),
                    enabled: true
                }
            }
            console.log(data);
            return res.send(data);
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });

    app.post('/agentInstance', async function (req, res) {
        console.log('data');
        console.log(req.data);
        const data = req.body.data;
        const instanceId = data.id;
        const personality = data.personality?.trim();
        const clients = data.clients;
        const enabled = data.enabled;

        if(!instanceId){
            await database.instance.createAgentInstance();
            res.send('ok');
            console.log("TODO: Not exiting process here, we need to make sure we set config properly in this process")
        }

        try {
            await database.instance.updateAgentInstances(instanceId, personality, clients, enabled);
            res.send('ok');
            console.log("TODO: Not exiting process here, we need to make sure we set config properly in this process")
        } catch (e) {
            error(e);
            return res.send('internal error');
        }
    });
}