import { clamp } from '../connectors/utils.js';
import { log } from './logger.js';

export class room3d {
    users = {};
    distances = {
        'default': 5,
        'same_topic': 1,
        'conversation': 8.5,
        'talk_to_other': 2,
        'someone_elses_topic': -2,
        'response': 8.5,
        'min': 0,
        'max': 10,
    }
    maxUsersInside = 50;

    constructor(users) {
        for (let i = 0; i < users.length; i++) {
            this.users[users[i]] = this.distances['default']
        }

        setInterval(() => { this.print() }, 10000);
    }

    addUser(user) {
        this.users[user] = this.distances['default']
    }
    removeUser(user) {
        if (this.users[user] === undefined) {
            return;
        }

        delete this.users[user];
    }
    userExists(user) {
        return this.users[user] && this.users[user] !== undefined;
    }

    isFull() {
        return Object.keys(this.users).length >= this.maxUsersInside;
    }
    isEmpty() {
        return Object.keys(this.users).length === 0;
    }

    getUsersDistance(user) {
        return this.users[user];
    }

    userTalkedSameTopic(user) {
        this.users[user] += this.distances['same_topic'];
    }
    userTalkedWithSomeoneElsesTopic(user, otherUser) {
        if (this.agentCanResponse(otherUser)) {
            this.userTalkedSameTopic(user);
            return;
        }

        this.users[user] += this.distances['someone_elses_topic'];
        this.users[user] = clamp(this.users[user], this.distances['min'], this.distances['max']);
    }
    userGotInConversationFromAgent(user) {
        this.users[user] = this.distances['conversation'];
    }
    userPingedSomeoneElse(user) {
        this.users[user] = this.distances['talk_to_other'];
    }

    agentCanResponse(user) {
        return this.users[user] >= this.distances['response'];
    }

    print() {
        for(let i in this.users) {
            log('user: ' + i + ' - distance: ' + this.users[i]);
        }
    }
}

export default room3d;