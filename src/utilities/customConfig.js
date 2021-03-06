import { database } from "../database.js";

//The config of the server, which gets the data from the database, it replaces most of .env variables for easier use
export class customConfig {
    static instance;

    configs = {};

    constructor(configs) {
        this.configs = configs;
        customConfig.instance = this;
    }

    get(key) {
        return this.configs[key]?.trim();
    }
    getInt(key) {
        const value = this.configs[key];
        if (!value || value === undefined || value.length <= 0) {
            return undefined;
        }
        return parseInt(value);
    }
    getFloat(key) { 
        const value = this.configs[key].trim();
        if (!value || value === undefined || value.length <= 0) {
            return undefined;
        }
        return parseFloat(value);
    }
    getBool(key) {
        const value = this.configs[key]?.trim();
        if (!value || value === undefined || value.length <= 0) {
            return false;
        }
        return value.toLowerCase() === 'true';
    }
    async set(key, value) {
        this.configs[key] = value.trim();
        await database.instance.setConfig(key, value);
    }
    async delete(key) {
        if (this.configs[key] && this.configs[key] !== undefined) {
            delete this.configs[key];
            await database.instance.deleteConfig(key);
        }
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