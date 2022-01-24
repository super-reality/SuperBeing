import { formOpinionAboutSpeaker } from "./formOpinionAboutSpeaker.js";
import { summarizeAndStoreFactsAboutAgent } from "./summarizeAndStoreFactsAboutAgent.js";
import { summarizeAndStoreFactsAboutSpeaker } from "./summarizeAndStoreFactsAboutSpeaker.js";
import { makeCompletionRequest } from "../utilities/makeCompletionRequest.js";
import { evaluateTextAndRespondIfToxic } from "./profanityFilter.js";
import keywordExtractor from '../utilities/keywordExtractor.js';
import { database } from '../database/database.js';
import { capitalizeFirstLetter } from "../connectors/utils.js";
import { isInFastMode } from '../index.js';

function respondWithMessage(agent, text, res) {
        if (res) res.status(200).send(JSON.stringify({ result: text }));
        console.log(agent + ">>> " + text);
        return text;
}

//handles the commands from the input (terminal, web or any client)
async function evaluateTerminalCommands(message, speaker, agent, res, client, channel) {
        if (message === "/reset") { // If the user types /reset into the console...
                // If there is a response (i.e. this came from a web client, not local terminal)
                if (res) {
                        const result = { result: `${agent} has been reset` };
                        // Add the status 200 message (message OK)
                        res.status(200)
                                // Send the message as JSON
                                .send(JSON.stringify(result));
                } else {
                        console.log(`${agent} has been reset`);
                }
                
                await database.instance.clearConversations();
                return true;
        }

        else if (message === "/dump") { // If a user types dump, show them logs of convo
                // Read conversation history
                const conversation = database.instance.getConversation(agent, speaker, client, channel, false);
                // If there is a response (i.e. this came from a web client, not local terminal)
                const result = { result: conversation };
                if (res) {
                        // Add the status 200 message (message OK)
                        res.status(200)
                                // Send the message as JSON
                                .send(JSON.stringify(result));
                } else {
                        console.log(conversation);
                }
                return true;
        }

        else if (message === "GET_AGENT_NAME") {
                if (res) res.status(200).send(JSON.stringify({ result: agent }));
                else console.log({ result: agent });
                return true;
        }
}

//returns the agents' configs in json format
async function getConfigurationSettingsForAgent(agent) {
        return JSON.parse((await database.instance.getAgentsConfig(agent)).toString());
}

// Slice the conversation and store any more than the window size in the archive
async function archiveConversation(speaker, agent, _conversation, client, channel) {
        // Get configuration settings for agent
        const { conversationWindowSize } = await getConfigurationSettingsForAgent(agent);

        const conversation = (await database.instance.getConversation(agent, speaker, client, channel, false)).toString().trim();
        const conversationLines = conversation.split('\n');
        if (conversationLines.length > conversationWindowSize) {
                const oldConversationLines = conversationLines.slice(0, Math.max(0, conversationLines.length - conversationWindowSize));
                const newConversationLines = conversationLines.slice(Math.min(conversationLines.length - conversationWindowSize));
                for(let i = 0; i < oldConversationLines.length; i++) {
                        await database.instance.setConversation(agent, client, channel, speaker, oldConversationLines[i], true);
                }
                /*for(let i = 0; i < newConversationLines.length; i++) {
                        await database.instance.setConversation(agent, client, channel, speaker, newConversationLines[i], false);
                }*/
        }
}

async function archiveFacts(speaker, agent) {
        // Get configuration settings for agent
        const { speakerFactsWindowSize, agentFactsWindowSize } = getConfigurationSettingsForAgent(agent);

        const existingSpeakerFacts = (await database.instance.getSpeakersFacts(agent, speaker)).toString().trim().replaceAll('\n\n', '\n');
        const speakerFacts = existingSpeakerFacts == "" ? "" : existingSpeakerFacts; // If no facts, don't inject
        const speakerFactsLines = speakerFacts.split('\n');  // Slice the facts and store any more than the window size in the archive
        if (speakerFactsLines.length > speakerFactsWindowSize) {
                await database.instance.updateSpeakersFactsArchive(agent, speaker, speakerFactsLines.slice(0, speakerFactsLines.length - speakerFactsWindowSize).join("\n"));
                await database.instance.setSpeakersFacts(agent, speaker, speakerFactsLines.slice(speakerFactsLines.length - speakerFactsWindowSize).join("\n"));
        }

        const existingAgentFacts = (await database.instance.getAgentFacts(agent)).toString().trim();
        const agentFacts = existingAgentFacts == "" ? "" : existingAgentFacts + "\n"; // If no facts, don't inject
        const agentFactsLines = agentFacts.split('\n'); // Slice the facts and store any more than the window size in the archive
        if (agentFactsLines.length > agentFactsWindowSize) {
                await database.instance.updateAgentFactsArchive(agent, agentFactsLines.slice(0, agentFactsLines.length - agentFactsWindowSize).join("\n"));
                await database.instance.setAgentFacts(agent, agentFactsLines.slice(agentFactsLines.length - agentFactsWindowSize).join("\n"));;
        }
}

//generates the context for the open ai request, it gets the default configration from the website and replaces it with the agent's specifics
async function generateContext(speaker, agent, conversation, message) {
        let keywords = []
        if (!isInFastMode) {
                keywords = keywordExtractor(message, agent);
        }
        const speakerFacts = (await database.instance.getSpeakersFacts(agent, speaker)).toString().trim().replaceAll('\n\n', '\n');
        const agentFacts = (await database.instance.getAgentFacts(agent)).toString().trim().replaceAll('\n\n', '\n');

        let kdata = '';
        if (!isInFastMode) {
                if ((await keywords).length > 0) {
                        kdata = "More context on the chat:\n";
                        for(let k in keywords) {
                                kdata += 'Q: ' + capitalizeFirstLetter(keywords[k].word) + '\nA: ' + keywords[k].info + '\n\n';
                        }
                        kdata += '\n';
                }
        }

        // Return a complex context (this will be passed to the transformer for completion)
        return (await database.instance.getContext()).toString()
                .replaceAll('$room', await database.instance.getRoom(agent))
                .replaceAll("$morals", await database.instance.getMorals())
                .replaceAll("$ethics", await database.instance.getEthics(agent))
                .replaceAll("$personality", await database.instance.getPersonality(agent))
                .replaceAll("$needsAndMotivations", await database.instance.getNeedsAndMotivations(agent))
                .replaceAll("$exampleDialog", await database.instance.getDialogue(agent))
                .replaceAll("$monologue", await database.instance.getMonologue(agent))
                .replaceAll("$facts", await database.instance.getFacts(agent))
                // .replaceAll("$actions", fs.readFileSync(rootAgent + 'actions.txt').toString())
                .replaceAll("$speakerFacts", speakerFacts)
                .replaceAll("$agentFacts", agentFacts)
                .replaceAll('$keywords', kdata)
                .replaceAll("$agent", agent)
                .replaceAll("$speaker", speaker)
                .replaceAll("$conversation", conversation);
}

//handles the input from a client according to a selected agent and responds
export async function handleInput(message, speaker, agent, res, clientName, channelId) {
        console.log("Handling input: " + message);
        //if the input is a command, it handles the command and doesn't respond according to the agent
        if (await evaluateTerminalCommands(message, speaker, agent, res, clientName, channelId)) return;
        
        const _meta = await database.instance.getMeta(agent, speaker);
        if (!_meta || _meta.length <= 0) {
            database.instance.setMeta(agent, speaker, JSON.stringify({ messages: 0 }));
        }

        // Get configuration settings for agent
        const { dialogFrequencyPenality,
                dialogPresencePenality,
                factsUpdateInterval,
                useProfanityFilter } = await getConfigurationSettingsForAgent(agent);

        // If the profanity filter is enabled in the agent's config...
        if (useProfanityFilter && !isInFastMode) {
                // Evaluate if the speaker's message is toxic
                const { isProfane, isSensitive, response } = await evaluateTextAndRespondIfToxic(speaker, agent, message);
                if ((isProfane || isSensitive) && response) {
                        console.log(agent + ">>> " + response);
                        if (res) res.status(200).send(JSON.stringify({ result: response }));
                        return response;
                }
        }

        // Append the speaker's message to the conversation
        await database.instance.setConversation(agent, clientName, channelId, speaker, message, false);

        // Parse files into objects
        const meta =  !_meta || _meta.length <= 0 ? { messages: 0 } : JSON.parse(_meta);
        const conversation = (await database.instance.getConversation(agent, speaker, clientName, channelId, false)).toString().replaceAll('\n\n', '\n');

        // Increment the agent's conversation count for this speaker
        meta.messages = meta.messages + 1;

        // Archive previous conversation and facts to keep context window small
        archiveConversation(speaker, agent, conversation, clientName, channelId);
        archiveFacts(speaker, agent, conversation);

        const context = await generateContext(speaker, agent, conversation, message);

        // TODO: Wikipedia?

        // searchWikipedia(text.Input) .then( (out) => { console.log("**** WEAVIATE: " + JSON.stringify(out)); currentState = states.READY; });

        // Print the context to the console if running indev mode
        // if (process.env.DEBUG == "TRUE") {
        //         console.log("*********************** CONTEXT");
        //         console.log(context);
        //         console.log("***********************");
        // };

        // Create a data object to pass to the transformer API
        const data = {
                "prompt": context,
                "temperature": 0.9, // TODO -- this should be changeable
                "max_tokens": 100, // TODO -- this should be changeable
                "top_p": 1, // TODO -- this should be changeable
                "frequency_penalty": dialogFrequencyPenality,
                "presence_penalty": dialogPresencePenality,
                "stop": ["\"\"\"", `${speaker}:`, '\n']
        };

        // Call the transformer API
        const { success, choice } = await makeCompletionRequest(data, speaker, agent, "conversation");

        // If it fails, tell speaker they had an error
        if (!success) {
                const error = "Sorry, I had an error";
                return respondWithMessage(agent, error, res);
        };
        if (useProfanityFilter && !isInFastMode) {

                // Check agent isn't about to say something offensive
                const { isProfane, response } = await evaluateTextAndRespondIfToxic(speaker, agent, choice.text, true);

                if (isProfane) {
                        database.instance.setConversation(agent, clientName, channelId, agent, response, false);
                        return respondWithMessage(agent, response, res);
                }
        }

        //every some messages it gets the facts for the user and the agent
        if (meta.messages % factsUpdateInterval == 0) {
                formOpinionAboutSpeaker(speaker, agent);

                const conversation = (await database.instance.getConversation(agent, speaker, clientName, channelId, false)).toString().trim();
                const conversationLines = conversation.split('\n');

                const speakerConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - (factsUpdateInterval * 2)).join("\n");
                const agentConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - factsUpdateInterval * 2).join("\n");

                summarizeAndStoreFactsAboutSpeaker(speaker, agent, speakerConversationLines);
                summarizeAndStoreFactsAboutAgent(speaker, agent, agentConversationLines + choice.text);
        }
        
        database.instance.setMeta(agent, speaker, meta);

        let respp = choice.text;
        if (respp.endsWith('\n')) {
                respp = respp.substring(0, respp.length - 2);
        }
        
        // Write to conversation to the database
        database.instance.setConversation(agent, clientName, channelId, agent, respp, false);

        return respondWithMessage(agent, respp, res);
}
