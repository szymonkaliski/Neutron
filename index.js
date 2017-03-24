const argv = require('yargs').argv;
const express = require('express');
const fs = require('fs');
const getPort = require('get-port');
const path = require('path');
const url = require('url');

const { BrowserWindow, app } = require('electron');
const { watch } = require('chokidar');

let mainWindow;

const createServer = port => {
  server = express();

  server.get('/', (req, res) => {
    const { file } = req.query;

    res.send(
      `
      <head>
        <meta>
          <title>neutron &mdash; ${file}</title>
        </meta>

        <style>
          * { margin: 0; padding: 0; }
        </style>

        <script type="text/javascript">
          require('module').globalPaths.push('${path.dirname(file)}');

          console.info('loading: ${file}');

          require('${file}');
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
  const watcher = watch(path);

  const reload = () => mainWindow.reload();

  watcher.on('add', reload).on('change', reload).on('unlink', reload);
};

const createWindow = port => {
  createServer(port);

  mainWindow = new BrowserWindow({
    width: 600,
    height: 600
  });

  const inputPath = argv._[0];

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
