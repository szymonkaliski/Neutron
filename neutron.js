// SerialPort as dep

const SerialPort = require('serialport');
const Midi = require('midi');

// API

const electron = require('electron');

const getDisplays = electron.screen.getAllDisplays;
const getWindow = electron.remote.getCurrentWindow;

const getWindowSize = () => {
  const size = getWindow().getSize();
  return { width: size[0], height: size[1] };
};
const getContentSize = () => {
  return { width: window.innerWidth, height: window.innerHeight };
};
const setWindowSize = getWindow().setSize;

const isResizable = getWindow().isResizable;
const setResizable = getWindow().setResizable;

const getPosition = () => {
  const position = getWindow().getPosition();
  return { x: position[0], y: position[1] };
};
const setPosition = getWindow().setPosition;

const isFullscreen = getWindow().isFullscreen;
const setFullscreen = getWindow().setFullscreen;

const openDevTools = getWindow().openDevTools;
const closeDevTools = getWindow().closeDevTools;

module.exports = {
  SerialPort,
  Midi,

  getWindowSize,
  getContentSize,
  setWindowSize,
  isResizable,
  setResizable,
  getPosition,
  setPosition,
  isFullscreen,
  setFullscreen,
  getDisplays,
  openDevTools,
  closeDevTools,

  getElectronRemote: () => electron.remote,
  getElectronWindow: getWindow
};
