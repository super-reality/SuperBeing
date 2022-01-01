const textToSpeech = require("@google-cloud/text-to-speech");

export default function getSpeechForText(){

    const textToSpeechClient = new textToSpeech.TextToSpeechClient({
        projectId: process.env.GOOGLE_PROJECT_ID,
    });
    
    var request = {
        input: {
            text: responseText,
        }
    };
    // // Talk faster when long gpt3 response
    // if (responseText.length > 140) {
    //     request.audioConfig.speakingRate = 1.1;
    // }
    // if (responseText.length > 340) {
    //     request.audioConfig.speakingRate = 1.3;
    // }
    
    const [newresponse] = await textToSpeechClient.synthesizeSpeech(request);
    
    await writeFile(
        path.join(__dirname, `/clips/${uid}.mp3`),
        newresponse.audioContent,
        "binary"
        );
        
    return path.join(__dirname, `/clips/${uid}.mp3`);
    }