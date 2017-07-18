const slash = require('slash');
const { IS_WINDOWS } = require('./constants');

const windowsPath = path => (IS_WINDOWS ? slash(path) : path);

module.exports = { windowsPath };

