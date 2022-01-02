import { rootDir } from "../utilities/rootDir.js";

import fs from 'fs';

// TODO: Should be able to completely remove this file and replace with sql calls

export default function getFilesForSpeakerAndAgent(speaker, agent){
    return {
        conversationDirectory: rootDir + "/conversations/" + agent,
        conversationFile: rootDir + "/conversations/" + agent + "/" + speaker + "/conversation.txt",
        conversationArchiveFile: rootDir + "/conversations/" + agent + "/" + speaker + "/conversation_archive.txt",
        speakerModelFile: rootDir + "/conversations/" + agent + "/" + speaker + "/model.txt",
        speakerFactsArchiveFile: rootDir + "/conversations/" + agent + "/" + speaker + "/speaker_facts_archive.txt",
        speakerFactsFile: rootDir + "/conversations/" + agent + "/" + speaker + "/speaker_facts.txt",
        agentFactsArchiveFile: rootDir + "/conversations/" + agent + "/agent_facts_archive.txt",
        agentFactsFile: rootDir + "/conversations/" + agent + "/agent_facts.txt",
        speakerModelArchive: rootDir + "/conversations/" + agent + "/" + speaker + "/model_archive.txt",
        speakerMetaFile: rootDir + "/conversations/" + agent + "/" + speaker + "/meta.json",
        relationshipMatrix: rootDir + "/agents/" + agent + "/relationship_matrix.txt",
        personalityQuestions:  rootDir + "/agents/common/personality_questions.json",
        speakerProfaneResponsesFile: fs.existsSync(rootDir + "/agents/" + agent + "/speaker_profane_responses.txt") ?
            rootDir + "/agents/" + agent + "/speaker_profane_responses.txt" : rootDir + "/agents/common/speaker_profane_responses.txt",
        sensitiveResponsesFile: fs.existsSync(rootDir + "/agents/" + agent + "/sensitive_responses.txt") ?
        rootDir + "/agents/" + agent + "/sensitive_responses.txt" : rootDir + "/agents/common/sensitive_responses.txt",
        agentProfaneResponsesFile: fs.existsSync(rootDir + "/agents/" + agent + "/agent_profane_responses.txt") ?
            rootDir + "/agents/" + agent + "/agent_profane_responses.txt" : rootDir + "/agents/common/agent_profane_responses.txt",
        ratingFile: fs.existsSync(rootDir + "/agents/" + agent + "/rating.txt") ?
            rootDir + "/agents/" + agent + "/rating.txt" : rootDir + "/agents/common/rating.txt"
    }
}