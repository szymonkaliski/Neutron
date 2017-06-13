const DOM = require('react-dom-factories');
const ReactDOM = require('react-dom');
const slash = require('slash');
const { ipcRenderer } = require('electron');

const IS_WINDOWS = require('os').platform() === 'win32';

const windowsPath = path => (IS_WINDOWS ? slash(path) : path);

let neutronContainer;

const renderNeutron = () => {
  return DOM.div({}, 'Neutron');
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

ipcRenderer.on('log', (_, log) => console.info(log));
ipcRenderer.on('error', (_, err) => console.error(err));

ipcRenderer.on('dir-path', (_, dirPath) => {
  console.info(`updating require global paths: ${dirPath}`);
  require('module').globalPaths.push(windowsPath(dirPath));
});

ipcRenderer.on('require-ready', (_, filePath) => {
  unmountNeutron();

  document.title = `neutron \u2014 ${filePath}`;

  console.info(`loading: ${windowsPath(filePath)}`);
  require(windowsPath(filePath));
});

