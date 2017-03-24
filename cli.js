#!/usr/bin/env node

const spawn = require('child_process').spawn;
const electron = require('electron-prebuilt');
const path = require('path');

const serverPath = path.join(__dirname, './index.js');

var args = [serverPath, ...process.argv.splice(2), '--not-packaged=true'];

var proc = spawn(electron, args, { stdio: 'inherit' });

proc.on('close', code => {
  process.exit(code);
});
