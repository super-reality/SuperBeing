import { config } from "dotenv";
import fetch from "node-fetch";
import { IsJsonString } from "../connectors/utils.js";
import customConfig from "./customConfig.js";
import { error } from "./logger.js";
config();

//Model Request using the Hugging Face API (models can be found at -> https://huggingface.co/models)
export async function makeModelRequest(inputs, model, parameters = {}, options = {use_cache: false, wait_for_model: true}) {
        try {
                console.log("customConfig.instance.get('hf_api_token') is ", customConfig.instance.get('hf_api_token').replace(" ", "_"))
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                        headers: { "Authorization": `Bearer ${customConfig.instance.get('hf_api_token').replace(" ", "_")}` },
                        method: "POST",
                        body: JSON.stringify({ inputs, parameters, options })
                });
                return await response.json();
        }
        catch (err) {
                error(err);
                return { success: false };
        }
}