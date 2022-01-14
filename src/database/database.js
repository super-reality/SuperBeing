import pg from 'pg';
import { initProfanityFilter } from '../cognition/profanityFilter.js';
import { convertLocalToUtcTimezone } from '../connectors/utils.js';
import fs from 'fs';
import { rootDir } from '../utilities/rootDir.js';
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
                console.log('index: ' + i)
                break
            }
        }
        console.log('length: ' + olength + ' - ' + this.bannedUsers.length)
        await database.instance.unbanUser(user_id, client)
    }

    async connect() {
        //this.client = await this.pool.connect()
        this.client = new Client()
        this.client.connect()
        const res = await this.client.query('SELECT NOW()')

        await initProfanityFilter();
        await this.onInit();
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
        console.log(values)

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
                console.log(`length: ${res.length}`)
                for(let i = 0; i < res.rows.length; i++) {
                    console.log(res.rows[i])
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

        await this.client.query(query, (err, res) => {
            if (err) console.log(`${err} ${err.stack}`)
                else database.instance.bannedUsers = res.rows
        });
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
    currentI = 0;
    async getConversation(agent, sender, client, channel, archive) {
        const query = 'SELECT * FROM conversation WHERE agent=$1 AND client=$2 AND channel=$3 AND (sender=$4 OR sender=$5) AND archive=$6'
        const values = [ agent, client, channel, sender, agent, archive ];

        const row = await this.client.query(query, values);
        if (row && row.rows && row.rows.length > 0) {
            /*row.rows.sort(function(a, b) {
                return new Date(b.date) - new Date(a.date);
            });*/
            //row.rows = row.rows.reverse();
            const max_length = parseInt(process.env.CHAT_HISTORY_MESSAGES_COUNT);
            const length = row.rows.length > max_length ? max_length : row.rows.length;
            let data = '';
            for(let i = 0; i < length; i++) {
                if (!row.rows[i].text || row.rows[i].text.length <= 0) continue;
                data += row.rows[i].sender + ': ' + row.rows[i].text + '\n';
            }
            this.currentI++;
            fs.writeFileSync(rootDir + '/data' + this.currentI + '.txt', data);
            return data;
        } else {
            return '';
        }
    }
    async clearConversations() {
        const query = 'DELETE FROM conversation';
        await this.client.query(query, values);
    }
    async setSpeakersModel(agent, speaker, model) {
        const res = this.getSpeakersModel(agent, speaker);
        let query = '';
        let values = [];
        
        if (res.length > 0) {
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
        const res = this.getSpeakersFacts(agent, speaker);
        let query = '';
        let values = [];

        if (res.length > 0) {
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
    async setAgentFacts(agent, facts) {
        const res = await this.getAgentFacts(agent);
        let query = '';
        let values = [];

        if (res.length > 0) {
            const newFacts = res[0].facts + '\n' + facts;
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
        const res = await this.getMeta(agent, speaker);
        let query = '';
        let values = [];

        if (res.length > 0) {
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
        const res = await this.getRelationshipMatrix(agent);
        let query = '';
        let values = [];

        if (res.length > 0) {
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
        const res = await this.getRating(agent);
        let query = '';
        let values = [];

        if (res.length > 0) {
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
        if (this.getAgentExists(agent)) {
            return;
        }

        const query = 'INSERT INTO agents(agent) VALUES($1)';
        const values = [agent];

        await this.client.query(query, values);
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