const constants = ['FILE_DIALOG_OPEN', 'FILE_DROPPED', 'LOG', 'ERR', 'REQUIRE_READY'].reduce(
  (acc, key) => Object.assign(acc, { [key]: key }),
  {}
);

constants.IS_WINDOWS = require('os').platform() === 'win32';
constants.API_NAME = 'neutron';

module.exports = constants;
