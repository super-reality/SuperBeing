import axios from 'axios';
import { config } from "dotenv";
import { makeModelRequest } from "./makeModelRequest.js";
import { database } from '../database.js';
import customConfig from './customConfig.js';
import { error } from './logger.js';
config();

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
        const API_KEY = process.env.OPENAI_API_KEY ?? customConfig.instance.get('openai_api_key')
        const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
        };
        try {
                if (typeof data.frequency_penalty === 'string') {
                        data.frequency_penalty = parseFloat(data.frequency_penalty);
                }
                if (typeof data.presence_penalty === 'string') {
                        data.presence_penalty = parseFloat(data.presence_penalty);
                }
                if (typeof data.temperature === 'string') {
                        data.temperature = parseFloat(data.temperature);
                }
                if (typeof data.max_tokens === 'string') {
                        data.max_tokens = parseFloat(data.max_tokens);
                }
                if (typeof data.top_p === 'string') {
                        data.top_p = parseFloat(data.top_p);
                }

                const gptEngine = engine ?? JSON.parse(((await database.instance.getAgentsConfig('common')).toString())).summarizationModel;
                const resp = await axios.post(
                        `https://api.openai.com/v1/engines/${gptEngine}/completions`,
                        data,
                        { headers: headers }
                );

                if (resp.data.choices && resp.data.choices.length > 0) {
                        let choice = resp.data.choices[0];
                        return { success: true, choice };

                }
        }
        catch (err) {
                error(err);
                return { success: false };
        }
}