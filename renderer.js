// ensure neutron api is in electron bundle
const NEUTRON_API = require('./neutron.js');

const DOM = require('react-dom-factories');
const Dropzone = require('react-dropzone');
const Module = require('module');
const ReactDOM = require('react-dom');
const slash = require('slash');
const { createElement } = require('react');
const { ipcRenderer } = require('electron');

const {
  API_NAME,
  ERR,
  FILE_DIALOG_OPEN,
  FILE_DROPPED,
  IS_WINDOWS,
  LOG,
  REQUIRE_READY
} = require('./constants');

// yeah, it's ugly, but works...
// basically I want to be able to require('neutron') to get to the API file (./neutron.js)
const patchRequireForNeutronApi = () => {
  const load = Module._load;

  Module._load = (request, parent) => {
    if (request === API_NAME) {
      return NEUTRON_API;
    }

    return load(request, parent);
  };
};

patchRequireForNeutronApi();

const windowsPath = path => (IS_WINDOWS ? slash(path) : path);

let neutronContainer;

const renderNeutron = () => {
  return DOM.div(
    { onClick: () => ipcRenderer.send(FILE_DIALOG_OPEN) },
    createElement(Dropzone, {
      disableClick: true,
      onDrop: files => {
        if (files.length >= 1) {
          ipcRenderer.send(FILE_DROPPED, files[0].path);
        }
      }
    })
  );
};

const mountNeutron = () => {
  neutronContainer = document.createElement('div');
  document.body.appendChild(neutronContainer);
  ReactDOM.render(DOM.div({}, renderNeutron()), neutronContainer);
};

const unmountNeutron = () => {
  ReactDOM.unmountComponentAtNode(neutronContainer);
  document.body.removeChild(neutronContainer);
};

mountNeutron();

ipcRenderer.on(LOG, (_, log) => console.info(log));
ipcRenderer.on(ERR, (_, err) => console.error(err));

ipcRenderer.on(REQUIRE_READY, (_, { filePath, dirPath }) => {
  unmountNeutron();

  document.title = `neutron \u2014 ${filePath}`;

  console.info(`updating require global paths: ${dirPath}`);
  Module.globalPaths.push(windowsPath(dirPath));

  console.info(`loading: ${windowsPath(filePath)}`);
  require(windowsPath(filePath));
});
