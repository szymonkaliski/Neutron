// ensure neutron api is in electron bundle
const NEUTRON_API = require('./neutron.js');

const DOM = require('react-dom-factories');
const Dropzone = require('react-dropzone');
const ReactDOM = require('react-dom');
const createReactClass = require('create-react-class');
const querystring = require('querystring');
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
  REQUIRE_READY,
  INSTALLING_DEPS
} = require('./constants');

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

const renderSpinner = createReactClass({
  componentDidMount: function() {
    const spinnerSize = this.props.size;
    const spinnerR = spinnerSize / 2 - 10;
    const circleR = 2;
    const numCircles = 8;

    const ctx = this.ref.getContext('2d');

    const fillCircle = (ctx, x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      ctx.fill();
    };

    const getTime = () => new Date().getTime();
    const start = getTime();

    const loop = () => {
      const now = getTime() - start;

      ctx.clearRect(0, 0, spinnerSize, spinnerSize);
      ctx.fillStyle = '#777';

      for (let i = 0; i < numCircles; ++i) {
        const x = spinnerSize / 2 + Math.sin(i / numCircles * Math.PI * 2) * spinnerR;
        const y = spinnerSize / 2 + Math.cos(i / numCircles * Math.PI * 2) * spinnerR;
        const modR = circleR * (Math.sin((now / 1200 + i / numCircles) * Math.PI * 2) + 1.5) * 0.6;

        fillCircle(ctx, x, y, modR);
      }

      requestAnimationFrame(loop);
    };

    loop();
  },

  shouldComponentUpdate: () => false,

  render: function() {
    return DOM.div(
      {},
      DOM.canvas({
        ref: ref => (this.ref = ref),
        width: this.props.size,
        height: this.props.size,
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -this.props.size / 2,
          marginTop: -this.props.size / 2
        }
      }),
      this.props.deps.length &&
        DOM.div(
          {
            style: {
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              marginTop: this.props.size / 2 + 20,
              font: 'caption',
              color: '#777',
              textAlign: 'center'
            }
          },
          `Installing missing deps: ${this.props.deps.join(', ')}...`
        )
    );
  }
});

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
  if (!neutronContainer) {
    neutronContainer = document.createElement('div');
    document.body.appendChild(neutronContainer);
    ReactDOM.render(DOM.div({}, renderNeutron()), neutronContainer);
  }
};

const mountSpinner = deps => {
  if (!neutronContainer) {
    neutronContainer = document.createElement('div');
    document.body.appendChild(neutronContainer);
    ReactDOM.render(createElement(renderSpinner, { size: 60, deps }), neutronContainer);
  }
};

const unmountNeutron = () => {
  if (neutronContainer) {
    ReactDOM.unmountComponentAtNode(neutronContainer);
    document.body.removeChild(neutronContainer);
    neutronContainer = undefined;
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

ipcRenderer.on(INSTALLING_DEPS, (_, deps) => {
  unmountNeutron();
  mountSpinner(deps);
});

ipcRenderer.on(REQUIRE_READY, (_, { filePath, dirPath }) => {
  unmountNeutron();

  document.title = `neutron \u2014 ${filePath}`;

  console.info(`updating require global paths: ${dirPath}`);
  process.env.NODE_PATH = dirPath;
  require('module').Module._initPaths();

  console.info(`loading: ${windowsPath(filePath)}`);
  require(windowsPath(filePath));
});
