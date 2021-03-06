import { makeModelRequest } from "../utilities/makeModelRequest.js";
import { sigmoid } from "../utilities/sigmoid.js";
import { readRelationshipMatrix, writeRelationshipMatrix } from "./relationshipMatrix.js";

export async function formOpinionAboutSpeaker(speaker, agent, inputs) {
    const relationshipMatrix = await readRelationshipMatrix(speaker, agent);
    // console.log("relationshipMatrix is", relationshipMatrix);
    // Make huggingface request to BART

    // response is 0 - 1 for each classification

    const alpha = 0.01; // how much better or worse does the bot start to feel about someone?

    const decay = 0.001; // Decay rate of relationships as you chat with agent

    const parameters = {
        candidate_labels: ["Enemy", "Friend", "Student", "Teacher", "Repulsed", "Attracted", "Honest", "Manipulative"]
    }

    // 1. Send hugging face request and get response
    const result = await makeModelRequest(inputs, "facebook/bart-large-mnli", parameters);

    // 2. for each key in response
    // multiply value by sigmoid, then by alpha, then subtract decay
    // 3. add to current relationship matrix
    const resultMatrix = {}
    for (let i = 0; i < result.labels.length; i++) {
        resultMatrix[result.labels[i]] = result.scores[0];
    }

    for (const key of Object.keys(resultMatrix)) {
        relationshipMatrix[key] = Math.max(0, relationshipMatrix[key] + sigmoid(resultMatrix[key]) * alpha - decay);
    }

    // 4. store result in database
    await writeRelationshipMatrix(speaker, agent, JSON.stringify(relationshipMatrix));
}
