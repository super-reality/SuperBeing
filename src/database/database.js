import pg from 'pg';
import { initProfanityFilter } from '../cognition/profanityFilter.js';
import fs from 'fs';
import { rootDir } from '../utilities/rootDir.js';
import customConfig from '../utilities/customConfig.js';
import { getRandomNumber } from '../connectors/utils.js';
const { Client } = pg;

export class database {
    static instance
    bannedUsers = []

    pool
    client

    constructor(bannedUsers = []) {
        this.bannedUsers = bannedUsers
        console.log('Loaded ' + this.bannedUsers.length + ' banned users!');
        database.instance = this

        setInterval(() => {
            database.instance.getBannedUsers()
        }, 60000)
    }

    //checks if a user is banned
    isUserBanned(user_id, client) {
        for(let x in this.bannedUsers) {
            console.log(x + ' - ' + this.bannedUsers[x].user_id + ' - ' + user_id + ' - ' + (this.bannedUsers[x].user_id === user_id))
            if (this.bannedUsers[x].user_id === user_id && this.bannedUsers[x].client === client) {
                return true
            }
        }

        return false
    }

    async banUser(user_id, client) {
        console.log('blocking user1: ' + user_id)
        if (this.isUserBanned(user_id, client)) return

        console.log('blocking user: ' + user_id)
        await database.instance.banUser(user_id, client)
        this.bannedUsers.push({ 
            user_id: user_id, 
            client: client 
        });
    }
    async unbanUser(user_id, client) {
        if (!this.isUserBanned(user_id, client)) return

        const olength = this.bannedUsers.length
        for(let i = 0; i < this.bannedUsers.length; i++) {
            if (this.bannedUsers[i].user_id === user_id && this.bannedUsers[i].client === client) {
                this.bannedUsers.splice(i, 1)
                break
            }
        }
        console.log('length: ' + olength + ' - ' + this.bannedUsers.length)
        await database.instance.unbanUser(user_id, client)
    }

    async connect() {
        console.log('connect');
        //this.client = await this.pool.connect()
        this.client = new Client({
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            port: process.env.PGPORT,
            host: process.env.PGHOST,
            ssl: process.env.PGSSL ? {
                rejectUnauthorized: false
            } : false
        });
        this.client.connect()
        await this.client.query('SELECT NOW()')

        await this.readConfig();
        await this.onInit();
        await initProfanityFilter();        
    }

    //reads the config table from the database
    async readConfig() {
        const configs = {}
        const query = 'SELECT * FROM config';
        
        const rows = await this.client.query(query);

        if (rows && rows.rows && rows.rows.length > 0) {
            for (let i = 0; i < rows.rows.length; i++) {
                configs[rows.rows[i]._key] = rows.rows[i]._value;
            }
        }

        new customConfig(configs);
    }
    //updates a config value
    async setConfig(key, value) {
        const check = 'SELECT * FROM config WHERE _key=$1';
        const cvalue = [key];

        const rows = await this.client.query(check, cvalue);
        if (rows && rows.rows && rows.rows.length > 0) {
            const query = 'UPDATE config SET _value=$1 WHERE _key=$2';
            const values = [value, key];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO config(_key, _value) VALUES($1, $2)';
            const values = [key, value];

            await this.client.query(query, values);
        }
    }

    async addMessageInHistory(client_name, chat_id, message_id, sender, content) {  
        const date = new Date();
        const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
        const global_message_id = client_name + '.' + chat_id + '.' + message_id
        const query = "INSERT INTO chat_history(client_name, chat_id, message_id, global_message_id, sender, content, createdAt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *"
        const values = [ client_name, chat_id, message_id, global_message_id, sender, content, utcStr ]

        this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            }
          })
    }
    async addMessageInHistoryWithDate(client_name, chat_id, message_id, sender, content, date) {  
        const global_message_id = client_name + '.' + chat_id + '.' + message_id
        const query = "INSERT INTO chat_history(client_name, chat_id, message_id, global_message_id, sender, content, createdAt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *"
        const values = [ client_name, chat_id, message_id, global_message_id, sender, content, date ]

        this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            }
          })
    }

    async getHistory(length, client_name, chat_id) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2"
        const values = [ client_name, chat_id ]
        return await this.client.query(query, values, (err, res) => {
            if (err) {
                return console.log(`${err} ${err.stack}`)
            }
            const _res = []
            if (res !== undefined && res !== null && res.rows !== undefined) {
                for(let i = 0; i < res.rows.length; i++) {
                    _res.push({ author: res.rows[i].sender, content: res.rows[i].content })

                    if (i >= length) break
                }
            }  
            return _res
        })
    }

    async deleteMessage(client_name, chat_id, message_id) {
        const query = "DELETE FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        await this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            }
        })
    }

    async updateMessage(client_name, chat_id, message_id, newContent, upadteTime) {
        if (upadteTime) {
            const date = new Date();
            const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
            const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
            const query = "UPDATE chat_history SET content=$1, createdAt=$2 WHERE client_name=$3 AND chat_id=$4 AND message_id=$5"
            const values = [ newContent, utcStr, client_name, chat_id, message_id ]

            await this.client.query(query, values, (err, res) => {
                if (err) {
                console.log(`${err} ${err.stack}`)
                }
            })
        }
        else {
            const query = "UPDATE chat_history SET content=$1 WHERE client_name=$2 AND chat_id=$3 AND message_id=$4"
            const values = [ newContent, client_name, chat_id, message_id ]

            await this.client.query(query, values, (err, res) => {
                if (err) {
                console.log(`${err} ${err.stack}`)
                }
            })
        }
    }

    async messageExists(client_name, chat_id, message_id, sender, content, timestamp) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        return await this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            } else {
                if (res.rows && res.rows.length) {
                    this.updateMessage(client_name, chat_id, message_id, content, false);
                }
                else {
                    const date = new Date(timestamp)
                    const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                    const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
                    const global_message_id = client_name + '.' + chat_id + '.' + message_id
                    const query2 = "INSERT INTO chat_history(client_name, chat_id, message_id, global_message_id, sender, content, createdAt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *"
                    const values2 = [ client_name, chat_id, message_id, global_message_id, sender, content, utcStr ]
            
                    this.client.query(query2, values2, (err, res) => {
                        if (err) {
                          console.log(`${err} ${err.stack}`)
                        }
                      })
                    return true
                }

                return false
            }
        })
    }
    async messageExistsAsync(client_name, chat_id, message_id, sender, content, timestamp) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        return await this.client.query(query, values, async (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            } else {
                if (res.rows && res.rows.length) {
                    this.updateMessage(client_name, chat_id, message_id, content, false);
                }
                else {
                    const date = new Date(timestamp)
                    const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                    const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
                    const global_message_id = client_name + '.' + chat_id + '.' + message_id
                    const query2 = "INSERT INTO chat_history(client_name, chat_id, message_id, global_message_id, sender, content, createdAt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *"
                    const values2 = [ client_name, chat_id, message_id, global_message_id, sender, content, utcStr ]
            
                    await this.client.query(query2, values2, (err, res) => {
                        if (err) {
                          console.log(`${err} ${err.stack}`)
                        }
                      })
                    return true
                }
                return false
            }
        })
    }
    async messageExistsAsyncWitHCallback(client_name, chat_id, message_id, sender, content, timestamp, callback) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        return await this.client.query(query, values, async (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            } else {
                if (res.rows && res.rows.length) {
                    this.updateMessage(client_name, chat_id, message_id, content, false);
                }
                else {
                    const date = new Date(timestamp)
                    const utc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                    const utcStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + utc.getHours() + ':' + utc.getMinutes() + ':' + utc.getSeconds()
                    const global_message_id = client_name + '.' + chat_id + '.' + message_id
                    const query2 = "INSERT INTO chat_history(client_name, chat_id, message_id, global_message_id, sender, content, createdAt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *"
                    const values2 = [ client_name, chat_id, message_id, global_message_id, sender, content, utcStr ]
            
                    await this.client.query(query2, values2, (err, res) => {
                        if (err) {
                          console.log(`${err} ${err.stack}`)
                        }
                      })
                      callback()
                }
            }
        })
    }    
    async messageExistsAsyncWitHCallback2(client_name, chat_id, message_id, sender, content, timestamp, callback) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        return await this.client.query(query, values, async (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            } else {
                if (res.rows && res.rows.length) {
                }
                else {
                    callback()
                }
            }
        })
    }
    async messageExists2(client_name, chat_id, message_id, foundCallback, notFoundCallback) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2 AND message_id=$3"
        const values = [ client_name, chat_id, message_id ]

        return await this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
              notFoundCallback()
            } else {
                if (res && res.rows && res.rows.length > 0) foundCallback()
                else notFoundCallback()
            }
        })
    }

    async getNewMessageId(client_name, chat_id, callback) {
        const query = "SELECT * FROM chat_history WHERE client_name=$1 AND chat_id=$2"
        const values = [ client_name, chat_id ]

        return await this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            }

            if (res !== undefined && res !== null && res.rows !== undefined) {
                callback(res.rows.length + 1)
            } else {
                callback(1)
            }
        })
    }

    async getBannedUsers() {
        const query = "SELECT * FROM blocked_users;"

        if (this.client) {
            await this.client.query(query, (err, res) => {
                if (err) console.log(`${err} ${err.stack}`)
                    else database.instance.bannedUsers = res.rows
            });
        }
    }
    async banUser(user_id, client) {
        const query = "INSERT INTO blocked_users(user_id, client) VALUES($1, $2);"    
        const values = [ user_id, client ]
            
        this.client.query(query, values, (err, res) => {
            if (err) {
              console.log(`${err} ${err.stack}`)
            }
          })

    }
    async unbanUser(user_id, client) {
        const query = "DELETE FROM blocked_users WHERE user_id=$1 AND client=$2"
        const values = [ user_id, client ]

        this.client.query(query, values, (err, res) => {
            if (err) {
                console.log(`${err} ${err.stack}`)
            }
        });
    }
    async isUserBanned(user_id, client) {
        const query = "SELECT * FROM blocked_users WHERE user_id=$1 AND client=$2"
        const values = [ user_id, client ]

        return await this.client.query(query, values, (err, res) => {
            if (err) console.log(`${err} ${err.stack}`)
            else return res !== undefined && res.rows !== undefined && res.rows.length > 0
        });
    }

    async setConversation(agent, client, channel, sender, text, archive) {
        if (!text || text.length <= 0) return;
        const query = 'INSERT INTO conversation(agent, client, channel, sender, text, archive, date) VALUES($1, $2, $3, $4, $5, $6, $7)'
        const values = [ agent, client, channel, sender, text, archive, (new Date()).toUTCString() ]

        await this.client.query(query, values);
    }
    async getConversation(agent, sender, client, channel, archive) {
        const query = 'SELECT * FROM conversation WHERE agent=$1 AND client=$2 AND channel=$3 AND archive=$4';
        const values = [ agent, client, channel, archive ];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            row.rows.sort(function(a, b) {
                return new Date(b.date) - new Date(a.date);
            });
            const now = new Date();
            const max_length = parseInt(customConfig.instance.get('chatHistoryMessagesCount'));
            let data = '';
            let count = 0;
            for(let i = 0; i < row.rows.length; i++) {
                if (!row.rows[i].text || row.rows[i].text.length <= 0) continue;
                const messageDate = new Date(row.rows[i].date);
                let diffMs = (now - messageDate);
                let diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
                if (diffMins > 15) {
                    break;
                }

                data += row.rows[i].sender + ': ' + row.rows[i].text + '\n';
                count++;
                if (count >= max_length) {
                    break;
                }
            }
            return data.split('\n').reverse().join('\n');;
        } else {
            return '';
        }
    }
    async clearConversations() {
        const query = 'DELETE FROM conversation';
        await this.client.query(query, values);
    }
    async setSpeakersModel(agent, speaker, model) {
        const test = 'SELECT * FROM speakers_model WHERE agent=$1 AND speaker=$2'
        const ctest = [ agent, speaker ]

        const check = await this.client.query(test, ctest);
        
        let query = '';
        let values = [];

        if (check && check.rows && check.rows.length > 0) {
            query = "UPDATE speakers_model SET model=$1 WHERE agent=$2 AND speaker=$3"
            values = [model, agent, speaker];
        } else {
            query = "INSERT INTO speakers_model(agent, speaker, model) VALUES($1, $2, $3)"
            values = [agent, speaker, model];
        }

        await this.client.query(query, values);
    }
    async getSpeakersModel(agent, speaker) {
        const query = 'SELECT * FROM speakers_model WHERE agent=$1 AND speaker=$2'
        const values = [agent, speaker];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].model;
        } else {
            return '';
        }
    }
    async setSpeakersFacts(agent, speaker, facts) {
        const check = 'SELECT FROM speakers_facts WHERE agent=$1 AND speaker=$2'
        const cvalues = [ agent, speaker ]

        const test = await this.client.query(check, cvalues);

        let query = '';
        let values = [];

        if (test && test.rows && test.rows.length > 0) {
            query = "UPDATE speakers_facts SET facts=$1 WHERE agent=$2 AND speaker=$3"
            values = [facts, agent, speaker];
        } else {
            query = "INSERT INTO speakers_facts(agent, speaker, facts) VALUES($1, $2, $3)"
            values = [agent, speaker, facts];
        }

        await this.client.query(query, values);
    }
    async getSpeakersFacts(agent, speaker) {
        const query = 'SELECT * FROM speakers_facts WHERE agent=$1 AND speaker=$2'
        const values = [agent, speaker];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].facts;
        } else {
            return '';
        }
    }
    async updateSpeakersFactsArchive(agent, speaker, facts) {
        const archive = await this.getSpeakersFactsArchive(agent, speaker) 
        if (archive && archive.length > 0) {
            const query = 'UPDATE speakers_facts_archive SET facts=$1 WHERE agent=$2 AND speaker=$3'
            const values = [ archive + '\n' + facts, agent, speaker ];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO speakers_facts_archive(agent, speaker, facts) VALUES($1, $2, $3)'
            const values = [ agent, speaker, facts ];

            await this.client.query(query, values);
        }
    }
    async getSpeakersFactsArchive(agent, speaker) {
        const query = 'SELECT * FROM speakers_facts_archive WHERE agent=$1 AND speaker=$2'
        const values = [agent, speaker];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].facts;
        }
        return '';
    }
    async setAgentFacts(agent, facts, reset) {
        const check = 'SELECT * FROM agent_facts WHERE agent=$1'
        const cvalues = [ agent ]
        const res = await this.client.query(check, cvalues);
        const test = res;
        let query = '';
        let values = [];

        if (test && test.rows && test.rows.length > 0) {
            const newFacts = test.rows[0].facts + !reset ? '\n' + facts : "";

            query = "UPDATE agent_facts SET facts=$1 WHERE agent=$2"
            values = [newFacts, agent];
        } else {
            query = "INSERT INTO agent_facts(agent, facts) VALUES($1, $2)"
            values = [agent, facts];
        }

        await this.client.query(query, values);
    }
    async getAgentFacts(agent) {
        const query = 'SELECT * FROM agent_facts WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].facts;
        } else {
            return await '';
        }
    }
    async updateAgentFactsArchive(agent, facts) {
        const archive = await this.getAgentFactsArchive(agent) 
        if (archive && archive.length > 0) {
            const query = 'UPDATE agent_facts_archive SET facts=$1 WHERE agent=$2'
            const values = [ archive + '\n' + facts, agent ];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO agent_facts_archive(agent, facts) VALUES($1, $2)'
            const values = [ agent, facts ];

            await this.client.query(query, values);
        }
    }
    async getAgentFactsArchive(agent) {
        const query = 'SELECT * FROM agent_facts_archive WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].facts;
        }
        return '';
    }
    async setMeta(agent, speaker, meta) {
        const check = 'SELECT * FROM meta WHERE agent=$1 AND speaker=$2'
        const cvalues = [ agent, speaker ]

        const test = await this.client.query(check, cvalues);
        let query = '';
        let values = [];

        if (test && test.rows && test.rows.length > 0) {
            query = "UPDATE meta SET meta=$1 WHERE agent=$2 AND speaker=$3"
            values = [meta, agent, speaker];
        } else {
            query = "INSERT INTO meta(agent, speaker, meta) VALUES($1, $2, $3)"
            values = [agent, speaker, meta];
        }

        await this.client.query(query, values);
    }
    async getMeta(agent, speaker) {
        const query = 'SELECT * FROM meta WHERE agent=$1 AND speaker=$2'
        const values = [agent, speaker];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].meta;
        } else {
            return '';
        }
    }
    async setRelationshipMatrix(agent, matrix) {
        const check = 'SELECT * FROM relationship_matrix WHERE agent=$1'
        const cvalues = [ agent ]

        const test = await this.client.query(check, cvalues);
        let query = '';
        let values = [];

        if (test && test.rows && test.rows.length > 0) {
            query = "UPDATE relationship_matrix SET matrix=$1 WHERE agent=$2"
            values = [matrix, agent];
        } else {
            query = "INSERT INTO relationship_matrix(agent, matrix) VALUES($1, $2)"
            values = [agent, matrix];
        }

        await this.client.query(query, values);
    }
    async getRelationshipMatrix(agent) {
        const query = 'SELECT * FROM relationship_matrix WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].matrix;
        } else {
            return this.getRelationshipMatrix('common');
        }
    }
    async setPersonalityQuestions(questions) {
        const res = await this.getPersonalityQuestions();
        let query = '';
        let values = [];

        if (res.length > 0) {
            query = "UPDATE personality_questions SET questions=$1 WHERE index=$2"
            values = [questions, 0];
        } else {
            query = "INSERT INTO personality_questions(_index, questions) VALUES($1, $2)"
            values = [0, questions];
        }

        await this.client.query(query, values);
    }
    async getPersonalityQuestions() {
        const query = 'SELECT * FROM personality_questions WHERE _index=0'
        
        const row = await this.client.query(query);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].questions;
        } else {
            return '';
        }
    }
    async setSpeakerProfaneResponses(agent, responses) {
        const query = "INSERT INTO speaker_profane_responses(agent, response) VALUES($1, $2)"
        const values = [agent, responses];

        await this.client.query(query, values);
    }
    async getSpeakerProfaneResponses(agent) {
        const query = 'SELECT * FROM speaker_profane_responses WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            let res = '';
            for (let i = 0; i < row.length; i++) {
                res += row[i].rows.response + '\n';
            }
            return res;
        } else {
            return '';
        }
    }
    async setSensitiveResponses(agent, responses) {
        const query = "INSERT INTO sensitive_responses(agent, response) VALUES($1, $2)"
        const values = [agent, responses];

        await this.client.query(query, values);
    }
    async getSensitiveResponses(agent) {
        const query = 'SELECT * FROM sensitive_responses WHERE agent=$1'
        const values = [agent];
        
        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            let res = '';
            for (let i = 0; i < row.length; i++) {
                res += row[i].rows.response + '\n';
            }
            return res;
        } else {
            return '';
        }
    }
    async setProfanceResponses(agent, responses) {
        const query = "INSERT INTO profane_responses(agent, response) VALUES($1, $2)"
        const values = [agent, responses];

        await this.client.query(query, values);
    }
    async getProfaneResponses(agent) {
        const query = 'SELECT * FROM profane_responses WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return rows.row[0].responses;
        } else {
            return '';
        }
    }
    async setRating(agent, rating) {
        const check = 'SELECT * FROM rating WHERE agent=$1'
        const cvalues = [ agent ]

        const test = await this.client.query(check, cvalues);
        let query = '';
        let values = [];

        if (test && test.rows && test.rows.length > 0) {
            query = "UPDATE rating SET rating=$1 WHERE agent=$2"
            values = [rating, agent];
        } else {
            query = "INSERT INTO rating(agent, rating) VALUES($1, $2)"
            values = [agent, rating];
        }

        await this.client.query(query, values);
    }
    async getRating(agent) {
        const query = 'SELECT * FROM rating WHERE agent=$1'
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row[0].row.rating;
        } else {
            return '';
        }
    }
    async getAgentsFactsSummarization() {
        const query = 'SELECT * FROM agent_fact_summarization';
        
        const rows = await this.client.query(query);
        if (rows && rows.length > 0) {
            return rows.rows[0]._sum;
        } else {
            return '';
        }
    }
    async getAgentsConfig(agent) {
        const query = 'SELECT * FROM agent_config WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].config;
        } else {
            return this.getAgentsConfig('common');
        }
    }

    async getAgentExists(agent) {
        const query = 'SELECT * FROM agents WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return true;
        } else {
            return false;
        }
    }
    async setAgentExists(agent) {
        if (await this.getAgentExists(agent)) {
            return;
        }

        const query = 'INSERT INTO agents(agent) VALUES($1)'
        const values = [agent];

        await this.client.query(query, values);
    }
    async getAgents() {
        const query = 'SELECT * FROM agents';
        
        const rows = await this.client.query(query);
        if (rows && rows.rows && rows.rows.length > 0) {
            const res = [];
            for(let i = 0; i < rows.rows.length; i++) {
                res.push(rows.rows[i].agent);
            }
            return res;
        } else {
            return [];
        }
    }

    async getActions(agent) {
        const query = 'SELECT * FROM actions WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].actions;
        } else {
            return '';
        }
    }
    async setActions(agent, actions) {
        const check = 'SELECT * FROM actions WHERE agent=$1'
        const cvalues = [ agent ]

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE actions SET actions=$1 WHERE agent=$2'
            const values = [actions, agent];

            await this.client.query(query, values);
        } else {
            const query = "INSERT INTO actions(agent, actions) VALUES($1, $2)"
            const values = [agent, actions];

            await this.client.query(query, values);
        }
    }

    async getContext(agent = 'common') {
        const query = 'SELECT * FROM context WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].context;
        } else {
            return '';
        }
    }

    async setRoom(agent, room) {
        const check = 'SELECT * FROM room WHERE agent=$1'
        const cvalues = [ agent ]

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE room SET room=$1 WHERE agent=$2'
            const values = [room, agent];

            await this.client.query(query, values);
        } else {
            const query = "INSERT INTO room(agent, room) VALUES($1, $2)"
            const values = [agent, room];

            await this.client.query(query, values);
        }
    }
    async getRoom(agent) {
        const query = 'SELECT * FROM room WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].room;
        } else {
            return '';
        }
    }

    async getMorals(agent = 'common') {
        const query = 'SELECT * FROM morals WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].morals;
        } else {
            return '';
        }
    }

    async setEthics(agent, ethics) {
        const check = 'SELECT * FROM ethics WHERE agent=$1';
        const cvalues = [agent];

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE ethics SET ethics=$1 WHERE agent=$2';
            const values = [ethics, agent];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO ethics(agent, ethics) VALUES($1, $2)';
            const values = [agent, ethics];

            await this.client.query(query, values);
        }
    }
    async getEthics(agent) {
        const query = 'SELECT * FROM ethics WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].ethics;
        } else {
            return '';
        }
    }
    async setDefaultEthics(agent) {
        const query = 'INSERT INTO ethics(agent, ethics) VALUES($1, $2)';
        const values = [agent, ''];

        await this.client.query(query, values);
    }
    async setDefaultNeedsAndMotivations(agent) {
        const query = 'INSERT INTO needs_motivations(agent, needs_motivations) VALUES($1, $2)';
        const values = [agent, '$speaker: What would you say your needs are?\n$agent: I need to make friends with others who can house me and take care of me.'];
        
        await this.client.query(query, values);
    }

    async setPersonality(agent, personality) {
        const query = 'INSERT INTO personality(agent, personality) VALUES($1, $2)';
        const values = [agent, personality];

        await this.client.query(query, values);
    }
    async getPersonality(agent) {
        const query = 'SELECT * FROM personality WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].personality;
        } else {
            return '';
        }
    }

    async setNeedsAndMotivations(agent, needs_motivations) {
        const check = 'SELECT * FROM needs_motivations WHERE agent=$1';
        const cvalues = [agent];

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE needs_motivations SET needs_motivations=$1 WHERE agent=$2';
            const values = [needs_motivations, agent];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO needs_motivations(agent, needs_motivations) VALUES($1, $2)';
            const values = [agent, needs_motivations];

            await this.client.query(query, values);
        }
    }

    async getNeedsAndMotivations(agent) {
        const query = 'SELECT * FROM needs_motivations WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].needs_motivations;
        } else {
            return '';
        }
    }

    async getDialogue(agent) {
        const query = 'SELECT * FROM dialogue WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].dialogue;
        } else {
            return '';
        }
    }
    async setDialogue(agent, dialogue) {
        const check = 'SELECT * FROM dialogue WHERE agent=$1';
        const cvalues = [agent];

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE dialogue SET dialogue=$1 WHERE agent=$2';
            const values = [dialogue, agent];

            await this.client.query(query, values);
        } else {
            const query = 'INSERT INTO dialogue(agent, dialogue) VALUES($1, $2)';
            const values = [agent, dialogue];

            await this.client.query(query, values);
        }
    }

    async setMonologue(agent, monologue) {
        const check = 'SELECT * FROM monologue WHERE agent=$1';
        const cvalues = [agent];

        const test = await this.client.query(check, cvalues);

        if (test && test.rows && test.rows.length > 0) {
            const query = 'UPDATE monologue SET monologue=$1 WHERE agent=$2';
            const values = [monologue, agent];

            await this.client.query(query, values);
        }
        else {
            const query = 'INSERT INTO monologue(agent, monologue) VALUES($1, $2)';
            const values = [agent, monologue];

            await this.client.query(query, values);
        }
    }
    async getMonologue(agent) {
        const query = 'SELECT * FROM monologue WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].monologue;
        } else {
            return '';
        }
    }

    async addBadWord(word) {
        const query = 'INSERT INTO bad_words(word) VALUES($1)';
        const values = [word];

        await this.client.query(query, values);
    }
    async getBadWords() {
        const query = 'SELECT * FROM bad_words';
        
        const rows = await this.client.query(query);
        let res = '';
        if (rows && rows.rows && rows.rows.length > 0) {
            for(let i = 0; i < rows.rows.length; i++) {
                res += rows.rows[i].word + '\n';
            }
        }
        return res;
    }

    async addSensitiveWord(word) {
        const query = 'INSERT INTO sensitive_words(word) VALUES($1)';
        const values = [word];

        await this.client.query(query, values);
    }
    async getSensitiveWords() {
        const query = 'SELECT * FROM sensitive_words';
        
        const rows = await this.client.query(query);
        let res = '';
        if (rows && rows.rows && rows.rows.length > 0) {
            for(let i = 0; i < rows.rows.length; i++) {
                res += rows.rows[i].word + '\n';
            }
        }
        return res;
    }
    
    async addSensitivePhrase(phrase) {
        const query = 'INSERT INTO sensitive_phrases(phrase) VALUES($1)';
        const values = [phrase];

        await this.client.query(query, values);
    }
    async getSensitivePhrases() {
        const query = 'SELECT * FROM sensitive_phrases';
        
        const rows = await this.client.query(query);
        let res = '';
        if (rows && rows.rows && rows.rows.length > 0) {
            for(let i = 0; i < rows.rows.length; i++) {
                res += rows.rows[i].phrase + '\n';
            }
        }
        return res;
    }

    async addLeadingStatement(phrase) {
        const query = 'INSERT INTO leading_statements(_statement) VALUES($1)';
        const values = [phrase];

        await this.client.query(query, values);
    }
    async getLeadingStatements() {
        const query = 'SELECT * FROM leading_statements';
        
        const rows = await this.client.query(query);
        let res = '';
        if (rows && rows.rows && rows.rows.length > 0) {
            for(let i = 0; i < rows.rows.length; i++) {
                res += rows.rows[i]._statement + '\n';
            }
        }
        return res;
    }

    async onInit() {
        if ((await this.getBadWords()).length <= 0) {
            const data = fs.readFileSync(rootDir + "/filters/bad_words.txt").toString().split("\n");
            for(let i = 0; i < data.length; i++) {
                await this.addBadWord(data[i]);
            }
        }
        if ((await this.getSensitiveWords()).length <= 0) {
            const data = fs.readFileSync(rootDir + "/filters/sensitive_words.txt").toString().split("\n");
            for(let i = 0; i < data.length; i++) {
                await this.addSensitiveWord(data[i]);
            }
        }
        if ((await this.getSensitivePhrases()).length <= 0) {
            const data = fs.readFileSync(rootDir + "/filters/sensitive_phrases.txt").toString().split("\n");
            for(let i = 0; i < data.length; i++) {
                await this.addSensitivePhrase(data[i]);
            }
        }
        if ((await this.getLeadingStatements()).length <= 0) {
            const data = fs.readFileSync(rootDir + "/filters/leading_statements.txt").toString().split("\n");
            for(let i = 0; i < data.length; i++) {
                await this.addLeadingStatement(data[i]);
            }
        }
    }

    async getSpeakerFactSummarization(agent = 'common') {
        const query = 'SELECT * FROM speaker_fact_summarization WHERE agent=$1';
        const values = [agent];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            return row.rows[0].summarization;
        } else {
            return '';
        }
    }

    async getFacts(agent) {
        const query = 'SELECT * FROM facts WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            return rows.rows[0].facts;
        } else {
            return '';
        }
    }

    async getRandomStartingMessage(agent) {
        const query = 'SELECT * FROM starting_message WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            const index = getRandomNumber(0, rows.rows.length);
            if (rows.rows[index] === undefined || !rows.rows) {
                return 'Hello there!';
            }
            return rows.rows[index]._message;
        } else {
            return this.getRandomStartingMessage('common');
        }
    }
    async getStartingPhrases(agent) {
        const query = 'SELECT * FROM starting_message WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length > 0) {
            let res = '';
            for(let i = 0; i < rows.rows.length; i++) {
                if (rows.rows[i]._message.length <= 0) continue;
                res += rows.rows[i]._message + '|';
            }
            return res;
        }

        return '';
    }

    async setStartingPhrases(agent, data) {
        if (!agent || agent.length <= 0) return;
        const query = 'DELETE FROM starting_message WHERE agent=$1';
        const values = [agent];

        await this.client.query(query, values);

        const messages = data.split('|');
        for (let i = 0; i < messages.length; i++) {
            if (messages.length <= 0) continue;
            const query2 = 'INSERT INTO starting_message(agent, _message) VALUES($1, $2)';
            const values2 = [agent, messages[i]];

            await this.client.query(query2, values2);
        }
    }

    async getIgnoredKeywords(agent) {
        const query = 'SELECT * FROM ignored_keywords WHERE agent=$1 OR agent=$2';
        const values = [agent, 'common'];

        const rows = await this.client.query(query, values);
        const res = [];
        if (rows && rows.rows && rows.rows.length) {
            for(let i = 0; i < rows.rows.length; i++) {
                res.push(rows.rows[i].keyword);
            }
        }

        return res;
    }

    async getIgnoredKeywordsData(agent) {
        const query = 'SELECT * FROM ignored_keywords WHERE agent=$1';
        const values = [agent];

        const rows = await this.client.query(query, values);
        if (rows && rows.rows && rows.rows.length) {
            let res = '';
            for(let i = 0; i < rows.rows.length; i++) {
                if (rows.rows[i].keyword.length <= 0) continue;
                res += rows.rows[i].keyword + '|';
            }
            return res;
        }

        return '';
    }

    async setIgnoredKeywords(agent, data) {
        if (!agent || agent.length <= 0) return;
        const query = 'DELETE FROM ignored_keywords WHERE agent=$1';
        const values = [agent];

        await this.client.query(query, values);

        const keywords = data.split('|');
        for (let i = 0; i < keywords.length; i++) {
            if (keywords.length <= 0) continue;
            const query2 = 'INSERT INTO ignored_keywords(agent, keyword) VALUES($1, $2)';
            const values2 = [agent, keywords[i]];

            await this.client.query(query2, values2);
        }
    }

    async deleteAgent(agent) {
        let query = 'DELETE FROM agents WHERE agent=$1';
        const values = [agent];

        await this.client.query(query, values);
        
        query = 'DELETE FROM actions WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM dialogue WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM ethics WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM agent_facts WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM monologue WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM needs_motivations WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM personality WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM relationship_matrix WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM room WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM starting_message WHERE agent=$1';
        await this.client.query(query, values);
        
        query = 'DELETE FROM ignored_keywords WHERE agent=$1';
        await this.client.query(query, values);
    }

    async createAgentSQL(sql) {
        if (!sql || sql.length <= 0) {
            return false;
        }

        await this.client.query(sql);
        return true;
    }

    // async getChatFilterData(init) {
    //     const query = "SELECT * FROM chat_filter"

    //     await this.client.query(query, async (err, res) => {
    //         if (err) console.log(`${err} ${err.stack}`) 
    //         else {
    //             const half = parseInt(res.rows[0].half)
    //             const max = parseInt(res.rows[0].max)
                
    //             const query2 = "SELECT * FROM bad_words"

    //             await this.client.query(query2, (err2, res2) => {
    //                 if (err2) console.log(err2 + ' ' + err2.stack)
    //                 else {
    //                     const words = []
    //                     if (res2 !== undefined && res2.rows !== undefined) {
    //                         for(let i = 0; i < res2.rows.length; i++) {
    //                             words.push({ word: res2.rows[i].word, rating: parseInt(res2.rows[i].rating) })
    //                         }
    //                     }

    //                     if (init) new chatFilter(half, max, words)
    //                     else chatFilter.instance.update(half, max, words)
    //                 }
    //             })
    //         }
    //     })
    // }
}