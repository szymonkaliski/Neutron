// SerialPort as dep

const SerialPort = require('serialport');

// API

const electron = require('electron');

const getWindow = electron.remote.getCurrentWindow;

const getWindowSize = () => {
  const size = getWindow().getSize();
  return { width: size[0], height: size[1] };
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

const getDisplays = electron.screen.getAllDisplays;

module.exports = {
  SerialPort,
  setWindowSize,
  getWindowSize,
  isResizable,
  setResizable,
  getPosition,
  setPosition,
  isFullscreen,
  setFullscreen,
  getDisplays,

  getElectronRemote: () => electron.remote,
  getElectronWindow: getWindow
};
