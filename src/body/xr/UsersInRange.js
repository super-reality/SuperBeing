export const UsersInRange = {}
export const UsersInHarassmentRange = {}
export const UsersInIntimateRange = {}
export const UsersLookingAt = {}

export function isInRange(user) {
    return UsersInRange[user] !== undefined || UsersInHarassmentRange[user] !== undefined || UsersInIntimateRange[user] !== undefined
}