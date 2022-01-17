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
    set(key, value) {
        this.configs[key] = value;
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