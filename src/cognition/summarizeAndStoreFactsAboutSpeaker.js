import { database } from "../database/database.js";
import { makeCompletionRequest } from "../utilities/makeCompletionRequest.js";
import { log } from "../utilities/logger.js";

export async function summarizeAndStoreFactsAboutSpeaker(speaker, agent, input) {
    const { summarizationModel } = JSON.parse((await database.instance.getAgentsConfig('common')).toString());

    const speakerFactSummarizationPrompt = ((await database.instance.getSpeakerFactSummarization('common'))).toString().replace("\n\n", "\n");
    
    // Take the input and send out a summary request
    let prompt = speakerFactSummarizationPrompt.replaceAll( "$speaker", speaker).replaceAll( "$agent", agent).replaceAll( "$example", input);
    log("speakerFactSummarizationPrompt", prompt);

    let data = {
        "prompt": prompt,
        "temperature": 0.3,
        "max_tokens": 20,
        "top_p": 1,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0,
        "stop": ["\"\"\"", "\n"]
    };

    let { success, choice } = await makeCompletionRequest(data, speaker, agent, "speaker_facts", summarizationModel);
    if (success && choice.text != "" && !choice.text.includes("no facts")) {
        log("setSpeakersFacts", choice.text);
        await database.instance.setSpeakersFacts(agent, speaker, (speaker + ": " + choice.text + "\n").replace("\n\n", "\n"));
    }
}

