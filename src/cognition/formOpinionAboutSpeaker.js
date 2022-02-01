import { database } from "../database.js";
import { makeModelRequest } from "../utilities/makeModelRequest.js";
import { writeRelationshipMatrix, readRelationshipMatrix } from "./relationshipMatrix.js";

export async function formOpinionAboutSpeaker(speaker, agent, input) {
    const relationshipMatrix = await readRelationshipMatrix(speaker, agent);

    // Make huggingface request to BART

    // response is 0 - 1 for each classification

    const alpha = 0.01; // how much better or worse does the bot start to feel about someone?

    const decay = 0.0001;

    // TODO:
    const params = {
        candidateLabels: "Enemy, Friend, Student, Teacher, Repulsed, Attracted, Honest, Manipulative"
    }

    const options = {
        wait_for_model: true
    }

    // 1. Send hugging face request and get response
    const result = await makeModelRequest(input, "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli", params, options);
    console.log("Result");
    console.log(result);

    // 2. for each key in response
    // multiply value by sigmoid, then by alpha, then subtract decay
    // 3. add to current relationship matrix

    for (const key in Object.keys(result)) {
        relationshipMatrix[key] = Math.floor(relationshipMatrix[key] + sigmoid(result[key]) * alpha - decay);
    }

    console.log("New relationshipMatrix");
    console.log(relationshipMatrix)

    // 4. store result in database
    await writeRelationshipMatrix(speaker, agent, JSON.stringify(meta));
}
