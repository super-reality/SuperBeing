import { exec, spawn } from 'child_process';

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
        console.log(data.toString());
    });

    server.stderr.on('data', function(data) {
        console.log('error: ' + error);
    });
}