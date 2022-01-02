import pg from 'pg';
const { Client } = pg;

export class database {
    static instance
    bannedUsers = []

    pool
    client

    constructor(bannedUsers = []) {
        this.bannedUsers = bannedUsers
        console.log('loaded ' + this.bannedUsers.length + ' banned users!');
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