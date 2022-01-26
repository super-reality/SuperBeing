import { createServer } from "http";
import express, { urlencoded, json } from 'express';
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { log } from "./logger.js";

export let app;

export async function createExpressServer() {
    //creates an express servr and enables CORs for it
    app = express();
    const router = express.Router();
        
    const server = createServer(app);
        
    app.use(json());

    server.listen(process.env.SOCKETIO_PORT, () => {
        console.log();
    })
            
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    
    //to enable all remote clients use '*' in the allowed origins, otherwise just put the URLs that will be allowed
    const allowedOrigins = ['*']
    //dissalowed origins can be used to block some URLs, it should be used only if allowedOrigins is set to allow all
    const dissalowedOrigins = [ /*'http://localhost:3001'*/ ]
    const corsOptions = {
        origin: function (origin, callback) {
            log("Origin is", origin);
            if (dissalowedOrigins.indexOf(origin) !== -1) {
                callback(new Error('Not allowed by CORS'));
            }
            else if (allowedOrigins.indexOf('*') !== -1) {
                callback(null, true);
            } 
            else {
                if (allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        }
    }
        
    app.use(cors(corsOptions));
    router.use(urlencoded({ extended: false }));
    
    await registerRoutes(app);
    
    app.listen(process.env.PORT, () => { log(`Server listening on http://localhost:${process.env.PORT}`); })
}