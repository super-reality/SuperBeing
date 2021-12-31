import { Tedis } from 'tedis'


export class redisDb {
    static getInstance;
    tedis = undefined

    constructor() {
        this.tedis = new Tedis()
        redisDb.getInstance = this
        console.log('redis initialized')
    }

    async setValue(key, value) {
        if (await this.hasKey(key)) return
        if (typeof value === 'object') value = JSON.stringify(value)
        await this.tedis.set(key, value)
    }
    async getValue(key) {
        if (await this.hasKey(key)) return await this.tedis.get(key) + ''
        else return undefined
    }
    async getKeys(key_) {
        return await this.tedis.keys(key_ + '*')
    }
    async deleteKey(key) {
        if (await this.hasKey(key))
        await this.tedis.del(key)
    }

    async hasKey(key) {
        return await this.tedis.exists(key)
    }
}