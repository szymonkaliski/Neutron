const fs = require('fs');
const path = require('path');
const syntaxCheck = require('syntax-error');

const { windowsPath } = require('./utils');

const checkSyntax = file => {
  const fileWithExt = file.match(/\.js/) ? file : `${file}.js`;
  const filePath = windowsPath(path.join(process.env.NODE_PATH || '', fileWithExt));
  const source = fs.readFileSync(filePath);
  const error = syntaxCheck(source, filePath);

  return error;
};

module.exports = checkSyntax;

