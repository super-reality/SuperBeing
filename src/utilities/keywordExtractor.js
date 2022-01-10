import keyword_extractor from "keyword-extractor";
import { makeWeaviateRequest } from "../connectors/wikipedia.js";
import { makeModelRequest } from "./makeModelRequest.js";

export async function keywordExtractor(input) {
    const keywords = []

    const res = keyword_extractor.extract(input, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
    });
    const result = await makeModelRequest(input, "flair/pos-english");

    for (let i = 0; i < res.length; i++) {
        for (let j = 0; j < result.length; j++) {
            if (result[j].word === res[i]) {
                if (result[j].entity_group === 'NN' || result[j].entity_group === 'NNS') {
                    keywords.push(res[i]);
                    break;
                }
            }
        }
    }
    
    for(let i = 0; i < keywords.length; i++) {
        const weaviateResponse = await makeWeaviateRequest(keywords[i]);
        if (weaviateResponse && weaviateResponse.Paragraph.length > 0) {
            keywords[i] = { word: keywords[i], info: weaviateResponse.Paragraph[0].content };
        }
    }
    return keywords;
}
export default keywordExtractor;