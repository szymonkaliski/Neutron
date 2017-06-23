// ensure neutron api is in electron bundle
const NEUTRON_API = require('./neutron.js');

const DOM = require('react-dom-factories');
const Dropzone = require('react-dropzone');
const ReactDOM = require('react-dom');
const querystring = require('querystring');
const slash = require('slash');
const { createElement } = require('react');
const { ipcRenderer } = require('electron');

const { API_NAME, ERR, FILE_DIALOG_OPEN, FILE_DROPPED, IS_WINDOWS, LOG, REQUIRE_READY } = require('./constants');

// yeah, it's ugly, but works...
// basically I want to be able to require('neutron') to get to the API file (./neutron.js)
const patchRequire = () => {
  const Module = require('module');
  const load = Module._load;

  Module._load = (request, parent) => {
    if (request === API_NAME) {
      return NEUTRON_API;
    }

    return load(request, parent);
  };
};

patchRequire();

const windowsPath = path => (IS_WINDOWS ? slash(path) : path);

let neutronContainer;

const renderNeutron = () => {
  return DOM.div(
    {
      onClick: () => ipcRenderer.send(FILE_DIALOG_OPEN),
      style: {
        WebkitUserSelect: 'none',
        cursor: 'pointer'
      }
    },
    createElement(
      Dropzone,
      {
        style: {
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
          border: '2px solid #ddd'
        },
        activeStyle: {
          background: '#ddd',
          border: '2px solid #ccc'
        },
        disableClick: true,
        onDrop: files => {
          if (files.length >= 1) {
            ipcRenderer.send(FILE_DROPPED, files[0].path);
          }
        }
      },
      DOM.div(
        {
          style: {
            display: 'table-cell',
            textAlign: 'center',
            verticalAlign: 'middle',
            width: '100vw',
            height: '100vh',
            font: 'caption',
            color: '#777'
          }
        },
        'drag JavaScript file here, or click to select'
      )
    )
  );
};

const mountNeutron = () => {
  neutronContainer = document.createElement('div');
  document.body.appendChild(neutronContainer);
  ReactDOM.render(DOM.div({}, renderNeutron()), neutronContainer);
};

const unmountNeutron = () => {
  if (neutronContainer) {
    ReactDOM.unmountComponentAtNode(neutronContainer);
    document.body.removeChild(neutronContainer);
  }
};

const query = window.location.search.replace('?', '');
const parsedQuery = querystring.parse(query);

// only mount neutron UI if there's no file on start
if (parsedQuery.hasFile === 'false') {
  mountNeutron();
}

ipcRenderer.on(LOG, (_, log) => console.info(log));
ipcRenderer.on(ERR, (_, err) => console.error(err));

ipcRenderer.on(REQUIRE_READY, (_, { filePath, dirPath }) => {
  unmountNeutron();

  document.title = `neutron \u2014 ${filePath}`;

  console.info(`updating require global paths: ${dirPath}`);
  process.env.NODE_PATH = dirPath;
  require('module').Module._initPaths();

  console.info(`loading: ${windowsPath(filePath)}`);
  require(windowsPath(filePath));
});
