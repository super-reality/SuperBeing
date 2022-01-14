import axios from 'axios';
import { config } from "dotenv";
import { makeModelRequest } from "./makeModelRequest.js";
import { database } from '../database/database.js';
config();

const useGPTJ = process.env.USE_GPTJ == "true";

export async function makeCompletionRequest(data, speaker, agent, type, engine, log = true) {
        if (useGPTJ) {
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

                const responseModified = { success: true, choice: { text: response[0].generated_text.split('\n')[0] } };
                return responseModified;
        } else {
                return await makeOpenAIGPT3Request(data, speaker, agent, type, engine);
        }
}

async function makeOpenAIGPT3Request(data, speaker, agent, type, engine, log = true) {
        const API_KEY = process.env.OPENAI_API_KEY;
        const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
        };
        try {
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
        catch (error) {
                console.log("Error is", error);
                return { success: false };
        }
}