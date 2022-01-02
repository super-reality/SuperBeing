import { TwitterApi } from 'twitter-api-v2'
import { database } from '../database/database.js'

export class twitterPacketHandler {
    static instance
    twitter
    twitterV1
    localUser

    constructor(twitter, twitterV1, localUser) {
        twitterPacketHandler.instance = this
        this.twitter = twitter
        this.twitterV1 = twitterV1
        this.localUser = localUser
    }
    
    async handleMessage(responses, messageId, chat_id, args) {
        Object.keys(responses).map(async function(key, index) {
            if (args === 'DM') {
                const dmSent = await twitterPacketHandler.instance.twitterV1.v1.sendDm({
                    recipient_id: chat_id,
                    text: responses[key]
                })
                database.instance.addMessageInHistory('twitter', chat_id, dmSent.event.id, process.env.BOT_NAME, responses[key])
            } else if (args === 'Twit') {
                await twitterPacketHandler.instance.twitterV1.v1.reply(responses[key], chat_id).then(res => {
                    database.instance.addMessageInHistory('twitter', chat_id, res.id_str, process.env.BOT_NAME, responses[key])
                })
            }
        })
    }
}

export const createTwitterClient = async () => {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    const twitterUser = process.env.TWITTER_ID
    const twitterAppToken = process.env.TWITTER_APP_TOKEN
    const twitterAppTokenSecret = process.env.TWITTER_APP_TOKEN_SECRET
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN
    const twitterAccessTokenSecret = process.env.TWITTER_Access_TOKEN_SECRET
    const regex = new RegExp('', 'ig')
    const regex2 = new RegExp(process.env.BOT_NAME_REGEX, 'ig')
    if (!bearerToken || !twitterUser) return console.warn("No API token for Whatsapp bot, skipping");

    let twitter = new TwitterApi(bearerToken) 
    let twitterV1 = new TwitterApi({
        appKey: twitterAppToken,
        appSecret: twitterAppTokenSecret,
        accessToken: twitterAccessToken,
        accessSecret: twitterAccessTokenSecret,
      });
    const client = twitter.readWrite
    const localUser = await twitter.v2.userByUsername(twitterUser)

    new twitterPacketHandler( new TwitterApi(bearerToken), new TwitterApi({
        appKey: twitterAppToken,
        appSecret: twitterAppTokenSecret,
        accessToken: twitterAccessToken,
        accessSecret: twitterAccessTokenSecret,
      }), 
      localUser)

    setInterval(async () => {
        const tv1 = new TwitterApi({
            appKey: twitterAppToken,
            appSecret: twitterAppTokenSecret,
            accessToken: twitterAccessToken,
            accessSecret: twitterAccessTokenSecret,
          });
        const eventsPaginator = await tv1.v1.listDmEvents()
        for await (const event of eventsPaginator) {
            
            console.log('Event: ' + JSON.stringify(event.message_create.message_data.text))
            if (event.type == 'message_create') {

                console.log('isMessage')
                if (event.message_create.sender_id == localUser.data.id) { console.log('same sender'); return }

                let authorName = 'unknown'
                const author = await twitter.v2.user(event.message_create.sender_id)
                if (author) authorName = author.data.username

                await database.instance.messageExistsAsyncWitHCallback2('twitter', event.message_create.target.recipient_id, event.id, authorName, event.message_create.message_data.text, parseInt(event.created_timestamp), () => {
                    // TODO: Replace me with direction message handler
                    // MessageClient.instance.sendMessage(event.message_create.message_data.text,
                    //     event.id,
                    //     'twitter',
                    //     author.data.id,
                    //     event.created_timestamp,
                    //     false,
                    //     authorName,
                    //     'DM')

                    database.instance.addMessageInHistoryWithDate(
                        'twitter',
                        event.message_create.target.recipient_id,
                        event.id,
                        authorName,
                        event.message_create.message_data.text,
                        event.created_timestamp)
                })

            }
        }
    }, 25000)

    
    /*const rules = await client.v2.streamRules()
    if (rules.data?.length) {
        await client.v2.updateStreamRules({
            delete: { ids: rules.data.map(rule => rule.id) },
        })
    }

    const tweetRules = process.env.TWITTER_TWEET_RULES.split(',')
    const _rules = []
    for (let x in tweetRules) {
        console.log('rule: ' + tweetRules[x])
        _rules.push({value: tweetRules[x]})
    }

    await client.v2.updateStreamRules({
        add: _rules
    })

    const stream = await client.v2.searchStream({
        "tweet.fields": ['referenced_tweets', 'author_id'],
        expansions: ['referenced_tweets.id']
    })
    stream.autoReconnect = true

    stream.on(ETwitterStreamEvent.Data, async twit => {
        const isARt = twit.data.referenced_tweets?.some(twit => twit.type === 'retweeted') ?? false
        if (isARt || (localUser !== undefined && twit.data.author_id == localUser.data.id)) {
            console.log('isArt found')
        } else {
            if (/*!twit.data.text.match(regex) && *//*!twit.data.text.match(regex2)) {  
             /*   console.log('regex doesnt match')
            } else {
                let authorName = 'unknown'
                const author = await twitter.v2.user(twit.data.author_id)
                if (author) authorName = author.data.username

                let date = new Date();
                if (twit.data.created_at) date = new Date(twit.data.created_at)
                const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
                var ts = Math.floor(utc.getTime() / 1000);

                await database.instance.messageExistsAsyncWitHCallback2('reddit', twit.data.id, twit.data.id, authorName, twit.data.text, ts, () => {
                    MessageClient.instance.sendMessage(twit.data.text, 
                        twit.data.id,
                        'twitter',
                        twit.data.in_reply_to_user_id ? twit.data.in_reply_to_user_id : twit.data.id,
                        ts + '',
                        false,
                        authorName,
                        'Twit')
                        console.log('sending twit: ' + JSON.stringify(twit))

                    
                    
                    database.instance.addMessageInHistoryWithDate(
                        'twitter',
                        twit.data.id,
                        twit.data.id,
                        authorName,
                        twit.data.text,
                        utcStr)
                })
            }
        }
    })*/

    import { Autohook } from 'twitter-autohook';
    import http from 'http';
    import url from 'url';
    import { handleInput } from "./handleInput.js";
    import TwitterClient from 'twit';
    
    const currentAgent = process.env.AGENT;
    
    let TwitClient;
    
    const SendMessage = (id, twitterUserId, messageType, text) => {
      if (messageType === 'DM') {
        TwitClient.post('direct_messages/events/new', {
          "event": {
            "type": "message_create",
            "message_create": {
              "target": {
                "recipient_id": id
              },
              "message_data": {
                "text": text,
              }
            }
          }
        }, (error, data, response) => { if (error) console.log(error) });
      } else {
        TwitClient.post('statuses/update', { status: '@' + twitterUserId + ' ' + text, id, in_reply_to_status_id: id }, function (err, data, response) {
          console.log("Posted ", '@' + twitterUserId + ' ' + text)
        })
      }
    }
    
    const HandleResponse = async (id, name, receivedMessage, messageType, event) => {
      let reply = await handleInput(receivedMessage, name, currentAgent, null, false);
    
      // if prompt is more than 280 characters, remove the last sentence
      while (reply.length > 280) {
        reply = reply.substring(0, reply.lastIndexOf(".")) + ".";
      }
    
      TwitClient.post('statuses/update', { status: reply }, function (err, data, response) {
        if (err) console.log(err);
      })
    
    
      SendMessage(id, name, messageType, reply);
    }
    
    const validateWebhook = (token, auth) => {
      const responseToken = crypto.createHmac('sha256', auth).update(token).digest('base64');
      return { response_token: `sha256=${responseToken}` };
    }
    
    export const createTwitterClient = async (twitterId = process.env.twitterId) => {
      TwitClient = new TwitterClient({
        consumer_key: process.env.twitterConsumerKey,
        consumer_secret: process.env.twitterConsumerSecret,
        access_token: process.env.twitterAccessToken,
        access_token_secret: process.env.twitterAccessTokenSecret
      });
    
      const webhook = new Autohook({
        token: process.env.twitterAccessToken,
        token_secret: process.env.twitterAccessTokenSecret,
        consumer_key: process.env.twitterConsumerKey,
        consumer_secret: process.env.twitterConsumerSecret,
        ngrok_secret: process.env.ngrokToken,
        env: 'dev',
        port: process.env.twitterWebhookPort
      });
      await webhook.removeWebhooks();
      webhook.on('event', event => {
        if (typeof (event.tweet_create_events) !== 'undefined' &&
          event.tweet_create_events[0].user.screen_name !== twitterId) {
          console.log("************************** EVENT tweet_create_events")
          const id = event.tweet_create_events[0].user.id
          const screenName = event.tweet_create_events[0].user.screen_name
          const ReceivedMessage = event.tweet_create_events[0].text;
          const message = ReceivedMessage.replace("@" + twitterId + " ", "")
          if(!screenName.toLowerCase().includes(twitterId.toLowerCase())){
            HandleResponse(id, screenName, message, 'Tweet', event);
          }
        }
    
        if (typeof (event.direct_message_events) !== 'undefined') {
          if (event.users[event.direct_message_events[0].message_create.sender_id].screen_name !== twitterId) {
            console.log("************************** EVENT direct_message_events")
            console.log(event.direct_message_events[0])
    
            const id = event.direct_message_events[0].message_create.sender_id;
            const name = event.users[event.direct_message_events[0].message_create.sender_id].screen_name;
            const ReceivedMessage = event.direct_message_events[0].message_create.message_data.text;
            HandleResponse(id, name, ReceivedMessage, 'DM', event)
          }
        }
      });
      await webhook.start();
      await webhook.subscribe({ oauth_token: process.env.twitterAccessToken, oauth_token_secret: process.env.twitterAccessTokenSecret, screen_name: twitterId });
    
      // handle this
      http.createServer((req, res) => {
        const route = url.parse(req.url, true);
    
        if (!route.pathname) {
          return;
        }
    
        if (route.query.crc_token) {
          console.log("Validating webhook")
          console.log(route.query.crc_token)
          const crc = validateWebhook(route.query.crc_token, process.env.twitterConsumerSecret);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(crc));
        }
      }).listen(process.env.twitterWebhookPort);
      
    
      setInterval(async () => {
        let prompt = "Could you please write a short, optimistic tweet on web 3.0 culture, the metaverse, internet technology or the state of the world? Must be in less than three sentences.\n" + currentAgent + ":";
      
        let reply = await handleInput(prompt, "Friend", currentAgent, null, false);
    
            // if prompt is more than 280 characters, remove the last sentence
            while (reply.length > 280) {
              reply = reply.substring(0, reply.lastIndexOf(".")) + ".";
            }
        TwitClient.post('statuses/update', { status: reply }, function (err, data, response) {
          if (err) console.log(err);
        })
      
      }, (1000 * 60 * 60));
    
    }
    
    createTwitterClient();
    

}