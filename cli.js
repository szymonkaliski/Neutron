#!/usr/bin/env node

const electron = require('electron-prebuilt');
const path = require('path');
const { argv } = require('yargs');
const { spawn } = require('child_process');

const serverPath = path.join(__dirname, './index.js');

const filePath = require.resolve(path.resolve(process.cwd(), argv._[0]));
const fileDirPath = path.dirname(filePath);
const fileName = filePath.replace(new RegExp(`^${fileDirPath}/?`), '');

console.log({ serverPath, filePath, fileDirPath, fileName });

const args = [serverPath, fileName, '--not-packaged=true'];

const neutron = spawn(electron, args, {
  cwd: fileDirPath,
  stdio: 'inherit'
});

neutron.on('close', code => {
  process.exit(code);
});
