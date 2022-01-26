import customConfig from "./customConfig.js";
import { Logtail } from "@logtail/node";
import { rootDir } from "./rootDir.js";
import fs from 'fs';

let logtail = null;

export async function initLogger() {
    const logtail_key = customConfig.instance.get('logtail_key');
    if (!logtail_key || logtail_key.length <= 0 || !customConfig.instance.getBool('use_logtail')) {
        return;
    }

    logtail = new Logtail(logtail_key, { 
        ignoreExceptions: false
    });

    const logPath = rootDir + '/logs/' + new Date().toString() + '.txt';
    if (!fs.existsSync(rootDir + '/logs')) {
        fs.mkdirSync(rootDir + '/logs', { recursive: true });
    }

    if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
    }

    const logStream = fs.createWriteStream(logPath);
    logtail.pipe(logStream);
}

export function log(text) {
    if (!logtail) {
        console.log(text);
        return;
    }

    logtail.log(text);
    console.log(text);
}
export function warn(text) {
    if (!logtail) {
        console.warn(text);
        return;
    }
    
    logtail.warn(text);
    console.warn(text);
} 
export function error(text) {
    if (!logtail) {
        console.error(text);
        return;
    }
    
    logtail.error(text);
    console.error(text);
}