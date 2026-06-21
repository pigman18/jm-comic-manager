import { spawn, exec } from 'child_process';
import http from 'http';

function checkViteReady(url, callback) {
  const req = http.get(url, () => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
}

console.log('Starting Vite development server...');

const vite = spawn('npx.cmd', ['vite'], { 
  stdio: 'inherit',
  shell: true 
});

function cleanExit(code = 0) {
  if (vite.pid) {
    exec(`taskkill /pid ${vite.pid} /T /F`, () => {
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

console.log('Waiting for Vite server to boot...');
const checkInterval = setInterval(() => {
  checkViteReady('http://localhost:5173', (ready) => {
    if (ready) {
      clearInterval(checkInterval);
      console.log('✓ Vite server is ready! Launching ewvjs desktop window...');
      
      const app = spawn('node', ['app.js', '--dev'], { stdio: 'inherit', shell: true });
      
      app.on('close', (code) => {
        console.log(`ewvjs window closed (exit code ${code}). Cleaning up loops...`);
        cleanExit(code);
      });
    }
  });
}, 300);


process.on('SIGINT', () => cleanExit(0));
process.on('SIGTERM', () => cleanExit(0));