import { randomInt } from "../connectors/utils.js";
import { database } from "../database.js";
import agent from "./agent.js";
import { initAgentsLoop } from "./agentsLoop.js";
import gameObject from "./gameObject.js";
import time from "./time.js";

export class world extends gameObject { 
    static instance;
    id = -1;
    objects = {};

    constructor() {
        super(0);
        world.instance = this;
        new time();
        this.onCreate();
    }

    async onCreate() {
        super.onCreate();
        const agents = await database.instance.getAgentInstances();
        
        for (let i = 0; i < agents.length; i++) {
            if (agents[i]._enabled) {
                const _agent = new agent(agents[i].id, agents[i].personality, JSON.parse(agents[i].clients));
                this.objects[i] = _agent;
            }
        }

        initAgentsLoop(async (id) => {
            this.updateInstance(id);
        }, async (id) => {
            this.lateUpdateInstance(id);
        })
    }

    async updateInstance(id) {
        for(let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].id === id) {
                this.objects[i].onUpdate();
                return;
            }
        }
    }
    async lateUpdateInstance(id) {
        for(let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].id === id) {
                this.objects[i].onLateUpdate();
                return;
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