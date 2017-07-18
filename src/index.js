const fs = require('fs');
const isBuiltinModule = require('is-builtin-module');
const isDev = require('electron-is-dev');
const npm = require('npm');
const path = require('path');
const recursiveDeps = require('recursive-deps');
const through2 = require('through2');
const { argv } = require('yargs');
const { removeAnsi } = require('ansi-parser');

const { Menu, BrowserWindow, app, dialog, ipcMain } = require('electron');
const { watch } = require('chokidar');

const checkSyntax = require('./check-syntax');
const runAutoUpdater = require('./auto-updater');

const { API_NAME, ERR, FILE_DIALOG_OPEN, FILE_DROPPED, LOG, REQUIRE_READY, INSTALLING_DEPS } = require('./constants');

let mainWindow;
let isInstallingDeps = false;

const sendMainWindow = (chan, ...msgs) => mainWindow && mainWindow.send(chan, ...msgs);

const stream = through2((msg, _, next) => {
  if (isInstallingDeps) {
    const logStr = removeAnsi(msg.toString()).replace('[K[?25h', '').replace('[K', '').trim();

    if (logStr.length) {
      sendMainWindow(LOG, logStr);
    }

    next();
  }
});

const ensurePackageJson = ({ dirPath }) => {
  const packageJsonPath = path.join(dirPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    fs.writeFileSync(packageJsonPath, '{}', { encoding: 'utf8' });
  }
};

const installDeps = ({ filePath, dirPath }, callback) => {
  isInstallingDeps = true;

  ensurePackageJson({ dirPath });

  const entryFileError = checkSyntax(filePath);
  if (entryFileError) {
    return callback(entryFileError);
  }

  recursiveDeps(filePath).then(deps => {
    npm.load(
      {
        color: false,
        loglevel: 'silent',
        logstream: stream,
        maxsockets: 1,
        parseable: true,
        prefix: dirPath,
        progress: true,
        save: true,
        unicode: false
      },
      err => {
        if (err) {
          isInstallingDeps = false;
          return callback(err);
        }

        npm.commands.ls(deps, (_, data) => {
          const installedDeps = Object.keys(data.dependencies).filter(
            key => data.dependencies[key].missing === undefined
          );

          const missingDeps = deps
            .filter(dep => installedDeps.indexOf(dep) < 0)
            .filter(dep => dep !== API_NAME)
            .filter(dep => !isBuiltinModule(dep));

          if (missingDeps.length) {
            sendMainWindow(INSTALLING_DEPS, missingDeps);

            npm.commands.install(missingDeps, err => {
              isInstallingDeps = false;

              if (err) {
                return callback(err);
              }

              callback();
            });
          } else {
            isInstallingDeps = false;

            return callback();
          }
        });
      }
    );
  });
};

const loadFile = ({ filePath, dirPath }) => {
  mainWindow.webContents.loadURL(`file://${__dirname}/index.html?hasFile=true`);

  mainWindow.webContents.once('did-finish-load', () => {
    installDeps({ filePath, dirPath }, err => {
      if (err) {
        // TODO: handle errors
        sendMainWindow(ERR, err.toString());
      } else {
        sendMainWindow(REQUIRE_READY, { filePath, dirPath });
      }
    });

    if (process.platform === 'darwin') {
      mainWindow.setRepresentedFilename(filePath);
    }
  });
};

const watchPath = ({ filePath, dirPath }) => {
  const ignored = ['node_modules/**', '**/node_modules/**', '.git', '.hg', '.svn'];

  const watchGlob = `${dirPath}/**/*.js`;
  const watcher = watch(watchGlob, {
    ignored,
    ignoreInitial: true
  });

  const reloadFile = () => {
    if (!mainWindow || isInstallingDeps) {
      return;
    }

    loadFile({ filePath, dirPath });
  };

  watcher.on('change', reloadFile);
};

const runWatcherAndLoadFile = inputPath => {
  if (!fs.existsSync(inputPath)) {
    return;
  }

  const filePath = require.resolve(path.resolve(process.cwd(), inputPath));
  const dirPath = path.dirname(filePath);

  watchPath({ filePath, dirPath });
  loadFile({ filePath, dirPath });
};

const openFileDialog = () => {
  dialog.showOpenDialog(
    {
      properties: ['openFile'],
      filters: [{ name: 'JavaScript', extensions: ['js'] }, { name: 'All files', extensions: ['*'] }]
    },
    paths => {
      if (paths && paths.length > 0) {
        runWatcherAndLoadFile(paths[0]);
      }
    }
  );
};

const setMenu = () => {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Neutron',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [{ label: 'Open', accelerator: 'CmdOrCtrl+O', click: openFileDialog }]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Toggle Devtools',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            if (mainWindow) {
              mainWindow.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    { label: 'Help', role: 'help' }
  ]);

  Menu.setApplicationMenu(menu);
};

const createWindow = () => {
  const inputPath = argv._[0];

  mainWindow = new BrowserWindow({
    width: 600,
    height: 600
  });

  setMenu();

  mainWindow.webContents.loadURL(`file://${__dirname}/index.html?hasFile=${!!inputPath}`);

  mainWindow.on('closed', () => (mainWindow = null));

  ipcMain.on(FILE_DROPPED, (_, inputPath) => runWatcherAndLoadFile(inputPath));
  ipcMain.on(FILE_DIALOG_OPEN, openFileDialog);

  if (inputPath) {
    runWatcherAndLoadFile(inputPath);
  }
};

const start = () => {
  app.commandLine.appendSwitch('enable-web-bluetooth');

  app.on('ready', createWindow);

  app.on('open-file', (e, filePath) => {
    e.preventDefault();
    runWatcherAndLoadFile(filePath);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  if (!isDev) {
    runAutoUpdater();
  }
};

start();
