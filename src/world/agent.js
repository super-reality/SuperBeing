import { discord_client } from "../connectors/discord.js";
import { instagram_client } from "../connectors/instagram.js";
import { messenger_client } from "../connectors/messenger.js";
import { reddit_client } from "../connectors/reddit.js";
import { telegram_client } from "../connectors/telegram.js";
import { initTerminal } from "../connectors/terminal.js";
import { twilio_client } from "../connectors/twilio.js";
import { twitter_client } from "../connectors/twitter.js";
import { whatsapp_client } from "../connectors/whatsapp.js";
import { xrengine_client } from "../connectors/xrengine.js";
import { zoom_client } from "../connectors/zoom.js";
import { app, router } from "../utilities/expressServer.js";
import gameObject from "./gameObject.js";

export class agent extends gameObject {
    name = '';

    //Clients
    discord;
    telegram;
    zoom;
    twitter;
    youtube;
    reddit;
    instagram;
    messenger;
    whatsapp;
    twilio;
    terminal;
    harmony;
    xrengine;

    constructor(id, personality, clients) {
        super(id);
        this.name = personality;

        for(let i = 0; i < clients.length; i++) {
            if (clients[i].enabled === 'true') {
                if (clients[i].client === 'discord') {
                    this.discord = new discord_client();
                    this.discord.createDiscordClient(this, clients[i].settings);
                } else if (clients[i].client === 'telegram') {
                    this.telegram = new telegram_client();
                    this.telegram.createTelegramClient(this, clients[i].settings);
                } else if (clients[i].client === 'zoom') {
                    this.zoom = new zoom_client();
                    this.zoom.createZoomClient(this, clients[i].settings);
                } else if (clients[i].client === 'twitter') {
                    this.twitter = new twitter_client();
                    this.twitter.createTwitterClient(this, clients[i].settings);
                } else if (clients[i].client === 'reddit') {
                    this.reddit = new reddit_client();
                    this.reddit.createRedditClient(this, clients[i].settings);
                } else if (clients[i].client === 'instagram') {
                    this.instagram = new instagram_client();
                    this.instagram.createInstagramClient(this, clients[i].settings);
                } else if (clients[i].client === 'messenger') {
                    this.messenger = new messenger_client();
                    this.messenger.createMessengerClient(app, this, clients[i].settings);
                } else if (clients[i].client === 'whatsapp') {
                    this.whatsapp = new whatsapp_client();
                    this.whatsapp.createWhatsappClient(this, clients[i].settings);
                } else if (clients[i].client === 'twilio') {
                    this.twilio = new twilio_client();
                    this.twilio.createTwilioClient(app, router, this, clients[i].settings);
                } else if (clients[i].client === 'terminal') {
                    initTerminal(personality);
                } else if (clients[i].client === 'harmony') {
                    //this.harmony = new harmony_client();
                    //this.harmony.createHarmonyClient(this, clients[i].settings);
                } else if (clients[i].client === 'xr-engine') {
                    this.xrengine = new xrengine_client();
                    this.xrengine.createXREngineClient(this, clients[i].settings);
                }
            }
        }
    }
}

export default agent;