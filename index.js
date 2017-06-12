const fs = require('fs');
const npm = require('npm');
const path = require('path');
const recursiveDeps = require('recursive-deps');
const through2 = require('through2');
const { argv } = require('yargs');
const { removeAnsi } = require('ansi-parser');

const { BrowserWindow, app } = require('electron');
const { watch } = require('chokidar');

let mainWindow;

const sendMainWindow = (chan, ...msgs) => mainWindow && mainWindow.send(chan, ...msgs);

let shouldStream = false;

const stream = through2((msg, _, next) => {
  if (shouldStream) {
    const logStr = removeAnsi(msg.toString()).replace('[K[?25h', '').replace('[K', '').trim();

    if (logStr.length) {
      sendMainWindow('log', logStr);
    }

    next();
  }
});

const installDeps = ({ filePath, dirPath }, callback) => {
  recursiveDeps(filePath).then(deps => {
    shouldStream = true;

    npm.load(
      {
        color: false,
        loglevel: 'silent',
        logstream: stream,
        parseable: true,
        progress: true,
        unicode: false,
        maxsockets: 1,
        prefix: dirPath
      },
      err => {
        if (err) {
          shouldStream = false;
          return callback(err);
        }

        npm.commands.ls(deps, (err, data) => {
          if (err) {
            shouldStream = false;
            return callback(err);
          }

          const installedDeps = Object.keys(data.dependencies);
          const missingDeps = deps.filter(dep => installedDeps.indexOf(dep) < 0);

          if (missingDeps.length) {
            npm.commands.install(missingDeps, err => {
              if (err) {
                shouldStream = false;
                return callback(err);
              }

              shouldStream = false;
              return callback();
            });
          } else {
            shouldStream = false;
            return callback();
          }
        });
      }
    );
  });
};

const loadFile = ({ filePath, dirPath }) => {
  mainWindow.webContents.loadURL(`file://${__dirname}/index.html`);
  mainWindow.webContents.once('did-finish-load', () => {
    sendMainWindow('dir-path', dirPath);

    installDeps({ filePath, dirPath }, err => {
      if (err) {
        // TODO: handle errors
        sendMainWindow('error', err);
      }

      sendMainWindow('require-ready', filePath);
    });

    if (process.platform === 'darwin') {
      mainWindow.setRepresentedFilename(filePath);
    }
  });
};

const watchPath = ({ filePath, dirPath }) => {
  const ignored = [
    'node_modules/**',
    'bower_components/**',
    '.git',
    '.hg',
    '.svn',
    '.DS_Store',
    '*.swp',
    'thumbs.db',
    'desktop.ini'
  ];

  const watcher = watch(dirPath, { ignored, ignoreInitial: true });

  const reloadFile = () => {
    if (!mainWindow) {
      return;
    }

    loadFile({ filePath, dirPath });
  };

  watcher.on('add', reloadFile).on('change', reloadFile).on('unlink', reloadFile);
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 600
  });

  mainWindow.openDevTools();

  const inputPath = argv._[0];

  if (fs.existsSync(inputPath)) {
    const filePath = require.resolve(path.resolve(process.cwd(), inputPath));
    const dirPath = path.dirname(filePath);

    watchPath({ filePath, dirPath });
    loadFile({ filePath, dirPath });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } else {
    console.log('path is not a file or folder');
    process.exit(1);
  }
};

const start = () => {
  app.on('ready', createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });
};

start();
