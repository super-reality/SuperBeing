import { formOpinionAboutSpeaker } from "./formOpinionAboutSpeaker.js";
import { summarizeAndStoreFactsAboutAgent } from "./summarizeAndStoreFactsAboutAgent.js";
import { summarizeAndStoreFactsAboutSpeaker } from "./summarizeAndStoreFactsAboutSpeaker.js";
import { discordPackerHandler } from '../connectors/discord.js';
import { instagramPacketHandler } from '../connectors/instagram.js';
import { handlePacketSend } from '../connectors/messenger.js';
import { redditHandler } from '../connectors/reddit.js';
import { telegramPacketHandler } from '../connectors/telegram.js';
import { handleTwilio } from '../connectors/twilio.js';
import { twitterPacketHandler } from '../connectors/twitter.js';
import { checkThatFilesExist } from "../database/checkThatFilesExist.js";
import { makeCompletionRequest } from "../utilities/makeCompletionRequest.js";
import { evaluateTextAndRespondIfToxic } from "./profanityFilter.js";
import { xrEnginePacketHandler } from '../connectors/xrengine.js';
import keywordExtractor from '../utilities/keywordExtractor.js';
import { database } from '../database/database.js';

function respondWithMessage(agent, text, res) {
        if (res) res.status(200).send(JSON.stringify({ result: text }));
        console.log(agent + ">>> " + text);
        return text;
}

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
                const conversation = database.instance.getConversation(agent, client, channel, speaker);
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

async function getConfigurationSettingsForAgent(agent) {
        return await database.instance.getAgentsConfig(agent);
}

// Slice the conversation and store any more than the window size in the archive
async function archiveConversation(speaker, agent) {
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
                for(let i = 0; i < newConversationLines.length; i++) {
                        await database.instance.setConversation(agent, client, channel, speaker, newConversationLines[i], false);
                }
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

async function generateContext(speaker, agent, conversation, keywords) {
        const speakerFacts = (await database.instance.getSpeakersFacts(agent, speaker)).toString().trim().replaceAll('\n\n', '\n');
        const agentFacts = (await database.instance.getAgentFacts(agent)).toString().trim().replaceAll('\n\n', '\n');

        let kdata = '';
        if (keywords.length > 0) {
                kdata = "More context on the chat:\n";
                for(let k in keywords) {
                        kdata += 'Q: ' + capitalizeFirstLetter(keywords[k].word) + '\nA: ' + keywords[k].info + '\n\n';
                }
                kdata += '\n';
        }

        // Return a complex context (this will be passed to the transformer for completion)
        return (await database.instance.getContext()).toString()
                .replaceAll('$room', await database.instance.getRoom(agent))
                .replaceAll("$morals", await database.instance.getMorals())
                .replaceAll("$ethics", await database.instance.getEthics(agent))
                .replaceAll("$personality", await database.instance.getPersonality(agent))
                .replaceAll("$needsAndMotivations", await database.instance.getNeedsAndMotivations(agent))
                .replaceAll("$exampleDialog", await database.instance.getDialog(agent))
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

// Todo fix me
export async function handleDigitalBeingInput(data) {
        console.log("Handling data.message", data);
        const response = await handleInput(data.message.content, data.username, process.env.AGENT ?? "Agent")
        const message_id = data.message.id; // data.message_id
        const channelId = data.message.channelId;
        const addPing = data.addPing; // data.addPing
        //     const args = data.args
        const clientName = data.clientName;
        if (clientName === 'Discord') {
                await discordPackerHandler.instance.handlePing(message_id, channelId, response, addPing)
        }
        else if (clientName === 'Messenger') {
                await handlePacketSend(channelId, response)
        }
        else if (clientName === 'Telegram') {
                await telegramPacketHandler.instance.handleMessage(channelId, response, message_id, addPing, args)
        }
        else if (clientName === 'Twilio') {
                await handleTwilio.instance.handleTwilioMsg(channelId, response)
        }
        else if (clientName === 'xr-engine') {
                await xrEnginePacketHandler.instance.handleXREngineResponse(response, addPing, args)
        }
        else if (clientName === 'reddit') {
                await redditHandler.instance.handleMessage(response, message_id, channelId, args);
        }
        else if (clientName === 'instagram') {
                await instagramPacketHandler.instance.handle(channelId, response)
        }
        else if (clientName === 'twitter') {
                await twitterPacketHandler.instance.handleMessage(response, message_id, channelId, args)
        }


        //     else if (packetId === 1) {
        //     const response = resp[3]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleSlashCommand(channelId, response)
        //     }
        // }
        // else if (packetId === 2) {
        //     const response = resp[3]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleUserUpdateEvent(response)
        //     }
        // }
        // else if (packetId === 3) {
        //     const response = resp[3]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleGetAgents(channelId, response)
        //     }
        // } 
        // else if (packetId === 4) {
        //     const response = resp[3]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleSetAgentsFields(channelId, response)
        //     }
        // }
        // else if (packetId === 5) {
        //     const message_id = resp[3]
        //     const response = resp[4]
        //     const addPing = resp[5]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handlePingSoloAgent(channelId, message_id, response, addPing)
        //     }
        // }
        // else if (packetId === 6) {
        //     const response = resp[3]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleMessageReactionAdd(response)
        //     }
        // }
        // else if (packetId === 7) {
        //     const message_id = resp[3]
        //     const response = resp[4]
        //     const addPing = resp[5]
        //     const args = resp[6]

        //     if (clientName === 'Discord') {
        //         await discordPackerHandler.instance.handleMessageEdit(message_id, channelId, response, addPing)
        //     }
        //     else if (clientName === 'Telegram') {
        //         await telegramPacketHandler.instance.handleEditMessage(channelId, message_id, response, args)
        //     }
        // }
}

export async function handleInput(message, speaker, agent, res, clientName, channelId) {
        console.log("Handling input: " + message);
        if (await evaluateTerminalCommands(message, speaker, agent, res, clientName, channelId)) return;
        checkThatFilesExist(speaker, agent);

        // Get configuration settings for agent
        const { dialogFrequencyPenality,
                dialogPresencePenality,
                factsUpdateInterval,
                useProfanityFilter } = await getConfigurationSettingsForAgent(agent);

        // If the profanity filter is enabled in the agent's config...
        if (useProfanityFilter) {
                // Evaluate if the speaker's message is toxic
                const { isProfane, isSensitive, response } = await evaluateTextAndRespondIfToxic(speaker, agent, message);
                if ((isProfane || isSensitive) && response) {
                        console.log(agent + ">>> " + response);
                        if (res) res.status(200).send(JSON.stringify({ result: response }));
                        return response;
                }
        }

        // Append speaker's name to the message to appear as chat history
        const userInput = speaker + ": " + message;

        // Append the speaker's message to the conversation
        await database.instance.setConversation(agent, client, channel, speaker, userInput, false);

        // Parse files into objects
        const meta = (await database.instance.getMeta(agent, speaker)).toString();
        const conversation = (await database.instance.getConversation(agent, speaker, client, channel, false)).toString().replaceAll('\n\n', '\n');

        // Increment the agent's conversation count for this speaker
        meta.messages = meta.messages + 1;

        // Archive previous conversation and facts to keep context window small
        await archiveConversation(speaker, agent, conversation);
        await  archiveFacts(speaker, agent, conversation);

        const keywords = await keywordExtractor(message);
        const context = await generateContext(speaker, agent, conversation, keywords);

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
                await database.instance.setConversation(agent, client, channel, speaker, `\n${agent}: ${error}\n`, false);
                return respondWithMessage(agent, error, res);
        };
        if (useProfanityFilter) {

                // Check agent isn't about to say something offensive
                const { isProfane, response } = await evaluateTextAndRespondIfToxic(speaker, agent, choice.text, true);

                if (isProfane) {
                        await database.instance.setConversation(agent, client, channel, speaker, `\n${agent}: ${response}\n`, false);
                        return respondWithMessage(agent, response, res);
                }
}

        if (meta.messages % factsUpdateInterval == 0) {
                formOpinionAboutSpeaker(speaker, agent);

                const conversation = (await database.instance.getConversation(agent, speaker, client, channel, false)).toString().trim();
                const conversationLines = conversation.split('\n');

                const speakerConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - (factsUpdateInterval * 2)).join("\n");
                const agentConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - factsUpdateInterval * 2).join("\n");

                summarizeAndStoreFactsAboutSpeaker(speaker, agent, speakerConversationLines);
                summarizeAndStoreFactsAboutAgent(speaker, agent, agentConversationLines + choice.text);

        }
        await database.instance.setMeta(agent, speaker, meta);

        // Write to conversation file
        await database.instance.setConversation(agent, client, channel, speaker, `\n${agent}:${choice.text}\n`, false);
        return respondWithMessage(agent, choice.text, res);
}
