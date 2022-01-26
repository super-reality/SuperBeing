import fs from "fs";
import inquirer from 'inquirer';
import { rootDir } from "../utilities/rootDir.js";
import { handleInput } from "../cognition/handleInput.js";
import { createWikipediaAgent } from "../connectors/wikipedia.js";
import { defaultAgent } from "../index.js";
import customConfig from "../utilities/customConfig.js";

export var prompt = inquirer.createPromptModule();

export const namePrompt = [
        {
                type: 'input',
                name: "Name",
                message: "What is your name?",
        }
];

export const states = {
        READY: "READY",
        WAITING: "WAITING",
        THINKING: "THINKING"
};

let currentState = states.READY;

export function initTerminal(agent) {
        let currentAgent = agent;

        function startloop(speaker) {
                // Start prompt loop
                setInterval(() => {

                        // Are we thinking? return
                        // Are we waiting for input? return
                        if (currentState != states.READY) return;

                        if(!currentAgent){
                                const questions = [
                                        {
                                                type: 'input',
                                                name: "Input",
                                                message: `No agent found. You can generate one by typing in a person, place or thing >>> `
                                        }
                                ];
                                const creationQuestions = [
                                        {
                                                type: 'personality',
                                                name: "Personality",
                                                message: `If you'd like to add some custom personality notes, you can >>> `
                                        },
                                        {
                                                type: 'facts',
                                                name: "Facts",
                                                message: `Add any facts about the agent, if you'd like >>> `
                                        }
                                ]
                                prompt(questions).then(async (text) => {
                                        const newAgent = text.Input.trim();

                                        //check if agent exists
                                        if(fs.existsSync(rootDir + "/agents/" + text.Input)){
                                                // if they do, set current agent
                                                currentAgent =newAgent;
                                                currentState = states.READY;
                                                return;
                                        }

                                        prompt(creationQuestions).then(async (text) => {
                                                //if not, create it
                                                let out = await createWikipediaAgent(speaker, newAgent, text.Personality, text.Facts);
                                                let set = false;
                                                while (out === null) {
                                                    out = await createWikipediaAgent('Speaker', defaultAgent, "", "");
                                                    currentAgent = defaultAgent;
                                                    set = true;
                                                }
                                                if (!set) {
                                                        currentAgent = newAgent
                                                }
                                                currentState = states.READY;
                                        });
                                });
                        } else {
                                const questions = [
                                        {
                                                type: 'input',
                                                name: "Input",
                                                message: `${speaker} >>>`
                                        }
                                ];
                                prompt(questions).then(async (text) => {
                                        await handleInput(text.Input, speaker, currentAgent, null, 'terminal', '0');
                                        currentState = states.READY;
                                });
                        }

                        currentState = states.WAITING;
                }, 50);
        }

        setTimeout(() => {
                // If speaker was provided, start the request loop
                if (process.env.SPEAKER?.replace('_', ' ')) {
                        startloop(process.env.SPEAKER?.replace('_', ' '));
                }
                // If no speaker was provided, prompt the user
                else {
                        prompt(namePrompt).then((text) => {
                                // Check for OpenAI key, this will help people who clone it to get started
                                if (!customConfig.instance.get('openai_api_key') || customConfig.instance.get('openai_api_key').includes("XXXXX")) {
                                        return console.error("Please create a .env file in root of this directory and add your OpenAI API key to it");
                                }

                                startloop(text.Name);
                        });
                }
        }, 100)
}