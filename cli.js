#!/usr/bin/env node

const electron = require('electron-prebuilt');
const path = require('path');
const { spawn } = require('child_process');

const neutronPath = path.join(__dirname, './index.js');

const args = [neutronPath, ...process.argv.splice(2), '--not-packaged=true'];

const neutron = spawn(electron, args, { stdio: 'inherit' });

neutron.on('close', code => process.exit(code));
