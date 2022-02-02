import { randomInt } from "../connectors/utils.js";
import { database } from "../database.js";
import agent from "./agent.js";
import gameObject from "./gameObject.js";

export class world extends gameObject { 
    id = -1;
    objects = {};

    constructor(_id) {
        super(_id);
    }

    async onCreate() {
        super.onCreate();
        const agents = await database.instance.getAgentInstances();
        
        for (let i = 0; i < agents.length; i++) {
            if (agents[i]._enabled) {
                const _agent = new agent(this.generateId(), agents[i].personality, JSON.parse(agents[i].clients));
                this.objects[i] = _agent;
            }
        }
    }

    async onDestroy() {
        super.onDestroy();
    }

    async onUpdate() {
        super.onUpdate();
        for (let i in this.objects) {
            await this.objects[i].onUpdate();
        }
    }

    async onLateUpdate() {
        super.onUpdate();
        for (let i in this.objects) {
            await this.objects[i].onLateUpdate();
        }
    }

    async addObject(obj) {
        let id = randomInt(0, 10000);
        while (this.objectExists(id)) {
            id = randomInt(0, 10000);
        }

        this.objects[id] = obj;
        await obj.onCreate();
        return id;
    }
    async removeObject(id) {
        if (this.objectExists(id)) {
            await this.objects[id].onDestroy();
            delete this.objects[id];
        }
    }
    getObject(id) {
        return this.objects[id];
    }
    objectExists(id) {
        return this.objects[id] !== undefined && this.objects[id] === null;
    }
    generateId() {
        let id = randomInt(0, 10000);
        while (this.objectExists(id)) {
            id = randomInt(0, 10000);
        }
        return id;
    }
}

export default world;