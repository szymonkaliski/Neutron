const constants = ['FILE_DIALOG_OPEN', 'FILE_DROPPED', 'LOG', 'ERR', 'REQUIRE_READY'].reduce(
  (acc, key) => Object.assign(acc, { [key]: key }),
  {}
);

constants.ELECTRON_VERSION = require('./package.json').devDependencies['electron-prebuilt'].replace('^', '');

module.exports = constants;
