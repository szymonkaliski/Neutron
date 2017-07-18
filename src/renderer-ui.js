const DOM = require('react-dom-factories');
const Dropzone = require('react-dropzone');
const ReactDOM = require('react-dom');
const createReactClass = require('create-react-class');
const { createElement } = require('react');

const {
  FILE_DIALOG_OPEN,
  FILE_DROPPED,
} = require('./constants');

let uiContainer;

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

const mountDropzone = () => {
  if (!uiContainer) {
    uiContainer = document.createElement('div');
    document.body.appendChild(uiContainer);
    ReactDOM.render(DOM.div({}, renderNeutron()), uiContainer);
  }
};

const mountSpinner = deps => {
  if (!uiContainer) {
    uiContainer = document.createElement('div');
    document.body.appendChild(uiContainer);
    ReactDOM.render(createElement(renderSpinner, { size: 60, deps }), uiContainer);
  }
};

const unmountUI = () => {
  if (uiContainer) {
    ReactDOM.unmountComponentAtNode(uiContainer);
    document.body.removeChild(uiContainer);
    uiContainer = undefined;
  }
};

module.exports = {
  mountDropzone,
  mountSpinner,
  unmountUI
};
