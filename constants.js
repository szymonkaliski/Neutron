const constants = ['FILE_DIALOG_OPEN', 'FILE_DROPPED', 'LOG', 'ERR', 'DIR_PATH_SET', 'REQUIRE_READY'].reduce(
  (acc, key) => Object.assign(acc, { [key]: key }),
  {}
);

module.exports = constants;
