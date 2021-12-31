import { Spine } from "./body/Spine.js";
import { createWebServer } from "./body/webserver.js";
import initializeBrain from "./brain/index.js";
import { createDiscordClient } from './body/discord/discord-client.js'
import dotenv from "dotenv";
dotenv.config();
initializeBrain();

createWebServer();

// new postgres().connect()
// postgres.getInstance.getBannedUsers(true)
// postgres.getInstance.getChatFilterData(true)

const expectedServerDelta = 1000 / 60;
let lastTime = 0;

// @ts-ignore
globalThis.requestAnimationFrame = (f) => {
    const serverLoop = () => {
        const now = Date.now();
        if (now - lastTime >= expectedServerDelta) {
            lastTime = now;
            f(now);
        } else {
            setImmediate(serverLoop);
        }
    }
    serverLoop()
}

let enabled_services = (process.env.ENABLED_SERVICES || '').split(',').map(
    (item) => item.trim().toLowerCase()
).filter(
    (value, index, self) => self.indexOf(value) === index
);

(async function(){  
        // Enable the TCP client
        await new Spine().init();
        // Discord support
        if (enabled_services.includes('discord')) {
            await createDiscordClient();
        }
        // Reddit support
        if (enabled_services.includes('reddit')) {
            await require('./reddit/reddit-client').createRedditClient();
        }
        // TODO: MSN? Facebook? Messenger support
        if (enabled_services.includes('messenger')) {
            await require('./messenger/messenger-client').createMessengerClient();
        }
        // Instagram support
        if (enabled_services.includes('instagram')) {
            await require('./instagram/instagram-client').createInstagramClient();
        }
        // Telegram support
        if (enabled_services.includes('telegram')) {
            await require('./telegram/telegram-client').createTelegramClient();
        }
        // Twilio support for SMS
        if (enabled_services.includes('twilio')) {
            await require('./twilio/twilio-client').createTwilioClient();
        }
        // Whatsapp support
        if (enabled_services.includes('whatsapp')) {
            await require('./whatsapp/whatsapp-client').createWhatsappClient();
        }
        // Twitter support
        if (enabled_services.includes('twitter')) {
            await require('./twitter/twitter-client').createTwitterClient();
        }
        // Harmony support
        if (enabled_services.includes('harmony')) {
            await require('./harmony/harmony-client').createHarmonyClient();
        }
        // XREngine support
        if (enabled_services.includes('xrengine')) {
            await require('./xr/xrengine-client').createXREngineClient();
        }
        // Zoom support
        if (enabled_services.includes('zoom')) {
            await require('./zoom/zoom-client').createZoomClient();
        }
})();

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});
