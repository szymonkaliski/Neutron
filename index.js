const express = require('express');
const fs = require('fs');
const getPort = require('get-port');
const npm = require('npm');
const path = require('path');
const recursiveDeps = require('recursive-deps');
const through2 = require('through2');
const url = require('url');
const { argv } = require('yargs');
const { removeAnsi } = require('ansi-parser');

const { BrowserWindow, app } = require('electron');
const { watch } = require('chokidar');

let mainWindow;

const reloadMainWindow = () => mainWindow && mainWindow.reload();
const sendMainWindow = (chan, ...msgs) => mainWindow && mainWindow.send(chan, ...msgs);

let shouldStream = false;

const stream = through2((msg, _, next) => {
  if (shouldStream) {
    sendMainWindow('npm', removeAnsi(msg.toString()));
    next();
  }
});

const createServer = port => {
  server = express();

  server.get('/', (req, res) => {
    const { file } = req.query;

    const filePath = require.resolve(path.resolve(process.cwd(), file));
    const fileDirPath = path.dirname(filePath);
    const fileName = filePath.replace(new RegExp(`^${fileDirPath}/?`), '');

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
          prefix: fileDirPath
        },
        err => {
          if (err) {
            shouldStream = false;
            console.log({ err });
            return;
          }

          npm.commands.ls(deps, (err, data) => {
            console.log({ err });

            const installedDeps = Object.keys(data.dependencies);
            const missingDeps = deps.filter(dep => installedDeps.indexOf(dep) < 0);

            if (missingDeps.length) {
              npm.commands.install(missingDeps, (err, out) => {
                console.log({ err, out });

                shouldStream = false;

                reloadMainWindow();
              });
            } else {
              shouldStream = false;
            }
          });
        }
      );
    });

    res.send(
      `
      <head>
        <title>neutron &mdash; ${file}</title>

        <style>
          * { margin: 0; padding: 0; }
        </style>

        <script type="text/javascript">
          console.info('loading: ${fileName}');

          require('module').globalPaths.push('${fileDirPath}');

          const { ipcRenderer } = require('electron');

          ipcRenderer.on('npm', (_, arg) => {
            const log = (arg || '')
              .replace('[K[?25h', '')
              .replace('[K', '')
              .trim();

            if (log.length) {
              console.info(log);
            }
          });

          require('${fileName}');
        </script>
      </head>

      <body>
        <div id="root"></div>
      </body>
    `
    );
  });

  server.listen(port);
};

const displayFile = (port, file) => {
  const formated = url.format({
    host: `127.0.0.1:${port}`,
    path: '/',
    protocol: 'http',
    query: { file }
  });

  mainWindow.webContents.loadURL(formated);

  if (process.platform === 'darwin') {
    mainWindow.setRepresentedFilename(file);
  }
};

const watchPath = path => {
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

  const watcher = watch(path, { ignored, ignoreInitial: true });

  watcher.on('add', reloadMainWindow).on('change', reloadMainWindow).on('unlink', reloadMainWindow);
};

const createWindow = port => {
  createServer(port);

  mainWindow = new BrowserWindow({
    width: 600,
    height: 600
  });

  mainWindow.openDevTools();

  const inputPath = argv._[0];

  console.log({ argv, processArgv: process.argv })

  if (fs.existsSync(inputPath)) {
    watchPath(inputPath);

    displayFile(port, inputPath);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } else {
    console.log('path is not a file or folder');
    process.exit(1);
  }
};

const start = port => {
  app.on('ready', () => createWindow(port));

  app.on('window-all-closed', () => {
    app.quit();
  });
};

getPort().then(port => start(port));
