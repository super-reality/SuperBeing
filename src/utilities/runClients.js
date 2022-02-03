import customConfig from './customConfig.js';
import { initTerminal } from "../connectors/terminal.js"
import { handleInput } from '../cognition/handleInput.js';
import { initCalendar } from './calendar.js';
import { log } from './logger.js';

export async function runClients() {
    if(process.env.BATTLEBOTS){
        const speaker = process.env.SPEAKER?.replace('_', ' ');
        const agent = customConfig.instance.get('agents')?.replace('_', ' ');
        const message = "Hello, " + agent;
        log(speaker + " >>> " + message);
        let ignoreContentFilter = true;
        // Make a function that self-invokes with the opposites
        runBattleBot(speaker, agent, message, ignoreContentFilter);
    }
}
         
async function runBattleBot(speaker, agent, message, ignoreContentFilter) {
    log(speaker, agent, message, ignoreContentFilter)
    const m = await handleInput(message, speaker, agent, ignoreContentFilter, 'battlebots', '0');
    setTimeout(() => runBattleBot(agent, speaker, m, ignoreContentFilter), 10000);
}