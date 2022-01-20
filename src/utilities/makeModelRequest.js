import { config } from "dotenv";
import fetch from "node-fetch";
import customConfig from "./customConfig.js";
config();

//Model Request using the Hugging Face API (models can be found at -> https://huggingface.co/models)
export async function makeModelRequest(inputs, model, parameters = {}, options = {use_cache: false, wait_for_model: true}) {
        try {
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                        headers: { "Authorization": `Bearer ${customConfig.instance.get('hf_api_token')}` },
                        method: "POST",
                        body: JSON.stringify({ inputs, parameters, options })
                });
                return await response.json()
        }
        catch (error) {
                console.log("Error is", error);
                return { success: false };
        }
}