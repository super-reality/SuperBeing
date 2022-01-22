import { spawn } from 'child_process';

/*
    The app handler is used as the initialization script,
    it runs the server as a standalone app, it gets it's logs and errors
    and in case it closes based on the exit code it will restart it automatically
*/
(async function () {
    await run();
})();

async function run() {
    const server = await spawn('node', ['src/index.js']);

    server.on('exit', function(code) {
        console.log('Child process exited with exit code ' + code);
        if (code === 1) {
            run();
        }
    });

    server.stdout.on('data', function(data) {
        if (!data|| data === undefined || data.toString().length <= 0) return;
        console.log(data.toString());
    });

    server.stderr.on('data', function(data) {
        if (!data|| data === undefined || data.toString().length <= 0) return;
        console.log('error: ' + data.toString());
    });
}