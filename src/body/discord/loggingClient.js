import * as net from 'net'
import { client } from './discord-client.js'

let Spine

export function initClient(ip, port) {
    if (process.env.LOAD_DISCORD_LOGGER === 'True') {
        console.log('connecting')
        Spine = new net.Socket()
        Spine.connect(port, ip, function() {
            console.log('connected')
        })
        Spine.on('data', function(data) {
            if (client !== undefined && client.log_user !== undefined) {
                client.log_user.send('log: ' + data)
            }
        })
    }
}