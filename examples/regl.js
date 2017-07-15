const regl = require('regl')();

const drawTriangle = regl({
  frag: `
    precision mediump float;
    uniform vec4 color;
    void main() {
      gl_FragColor = color;
    }`,

  vert: `
    precision mediump float;
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0, 1);
    }`,

  attributes: {
    position: regl.buffer([
      [-2, -2],
      [4, -2],
      [4, 4]
    ])
  },

  uniforms: {
    color: regl.prop('color')
  },

  count: 3
});

regl.frame(({ time }) => {
  regl.clear({
    color: [0, 0, 0, 0],
    depth: 1
  });

  drawTriangle({
    color: [Math.cos(time * 0.001), Math.sin(time * 0.0008), Math.cos(time * 0.003), 1]
  });
});
