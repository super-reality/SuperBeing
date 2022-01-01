# About

[SuperBeing](https://github.com/super-reality/SuperBeing) a complete AI agent who can access all of your favorite AI services.

[Made in partnership with **XR Foundation** to make free, open agents for the Verse.](https://xrfoundation.io)

SuperBeing supports:

* [Discord](https://discord.com/) (Servers, Threads, DMs)
* [Twitter](https://twitter.com/) (Tweets, DMs)
* [Instagram](https://www.instagram.com/) (DMs)
* [Messenger](https://www.messenger.com/) (DMs - Facebook Pages)
* [Reddit](https://reddit.com/) (Posts, Messages)
* [Telegram](https://telegram.org/) (Groupmessages , DMs)
* [Twilio](https://www.twilio.com/) (SMS)
* [WhatsAPP](https://www.whatsapp.com/) (untested)
* [XR-Engine](https://github.com/XRFoundation/XREngine) (chat, also supports commands and events from other users - proximity, emotions, etc.)
* [Zoom](https://www.zoom.us/) (unfinished, supports video group calls).

The Client is using either the API for connecting to the different services like [Discord](https://discord.com/), [Messenger](https://www.messenger.com/), etc, or [Puppeteer](https://github.com/puppeteer/puppeteer) for emulating the browser to connect to [XR-Engine](https://github.com/XRFoundation/XREngine) and [Zoom]((https://www.zoom.us/)).

## Requirements

* [Node.JS](https://nodejs.org/en/) - version 16 or more
* [NPM](https://www.npmjs.com/) - will be installed through `Node.JS`
* [Docker](https://www.docker.com/) - makes the setup easy through using the containers

# Setup 

## Docker (WSL/Linux): 

* [Install Docker](https://docs.docker.com/get-docker/)
* [Install `docker-compose`](https://docs.docker.com/compose/install/)
* Clone the repository and switch to its directory
* Run the `docker-compose build` command to build the containers
* In order to run the image you can use `docker-compose up` (if in Putty you can use `docker-compose up -d` to keep the image open after closing)
* In order to close the image you can either use docker-compose down or `Ctrl + Alt + C`

## Windows 10:

* Install the requirements ([Node.js](https://nodejs.org/en/), [NPM]()https://npmjs.com/
* Clone the repository (`git clone git@github.com:super-reality/SuperBeing.git`)
* Run `npm install`
* Rename the `.env.default` to `.env` (or make a new copy) and update the variables
* Install PostgreSQL, setup the user and the database according to the parameters starting with `PG*` in an `.env` file and run the `init.sql` (root folder)
* Run the bot in using `npm run start` in the command line

## Without Docker (WSL/Linux): 

* Install the requirements (`Node.JS`, [`NPM`](https://www.npmjs.com/))
* Run `npm install`
* Install `Postgres`, setup the user and the database and run the `init.sql` (root folder)
* Rename the `.env.default` to `.env` (or make a new copy) and update the variables
* Run the bot in using `npm run` in the command line

#### How to install Postgres manual - without docker
* `sudo apt-get install postgresql` - installs the postgresql service on the machine
* `sudo passwd postgres` - the user postgres is created, with this command you can set a password, as the service runs on this user, close and reopen terminal if on WSL otherwise reboot
* `sudo service postgresql start` - to start the postgres service
* `sudo -u postgres psql` - to connect to postgres as the postgres user - the user can be changed to a custom user 
* if you want to run postgres on a different user you can use this command: `sudo -u postgres createuser <username>`
* to change the user password you will need to connect to postgres as the main user (postgres) and run: `alter user <username> with encrypted password '<password>';`
* use `create database <dbname>;` to create the new database for the bot
* to grant all privilages to the new user, run: `grant all privileges on database <dbname> to <username> ;`
* then use `\c <dbname>`
* finally run the `init.sql` file that can be located in the root folder in order to create the database
* Here you can find more [detailed instructions](https://harshityadav95.medium.com/postgresql-in-windows-subsystem-for-linux-wsl-6dc751ac1ff3)

#### Selecting active clients

**Attention**: applies to the installed clients only.

Open `src/index.js` and comment/uncomment the clients you need, if you need a client that uses a web server ([Twilio](https://www.twilio.com/), messenger), go to src/webserver.js and uncomment line 17, otherwise you can leave it commented.

#### Selecting available clients

Go to the src/index.js and comment/uncomment the needed clients, like this.

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_287.png)

#### Port forwarding (used for Twilio)

Port forwarding is needed in order to enable public access to a service, like the database, web server or the bot manager.
Twilio needs an access to notify the DigitalBeing about SMS events.

##### Public IP is available (Docker)

In order to expose a port in the public inside docker go to `docker-compose.yaml`, edit the contaier you want to change and add the port according to this syntax.

```yaml
ports:
  - "HOST_PORT:CONTAINER_PORT"
```

Example:

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_288.png)

More details on the syntax are available in [Compose documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/#short-syntax-1).

##### Public IP is not available (`ngrok`)

A software called [ngrok](https://ngrok.com/) may help if you are using a home network and are beyond the nat.
It creates a tunnel that enables public access to your computer.
In order to use `ngrok`, you will need to install it (it supports both windows and linux) and run `ngrok http port` through the command line.
This command will generate a new URL that will be later use for public access.

This step can be used for the `Editor`, `Twilio` or `Messenger`, which needs public access to the computer.

#### Twilio setup

In order to run [Twilio](https://www.twilio.com/), you will need to have your ports forwarded.
Puppeteer error, that it cant find Chrome: [WSL](https://docs.microsoft.com/en-us/windows/wsl/about) can cause an error with puppeteer that it cant find chromium driver, in order to fix it you will need to install chrome manually, running the following commands:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
```

```bash
sudo apt -y install ./google-chrome-stable_current_amd64.deb
```

#### XR-Engine Support:

[DigitalBeing](https://github.com/XRFoundation/DigitalBeing) is able to connect to the [XR-Engine](https://github.com/XRFoundation/XREngine) using [Puppeteer](https://github.com/puppeteer/puppeteer).

DigitalBeing is able to imitate a character in XR-engine and access its functions. It currently selects a random model.
It works using a virtual headful client (runs like headless, but in headful mode virtual, as puppeteer doesn't support Audio and Video in headless mode) in the engine.
Currently, DigitalBeing has a builtin support for the chat, which allows it to talk with users and use chat commands. It also has access to the `client-logs`, which have info about the bot, be it scene metadata or something else.

Available Commands - all commands start with a slash (`/`):

* `/move x,y,z` moves to x,y,z position using navmesh
* `/metadata scene` gets the scene metadata
* `/metadata world,max_distance` (from bot) gets the world metadata (objects) around the bot
* `/listAllusers` sends a client log with all users
* `/goTo landmark` (based on world metadata) moves towards a landmark
* `/emote emote_name` players an emote
* `/getPosition user` get the position of a user
* `/getRotation user` get the rotation of a user
* `/getScale user` get the scale of a user
* `/getTransform user` get the transform of a user (position, rotation, scale)
* `/subscribe system` subscribe to chat system
* `/unsubscribe system` unsubscribe from a chat system
* `/getSubscribed` get the current subscribed chat systems
* `/follow user` follow a user
* `/follow stop` stop following a user
* `/getChatHistory` get the recent chat history as client log
* `/getLocalUserId` get the local user id as client log

**Note**: the `xrengine-client.js` has all the functions needed to send commands or generally a chat message.

#### Scripts Structure:

The [XR-Engine](https://github.com/XRFoundation/XREngine) engine is one of the DB’s clients, it can handle multiple clients at once though.

There are multiple scripts for the xr-engine:

`chatHistory.js` - has functions to handle the chat history
`messageHandler.js` - handles the chat messages and sends to the server side the needed messages
`Stt.js`  - handles the speech to text engine
`Tts.js` - handles the text to speech engine
`UsersInRange.js` - holds lists of users around the bot
`Xrengine-client.js` - is the main script for the XR-Engine, it holds all the functions that use the puppeteer
`xrEnginePacketHandler.js` - handles the received packets from the python server

#### `.env` config file

The config file for a DigitalBeing is located in a root project directory and is called `.env`. It holds all the variables that are needed for configuration, they are added externally to support easy changes and avoid rebuilding docker if used.

Some values are the api keys, chat history length, editor values, ports used etc.

##### Common parameters

##### Common

* `BOT_NAME` - the name of the Bot that is used globally in the chat history, so the bot  understands easily if it sent by it
* `BOT_NAME_HANDLE` - the name that is set for the bot in the chat history in the metaintelligence handler
* `BOT_NAME_REGEX` - the regex for the bot name, which is used for the bot to understand that someone is starting a conversation with it
* `ENABLED_SERVICES` - what clients to enable; case-insensitive. Possible options: `Discord`, `Instagram`, `Messenger`, `Reddit`, `Telegram`, `Twilio`, `Twitter`, `Website-reader`, `Whatsapp`, `XR`, `Zoom`.
* `EDIT_MESSAGES_MAX_COUNT` - max message to be sent to agent if edited (older messages will be ignored)
* `CHAT_HISTORY_MESSAGES_COUNT` - the count of chat history fetched in-case the agent needs them
* `OPENAI_OBSCENITY_DETECTOR` - uses OpenAI for finding obscene messages if set as `1`
* `WEBSERVER_PORT` - the webserver port that is used for the webhooks (Twilio, Messenger)

##### Twitter

In order to get the Twitter API tokens a request will be needed to be made for a Twitter Developer Account, then the keys can be fetched this way after creating the Application inside the dev Portal.

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_283.png)

* `TWITTER_BEARER_TOKEN`
* `TWITTER_APP_TOKEN`
* `TWITTER_APP_TOKEN_SECRET`
* `TWITTER_ACCESS_TOKEN`
* `TWITTER_Access_TOKEN_SECRET`
* `TWITTER_ID` - The name of the twitter account, e.x. DigitalBeing
* `TWITTER_TWEET_RULES` - Rules (words) that are used to fetch Tweets, they are separated using semicolon (`;`), for example: `digital being;digital;being`

##### Discord

In order to fetch discord Tokens go to the [Dev Portal](https://discord.com/developers/applications) and click New Application, select a name for the Application and click Create, select the Bot panel and create bot, `Client_API_Token` can be fetched from the Bot Tab and Client and `Client_secret` can be fetched from the OAuth2 tab. In the dev portal you in the bot tab you will need to enable these 2 options in order to make the bot crash.

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_285.png)

A Discord user can be fetched by enabled the Developer Mode in discord, right click to the user and click "Copy ID", so it will be copied to the clipboard.

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_284.png)

* `DISCORD_API_TOKEN`
* `DISCORD_CLIENT_SECRET`
* `LOAD_DISCORD_LOGGER` - whether or not to load the external Logger, which sends DMs with logs to a selected user
* `LOG_DM_USER_ID` - The user that the Logs are sent to
* `DIGITAL_BEINGS_ONLY` - This variable is a boolean, if set to true, the bot ignores channels that don't have DigitalBeing in their metadata (channel description).

##### Twilio

In order to use Twilio, you will need to create an account and create a new phone number (Twilio doesn’t receive SMS abroad, so the number should be better from your Region). 
Then you will need to port forward (if needed) the web server port, default is `65535`
Update Twilio WebHooks for Messaging (SMS) with the your web server url `ip:port/sms` for the active number

* `TWILIO_ACCOUNT_SID`
* `TWILIO_AUTH_TOKEN`
* `TWILIO_PHONE_NUMBER`

##### Telegram

In order to create a bot in telegram, you will need to install the APP in an Android or iOS device and login/register, then search for the BotFather bot (Should have a blue checkmark beside his name), click "Start" conversation to activate it and then follow his instructions.

![alt_text](https://github.com/XRFoundation/DigitalBeing/blob/main/readme_images/Screenshot_289.jpg)

* `TELEGRAM_BOT_TOKEN`

##### XR-Engine

In order to use the xr-engine you will need to [install](https://github.com/XRFoundation/XREngine/blob/dev/tutorial/01-installation.md) the engine, then for the URL variable just apply the `URL` for the engine using the location you want the bot to enter, for example [https://localhost:3000/location/test](https://localhost:3000/location/test). This `URL` will make the bot to connect to the `XR-engine` that is setup locally on Port `3000` in the location test.

* `XRENGINE_URL`

##### Whatsapp

**CURRENTLY UNTESTED**, API keys are unavailable.

* `WHATSAPP_BOT_NAME`

##### Harmony

Harmony runs the same way with the `XR-Engine`, though the url is [https://localhost:3000/harmony](https://localhost:3000/harmony) for a local test.

* `HARMONY_URL`

##### Messenger by Facebook

Messenger is using the default Facebook API, it supports Direct Messages through a Facebook Page.

In order to set up the bot for facebook, you will need to go to the Facebook Dev, then create a new Application, set it up with your Page and add Messenger (it can work with Instagram too), then you will need to set a verify token to the `.env` (something like a password), run the bot, let it load, then go to the Messenger Dev Portal and in the Messenger APP go to callbacks, set your `ip:port/webhook` and for the next text field type the verify token you used to the .env, click verify and wait to load, then get the app token from the dev portal and update the `.env`.

* `MESSENGER_TOKEN`
* `MESSENGER_VERIFY_TOKEN`

##### Zoom

To use zoom, you will need to create a room and get the invitation link (for web), like this `https://us04web.zoom.us/wc/join/id` if the room needs a password, you will need to add it in the `zoom_password` variable or in the url.

* `ZOOM_INVITATION_LINK`
* `ZOOM_PASSWORD`

##### Reddit

For [Reddit](https://www.reddit.com), you will need to create an app on its [dev portal](https://www.reddit.com/prefs/apps).
Then you need to obtain the redirect URL at [this page](https://not-an-aardvark.github.io/reddit-oauth-helper/).
After, visit the same `URL` and follow the steps to generate the `OAUTH2` token and set up the variables in the `.env` with the needed values.

* `REDDIT_APP_ID`
* `REDDIT_APP_SECRED_ID`
* `REDDIT_USERNAME`
* `REDDIT_PASSWORD`
* `REDDIT_OATH_TOKEN` - OAUTH2 token

##### Instagram

Instagram is the simplest to setup, there is no need of a dev account or dev application, just the account’s credentials for the bot to login in the account.

* `IG_USERNAME` - the username for an Instagram bot account
* `IG_PASSWORD` - the password

##### PostgreSQL database

The bot uses PostgreSQL locally to save chat history, user data, etc. It can be setup locally or in a different server.

* `PGUSER` - username
* `PGHOST` - host
* `PGPASSWORD` - password
* `PGDATABASE` - database name
* `PGPORT` - port

In Linux, PostgreSQL should be available automatically for your package manager.
For example, in Ubuntu you can install it with `sudo apt install postgresql-server`.

In Windows, you'll need to download it from the [official server](https://www.postgresql.org/download/windows/) and follow [the instructions](https://www.postgresqltutorial.com/install-postgresql/).

Windows installation instructions [instructions](https://harshityadav95.medium.com/postgresql-in-windows-subsystem-for-linux-wsl-6dc751ac1ff3) using WSL.

##### Manager

The Manager is a web interface to edit variables from the database for the bot.

* `BOT_MANAGER_IP`
* `BOT_MANAGER_PORT`
* `MANAGER_USERNAME` - in order to use it there is a login screen on the start, to avoid others editing the bot
* `MANAGER_PASSWORD`
* `BOT_MANAGER_SECRET_KEY` - a custom secret key
* `AVAILABLE_AIS` - Available agents in the bot, separated by the semicolons so spaces can be used, for example: `gpt3;gpt2;test agent`

##### `GPT-3` agent

* `OPENAI_API_KEY` - OpenAI key that is needed for the `GPT-3` bot to function


## Getting Started
Clone the repo

Then, grab an API key from Open AI.
https://beta.openai.com/signup

Copy and paste the `.env.default` file, rename to `.env` and put your API key in it.

Now install dependencies and run the project
```
npm install
npm start // start with default agent
```

## Contibuting
Contributions welcome

### FOR PROGRAMMERS
Please look below to TODOs, and contribute what you're interested in. If you have other ideas for features, please give them a try and submit as a PR. Together we can make something really incredible!

### FOR NON PROGRAMMERS
You can create your own agent entirely by modifying the text prompts, without needing more than to change a few lines of configuration. First, copy the folder in `agents` directory. Then add a command in the package.json -- you can copy one of the existing commands, and change the AGENT environment variable to the name of your personality. Modify the text files -- you can do this while the agent is running -- and explore the responses and history to tune your agent.

Here's a great place to start on your prompt engineering journey: https://www.gwern.net/GPT-3

## TODO
- Interface for adding and editing agents from UI
- Add new agents through discord / command
- Switch agent through discord / command

- handle non-sequitors

- Relationship matrix (including gradients)
- Block repeated inappropriate use + build up enemy

- Identify if question is expert knowledge or not
- - Neural search for deep knowledge -- if expert knowledge, respond with "good question", "let me think about that..." and do knowledge search

- handle long user input, shorten if it's too long
- Add up the length of all of the txt files to make sure they aren't super long in debug mode, throw warning if too long or force smaller context / remove memory

- Set creativity, presence and frequency for each prompt type

- Storage adapter to pull all data from either 
