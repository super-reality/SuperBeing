import customConfig from './customConfig.js';
import { initTerminal } from "../connectors/terminal.js"
import { handleInput } from '../cognition/handleInput.js';
import { initCalendar } from './calendar.js';
import { log } from './logger.js';

export async function runClients() {
    //reads the enabled services from the config and puts them in an array
    let enabled_services = customConfig.instance.get('enabledServices').split(',');
    for(let i = 0; i < enabled_services.length; i++) {
        enabled_services[i] = enabled_services[i].trim().toLowerCase();
    }
    enabled_services = enabled_services.filter(function(elem, pos) {
        return enabled_services.indexOf(elem) == pos;
    });

    if(process.env.BATTLEBOTS){
        const speaker = process.env.SPEAKER?.replace('_', ' ');
        const agent = customConfig.instance.get('agents')?.replace('_', ' ');
        const message = "Hello, " + agent;
        log(speaker + " >>> " + message);
        let ignoreContentFilter = true;
        // Make a function that self-invokes with the opposites
        runBattleBot(speaker, agent, message, ignoreContentFilter);
            
            
        async function runBattleBot(speaker, agent, message, ignoreContentFilter) {
            log(speaker, agent, message, ignoreContentFilter)
            const m = await handleInput(message, speaker, agent, ignoreContentFilter, 'battlebots', '0');
            setTimeout(() => runBattleBot(agent, speaker, m, ignoreContentFilter), 10000);
        }
    }

    //based on which clients are added in the array, it will run its script
    // Discord support
    /*if (enabled_services.includes('discord')) {
        import('../connectors/discord.js').then(module => module.default());
        if (customConfig.instance.getBool('initCalendar')) {
         await initCalendar();
        }
    }
       // Reddit support
    if (enabled_services.includes('reddit')) {
       import('../connectors/reddit.js').then(module => module.default());
    }
    // Facebook Page Messenger
    if (enabled_services.includes('messenger')) {
       import('../connectors/messenger.js').then(module => module.default());
    }
    // Instagram support
    if (enabled_services.includes('instagram')) {
       import('../connectors/instagram.js').then(module => module.default());
    }
    // Telegram support
    if (enabled_services.includes('telegram')) {
        import('../connectors/telegram.js').then(module => module.default());
    }
    // Twilio support for SMS
    if (enabled_services.includes('twilio')) {
       import('../connectors/twilio.js').then(module => module.default(app, router));
    }
    // Whatsapp support
    if (enabled_services.includes('whatsapp')) {
       import('../connectors/whatsapp.js').then(module => module.default());
    }
    // Twitter support
    if (enabled_services.includes('twitter')) {
       import('../connectors/twitter.js').then(module => module.default());
    }
    // Harmony support
    if (enabled_services.includes('harmony')) {
       import('../connectors/harmony.js').then(module => module.default());
    }
    // XREngine support
   if (enabled_services.includes('xrengine')) {
       import('../connectors/xrengine.js').then(module => module.default());
    }
    // Terminal
    if (enabled_services.includes('terminal') || process.env.TERMINAL) {
      const agent = customConfig.instance.get('agents')?.replace('_', ' ') || process.env.AGENT;
      initTerminal(agent);
    }
    // Zoom support
    if (enabled_services.includes('zoom')) {
       await require('./zoom/zoom-client').createZoomClient();
    }*/
}