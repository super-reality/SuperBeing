import axios from 'axios';
import { config } from "dotenv";
import { makeModelRequest } from "./makeModelRequest.js";
import { database } from '../database.js';
import customConfig from './customConfig.js';
import { error } from './logger.js';
import openai from 'openai-api';

config();
let api;

export async function init() {
        api = new openai(process.env.OPENAI_API_KEY ?? customConfig.instance.get('openai_api_key'));
}

export async function makeCompletionRequest(data, speaker, agent, type, engine, log = true) {
        if (customConfig.instance.getBool('use_gptj')) {
                const params = {
                        temperature: 0.8,
                        repetition_penalty: 0.5,
                        max_length: 500,
                        return_full_text: false,
                        max_new_tokens: 150
                }
                const options = {
                        wait_for_model: true
                }
                const response = await makeModelRequest(data.prompt, "EleutherAI/gpt-j-6B", params, options);
                console.log("response", response.body)
                const responseModified = { success: true, choice: { text: response[0].generated_text.split('\n')[0] } };
                return responseModified;
        } else {
                return await makeOpenAIGPT3Request(data, speaker, agent, type, engine);
        }
}
const useDebug = false;
async function makeOpenAIGPT3Request(data, speaker, agent, type, engine, log = true) {
        if(useDebug) return { success: true, choice: { text: "Default response" } };

        try {
                const rr = await api.complete({
                        engine: engine ?? JSON.parse(((await database.instance.getAgentsConfig('common')).toString())).summarizationModel,
                        prompt: data['prompt'],
                        maxTokens: data['max_tokens'],
                        topP: data['top_p'],
                        temperature: data['temperature'],
                        frequencyPenalty: data['frequency_penalty'],
                        presencePenalty: data['presence_penalty'],
                        stop: data['stop']
                })

                if (rr.data.choices && rr.data.choices.length > 0) {
                        let choice = rr.data.choices[0];
                        return { success: true, choice };

                }
        }
        catch (err) {
                console.log('error: ' + err);
                console.log('error 2: ' + err.resp);
                return { success: false };
        }
}