import keyword_extractor from "keyword-extractor";
import { makeWeaviateRequest } from "../connectors/wikipedia.js";
import { database } from "../database/database.js";
import { makeModelRequest } from "./makeModelRequest.js";

export async function keywordExtractor(input, agent) {
    const keywords = []

    const res = keyword_extractor.extract(input, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
    });
    const result = await makeModelRequest(input, "flair/pos-english");

    const skw = database.instance.getIgnoredKeywords(agent);

    for (let i = 0; i < res.length; i++) {
        for (let j = 0; j < result.length; j++) {
            if (result[j].word === res[i]) {
                console.log(res[i] + ' - ' + skw.includes(res[i]));
                if (skw.includes(res[i])) {
                    continue;
                }

                if (result[j].entity_group === 'NN' || result[j].entity_group === 'NNS') {
                    keywords.push(res[i]);
                    break;
                }
            }
        }
    }
    
    let totalLength = 0;
    const respp = [];
    for(let i = 0; i < keywords.length; i++) {
        const weaviateResponse = await makeWeaviateRequest(keywords[i]);

        if (weaviateResponse.Paragraph.length > 0) {
            const sum = await makeModelRequest(weaviateResponse.Paragraph[0].content, "facebook/bart-large-cnn");
            console.log(sum);
            if (sum && sum.length > 0) {
                totalLength += sum[0].summary_text.length;
                if (totalLength > 1000) {
                    return keywords;
                }
                respp.push({ word: keywords[i], info: sum[0].summary_text });
            }
        }
    }
    return respp;
}
export default keywordExtractor;

export function simpleExtractor(input) {
    return keyword_extractor.extract(input, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
    });
}