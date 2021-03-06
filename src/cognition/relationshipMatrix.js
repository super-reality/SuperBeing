import { database } from "../database.js";

export async function writeRelationshipMatrix(speaker, agent, updateMatrix) {
    database.instance.setRelationshipMatrix(speaker, agent, updateMatrix);
}

export async function readRelationshipMatrix(speaker, agent) {
    // Check if we have an opinion yet
    // If not, form one and save the file
    // Read personality
    let relationshipMatrix = await database.instance.getRelationshipMatrix(speaker, agent);

    if (!relationshipMatrix)
        return {
            Enemy: 0,
            Friend: 0,
            Student: 0,
            Teacher: 0,
            Repulsed: 0,
            Attracted: 0,
            Honest: 0,
            Manipulative: 0,

            EnemyLimit: 1,
            FriendLimit: 1,
            StudentLimit: 1,
            TeacherLimit: 1,
            RepulsedLimit: 1,
            AttractedLimit: 1
        }

    return relationshipMatrix
}