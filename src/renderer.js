// ensure neutron api is in electron bundle
const NEUTRON_API = require('./neutron.js');

const querystring = require('querystring');
const { ipcRenderer } = require('electron');

const checkSyntax = require('./check-syntax');
const { mountDropzone, mountSpinner, unmountUI } = require('./renderer-ui');
const { windowsPath } = require('./utils');

const { API_NAME, ERR, LOG, REQUIRE_READY, INSTALLING_DEPS } = require('./constants');

// patch console.error so it auto-opens devtools
const patchConsoleError = () => {
  const realConsoleError = console.error;

  console.error = (...args) => {
    NEUTRON_API.openDevTools();
    realConsoleError(...args);
  };
};

patchConsoleError();

// yeah, it's ugly, but works...
// basically I want to be able to require('neutron') to get to the API file (./neutron.js)
// also - simple error checking
const patchRequire = () => {
  const Module = require('module');
  const load = Module._load;

  Module._load = (request, parent) => {
    if (request === API_NAME) {
      return NEUTRON_API;
    }

    if (request.match(/^\.\//)) {
      const err = checkSyntax(request);

      if (err) {
        console.error(err.toString());
        return undefined;
      }
    }

    return load(request, parent);
  };
};

patchRequire();

const query = window.location.search.replace('?', '');
const parsedQuery = querystring.parse(query);

// only mount neutron UI if there's no file on start
if (parsedQuery.hasFile === 'false') {
  mountDropzone();
}

ipcRenderer.on(LOG, (_, log) => console.info(log));
ipcRenderer.on(ERR, (_, err) => console.error(err));

ipcRenderer.on(INSTALLING_DEPS, (_, deps) => {
  unmountUI();
  mountSpinner(deps);
});

ipcRenderer.on(REQUIRE_READY, (_, { filePath, dirPath }) => {
  unmountUI();

  document.title = `neutron \u2014 ${filePath}`;

  console.info(`updating require global paths: ${dirPath}`);
  process.env.NODE_PATH = dirPath;
  require('module').Module._initPaths();

  console.info(`loading: ${windowsPath(filePath)}`);
  require(windowsPath(filePath));
});
