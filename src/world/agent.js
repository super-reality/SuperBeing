import gameObject from "./gameObject.js";

export class agent extends gameObject {
    name = '';

    constructor(id, name, clients) {
        super(id);
        this.name = name;

        for(let i = 0; i < clients.length; i++) {
            if (clients[i].enabled) {
            }
        }
    }
}

export default agent;