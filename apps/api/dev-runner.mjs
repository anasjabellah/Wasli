import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });

const compiler = spawn('npx tsc -p tsconfig.build.json --watch --preserveWatchOutput', {
  stdio: 'inherit',
  shell: true,
});
const server = spawn('node --watch dist/main.js', {
  stdio: 'inherit',
  shell: true,
});

function stop() {
  compiler.kill();
  server.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
