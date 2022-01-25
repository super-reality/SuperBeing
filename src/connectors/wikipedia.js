import glob from "glob";
import weaviate from "weaviate-client";
import wiki from 'wikipedia';
import { database } from '../database/database.js';
import {
  makeCompletionRequest
} from "../utilities/makeCompletionRequest.js";

const client = weaviate.client({
  scheme: "http",
  host: "semantic-search-wikipedia-with-weaviate.api.vectors.network:8080/",
});

//Creates a new agent based on its Wikipedia article
export async function createWikipediaAgent(speaker, name, personality, facts) {
  try {   
          //gets the info from the wikipedia article, if the agent name can't be found it returns null, in order to send the default agent
          let out = null;
          try {
            out = await searchWikipedia(name);
          } catch (e) {
            console.log(e);
            return null;
          }

          //const type = await namedEntityRecognition(out.result.title);

          // create a constant called name which uses the value of nameRaw but removes all punctuation
          // const name = nameRaw.replace(/[^\w\s]/gi, '');
          console.log("out is ", out);
          if (out.result.extract == "" || out.result.extract == null) {
                  return console.log("Error, couldn't find anything on wikiedia about " + name);
          }
          
          const factSourcePrompt = `The following are facts about ${name}\n`;
          const factPrompt = factSourcePrompt + out.result.extract + "\n" + facts;
  
          const personalitySourcePrompt = `Based on the above facts, the following is a description of the personality of an anthropomorphized ${name}:`;

          database.instance.setDefaultEthics(name);
          database.instance.setDefaultNeedsAndMotivations(name);
          database.instance.setRelationshipMatrix(name, await database.instance.getRelationshipMatrix('common'));
          
          let data = {
                  "prompt": factPrompt + "\n" + personalitySourcePrompt,
                  "temperature": 0.9,
                  "max_tokens": 300,
                  "top_p": 1,
                  "frequency_penalty": 0.0,
                  "presence_penalty": 0.0,
                  "stop": ["\"\"\"", `${speaker}:`, '\n']
          };
  
          let res = await makeCompletionRequest(data, speaker, name, "personality_generation", "davinci", false);
  
          if (!res.success) {
                  return console.log("Error: Failed to generate personality, check GPT3 keys");
          }
  
          console.log("res.choice.text")
          console.log(res);
  
          database.instance.setPersonality(name, personalitySourcePrompt + '\n' + personality + '\n' + res.choice.text);
  
          const dialogPrompt = `The following is a conversation with ${name}. ${name} is helpful, knowledgeable and very friendly\n${speaker}: Hi there, ${name}! Can you tell me a little bit about yourself?\n${name}:`;
  
          data = {
                  "prompt": factPrompt + "\n" + personalitySourcePrompt + "\n" + res + "\n" + dialogPrompt,
                  "temperature": 0.9,
                  "max_tokens": 300,
                  "top_p": 1,
                  "frequency_penalty": 0.0,
                  "presence_penalty": 0.0,
                  "stop": ["\"\"\"", `${speaker}:`, '\n']
          };
  
          res = await makeCompletionRequest(data, speaker, name, "dialog_generation", "davinci", false);
          console.log("res.choice.text (2)")
          console.log(res);
  
          await database.instance.setDialogue(name, dialogPrompt + res.choice?.text);
          await database.instance.setAgentFacts(name, factPrompt); 
          await database.instance.setAgentExists(name); 
  
          return out;
  } catch (error) {
          console.log("Error: ", error);
  }
          return {}
  
  }

export const searchWikipedia = async (keyword) => {

  console.log("Searching wikipedia for ", keyword);

  // if keywords contains more than three words, summarize with GPT-3
  if (keyword.trim().split(" ").length > 3) {
    const data = {
      "prompt": keyword + "\n\nKeywords:",
      "temperature": 0.3,
      "max_tokens": 60,
      "top_p": 1,
      "frequency_penalty": 0.8,
      "presence_penalty": 0,
      "stop": ['\n']
    };

    const {
      success,
      choice
    } = await makeCompletionRequest(data, null, null, "conversation");
    if (success) {
      keyword = choice.text;
    }
  }

  // Search for it, and accept suggestion if there is one
  const searchResults = await wiki.search(keyword);
  console.log(searchResults);
  // If the first result contains the keyword or vice versa, probably just go with it
  if (searchResults.results[0] && (searchResults.results[0] .title.toLowerCase().includes(keyword.toLowerCase()) ||
    keyword.toLowerCase().includes(searchResults.results[0] .title.toLowerCase()))) {
    keyword = searchResults.results[0].title;
  } else  if (searchResults.suggestion) {
    keyword = searchResults.suggestion;
  } else if (searchResults[0] != undefined) {
    keyword = searchResults[0].title;
  }

  // TODO: If certainty is below .92...
  // Fuzzy match and sort titles

  let filePath = null;

  glob(keyword + '.*', (err, files) => {
    if (err) {
      console.log(err);
    } else {
      // a list of paths to javaScript files in the current working directory
      console.log(files);
      filePath = files[0];
    }
  });

  // if (!filePath) {
  //   console.log("Trying to load file");
  //   try {
  //     const response = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=original&titles=${keyword}`);
  //     if (response && response.data.query.pages.filter(page => page.original)[0]) {
  //       const page = response.data.query.pages.filter(page => page.original)[0];
  //       console.log("Getting file");
  //       const file = await axios.get(page.original.source, {
  //         responseType: 'stream'
  //       });
  //       // store the image from the response in /images as <keyword>.jpg using fs
  //       const newFilePath = path.resolve(rootDir, "images", keyword + "." + page.original.source.split('.').pop());
  //       console.log("New file path is", newFilePath);
  //       // const writer = fs.createWriteStream(path.resolve(rootDir, "images", newFilePath));
  //       console.log("Created writer");
  //       // file.data.pipe(writer)
  //       filePath = newFilePath;
  //       // {"batchcomplete":true,"query":{"pages":[{"pageid":210458,"ns":0,"title":"Waffle","original":{"source":"https://upload.wikimedia.org/wikipedia/commons/5/5b/Waffles_with_Strawberries.jpg","width":2592,"height":1944}}]}}
  //     }
  //   } catch (error) {
  //     console.log("Error is " + error);
  //   }
  // }
  // Get wikipedia article for first result and cache

  // clubhouse?


  // TODO: Check if we already have the image for the keyword before doing all that hard stuff
  // Return object containing hasImage: true and the file URI
  // Change the places that call this function to reflect payload
  // Handle sending image with response to this initialization
  // Make sure we're actually doing something with response in client to parse image and load it
  // Only load or send image for platforms where it matters
  
  if(searchResults.results[0] ?.title?.trim().toLowerCase() === keyword.trim().toLowerCase() ){
    const result = await lookUpOnWikipedia(keyword);
    return {
      result,
      filePath
    }
  }

  console.log("Making weaviate request");
   // if it's not immediately located, request from weaviate
  const weaviateResponse = await makeWeaviateRequest(keyword);
  if(weaviateResponse?.Paragraph[0]?.inArticle[0]?.title){
  const result = await lookUpOnWikipedia(weaviateResponse?.Paragraph[0]?.inArticle[0]?.title);
  console.log("result", result);
  return {
    result,
    filePath
  }
} else return {
  result: keyword,
  filePath: ""
}
}

export const makeWeaviateRequest = async (keyword) => {
  const res = await client.graphql
    .get()
    .withNearText({
      concepts: [keyword],
      certainty: 0.75,
    })
    .withClassName("Paragraph")
    .withFields("title content inArticle { ... on Article {  title } }")
    .withLimit(3)
    .do();
  // console.log("res is", res.data.Get.Paragraph[0]);

  if (res.data.Get !== undefined) {
    return res.data.Get;
  }
  return;
};


export async function lookUpOnWikipedia(subject) {
  try {
    if (await database.instance.wikipediaDataExists(subject)) {
      return JSON.parse(await database.instance.getWikipediaData(subject));
    } else {
      console.log('Data doesn\'t yet exist');
    }

    // if it doesn't, fetch it from wikipedia and save it to the file
    const {
      title,
      displaytitle,
      description,
      extract
    } = await wiki.summary(subject);
    console.log("Got summary", title)
    const summary = {
      title,
      displaytitle,
      description,
      extract
    };
    console.log("Summary is", summary)
    // create a directory recursively at data/wikipedia/ if it doesn't exist

    await database.instance.addWikipediaData(subject, JSON.stringify(summary));

    return summary;

  } catch (error) {
    console.log(error);
  }
  console.log("Finished looking up on wikipedia")
}