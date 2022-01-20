import { database } from "../database/database.js";

//The config of the server, which gets the data from the database, it replaces most of .env variables for easier use
export class customConfig {
    static instance;

    configs = {};

    constructor(configs) {
        this.configs = configs;
        customConfig.instance = this;
    }

    get(key) {
        return this.configs[key];
    }
    getInt(key) {
        return parseInt(this.configs[key]);
    }
    getFloat(key) { 
        return parseFloat(this.configs[key]);
    }
    getBool(key) {
        return this.configs[key].toLowerCase() === 'true';
    }
    async set(key, value) {
        this.configs[key] = value;
        await database.instance.setConfig(key, value);
    }

    getAll() {
        return this.configs;
    }
    allToArray() {
        const res = [];
        for (let key in this.configs) {
            res.push({ key: key, value: this.configs[key]});
        }
        return res;
    }
}

export default customConfig;