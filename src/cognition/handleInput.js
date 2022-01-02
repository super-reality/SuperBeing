import fs from 'fs';
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
import getFilesForSpeakerAndAgent from "../database/getFilesForSpeakerAndAgent.js";
import { makeCompletionRequest } from "../utilities/makeCompletionRequest.js";
import { evaluateTextAndRespondIfToxic } from "./profanityFilter.js";
import { rootDir } from "../utilities/rootDir.js";
import { xrEnginePacketHandler } from '../connectors/xrengine.js';

function respondWithMessage(agent, text, res) {
        if (res) res.status(200).send(JSON.stringify({ result: text }));
        console.log(agent + ">>> " + text);
        return text;
}

function evaluateTerminalCommands(message, speaker, agent, res) {
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
                const conversationDirectory = getFilesForSpeakerAndAgent(speaker, agent).conversationDirectory;
                if (fs.existsSync(conversationDirectory))
                        fs.rmdirSync(conversationDirectory, { recursive: true });
                return true;
        }

        else if (message === "/dump") { // If a user types dump, show them logs of convo
                // Read conversation history
                const conversation = fs.readFileSync(getFilesForSpeakerAndAgent(speaker, agent).conversation).toString() +
                        fs.readFileSync(getFilesForSpeakerAndAgent(speaker, agent).conversationArchiveFile).toString();
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

function getConfigurationSettingsForAgent(agent) {
        return fs.existsSync(rootDir + `/agents/${agent}/config.json`) ?
                JSON.parse(fs.readFileSync(rootDir + `/agents/${agent}/config.json`).toString()) :
                JSON.parse(fs.readFileSync(rootDir + "/agents/common/config.json").toString());
}

// Slice the conversation and store any more than the window size in the archive
function archiveConversation(speaker, agent) {
        // Get configuration settings for agent
        const { conversationWindowSize } = getConfigurationSettingsForAgent(agent);

        const { conversationArchiveFile, conversationFile } = getFilesForSpeakerAndAgent(speaker, agent);
        const conversation = fs.readFileSync(conversationFile).toString().trim();
        const conversationLines = conversation.split('\n');
        if (conversationLines.length > conversationWindowSize) {
                const oldConversationLines = conversationLines.slice(0, Math.max(0, conversationLines.length - conversationWindowSize));
                const newConversationLines = conversationLines.slice(Math.min(conversationLines.length - conversationWindowSize));
                fs.appendFileSync(conversationArchiveFile, "\n" + oldConversationLines.join("\n"));
                fs.writeFileSync(conversationFile, newConversationLines.join("\n"));
        }
}

function archiveFacts(speaker, agent) {
        // Get configuration settings for agent
        const { speakerFactsWindowSize, agentFactsWindowSize } = getConfigurationSettingsForAgent(agent);
        const {
                speakerFactsFile,
                speakerFactsArchiveFile,
                agentFactsFile,
                agentFactsArchiveFile,
        } = getFilesForSpeakerAndAgent(speaker, agent);

        const existingSpeakerFacts = fs.readFileSync(speakerFactsFile).toString().trim().replaceAll('\n\n', '\n');
        const speakerFacts = existingSpeakerFacts == "" ? "" : existingSpeakerFacts; // If no facts, don't inject
        const speakerFactsLines = speakerFacts.split('\n');  // Slice the facts and store any more than the window size in the archive
        if (speakerFactsLines.length > speakerFactsWindowSize) {
                fs.appendFileSync(speakerFactsArchiveFile, speakerFactsLines.slice(0, speakerFactsLines.length - speakerFactsWindowSize).join("\n"));
                fs.writeFileSync(speakerFactsFile, speakerFactsLines.slice(speakerFactsLines.length - speakerFactsWindowSize).join("\n"));
        }

        const existingAgentFacts = fs.readFileSync(agentFactsFile).toString().trim();
        const agentFacts = existingAgentFacts == "" ? "" : existingAgentFacts + "\n"; // If no facts, don't inject
        const agentFactsLines = agentFacts.split('\n'); // Slice the facts and store any more than the window size in the archive
        if (agentFactsLines.length > agentFactsWindowSize) {
                fs.appendFileSync(agentFactsArchiveFile, agentFactsLines.slice(0, agentFactsLines.length - agentFactsWindowSize).join("\n"));
                fs.writeFileSync(agentFactsFile, agentFactsLines.slice(Math.max(0, agentFactsLines.length - agentFactsWindowSize)).join("\n"));
        }
}

function generateContext(speaker, agent, conversation) {
        const {
                speakerFactsFile,
                agentFactsFile,
        } = getFilesForSpeakerAndAgent(speaker, agent);

        const speakerFacts = fs.readFileSync(speakerFactsFile).toString().trim().replaceAll('\n\n', '\n');
        const agentFacts = fs.readFileSync(agentFactsFile).toString().trim().replaceAll('\n\n', '\n');

        // Store paths to main directories for agent
        const rootAgent = rootDir + '/agents/' + agent + '/';
        const rootCommon = rootDir + '/agents/common/';

        // Return a complex context (this will be passed to the transformer for completion)
        return fs.readFileSync(rootCommon + 'context.txt').toString()
                .replaceAll("$room", fs.readFileSync(rootAgent + 'room.txt').toString())
                .replaceAll("$morals", fs.readFileSync(rootCommon + 'morals.txt').toString())
                .replaceAll("$ethics", fs.readFileSync(rootAgent + 'ethics.txt').toString())
                .replaceAll("$personality", fs.readFileSync(rootAgent + 'personality.txt').toString())
                .replaceAll("$needsAndMotivations", fs.readFileSync(rootAgent + 'needs_and_motivations.txt').toString())
                .replaceAll("$exampleDialog", fs.readFileSync(rootAgent + 'dialog.txt').toString())
                .replaceAll("$monologue", fs.readFileSync(rootAgent + 'monologue.txt').toString())
                .replaceAll("$facts", fs.readFileSync(rootAgent + 'facts.txt').toString())
                // .replaceAll("$actions", fs.readFileSync(rootAgent + 'actions.txt').toString())
                .replaceAll("$speakerFacts", speakerFacts)
                .replaceAll("$agentFacts", agentFacts)
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

export async function handleInput(message, speaker, agent, res) {
        console.log("Handling input: " + message);
        if (evaluateTerminalCommands(message, speaker, agent, res)) return;
        checkThatFilesExist(speaker, agent);

        // Get configuration settings for agent
        const { dialogFrequencyPenality,
                dialogPresencePenality,
                factsUpdateInterval,
                useProfanityFilter } = getConfigurationSettingsForAgent(agent);

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

        // Load agent context
        const {
                conversationFile,
                speakerMetaFile
        } = getFilesForSpeakerAndAgent(speaker, agent);

        // Append the speaker's message to the conversation
        fs.appendFileSync(conversationFile, userInput);

        // Parse files into objects
        const meta = JSON.parse(fs.readFileSync(speakerMetaFile).toString());
        const conversation = fs.readFileSync(conversationFile).toString().replaceAll('\n\n', '\n');

        // Increment the agent's conversation count for this speaker
        meta.messages = meta.messages + 1;

        // Archive previous conversation and facts to keep context window small
        archiveConversation(speaker, agent, conversation);
        archiveFacts(speaker, agent, conversation);

        const context = generateContext(speaker, agent, conversation);

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
                fs.appendFileSync(conversationFile, `\n${agent}: ${error}\n`);
                return respondWithMessage(agent, error, res);
        };
        if (useProfanityFilter) {

                // Check agent isn't about to say something offensive
                const { isProfane, response } = await evaluateTextAndRespondIfToxic(speaker, agent, choice.text, true);

                if (isProfane) {
                        fs.appendFileSync(conversationFile, `\n${agent}: ${response}\n`);
                        return respondWithMessage(agent, response, res);
                }
}

        if (meta.messages % factsUpdateInterval == 0) {
                formOpinionAboutSpeaker(speaker, agent);

                const { conversationFile } = getFilesForSpeakerAndAgent(speaker, agent);
                const conversation = fs.readFileSync(conversationFile).toString().trim();
                const conversationLines = conversation.split('\n');

                const speakerConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - (factsUpdateInterval * 2)).join("\n");
                const agentConversationLines = conversationLines.filter(line => line != "" && line != "\n").slice(conversationLines.length - factsUpdateInterval * 2).join("\n");

                summarizeAndStoreFactsAboutSpeaker(speaker, agent, speakerConversationLines);
                summarizeAndStoreFactsAboutAgent(speaker, agent, agentConversationLines + choice.text);

        }
        fs.writeFileSync(speakerMetaFile, JSON.stringify(meta));

        // Write to conversation file
        fs.appendFileSync(conversationFile, `\n${agent}:${choice.text}\n`);
        return respondWithMessage(agent, choice.text, res);
}
