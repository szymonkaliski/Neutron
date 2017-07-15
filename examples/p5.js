var p5 = require('p5');
var neutron = require('neutron');

window.setup = function() {
  var size = neutron.getContentSize();

  createCanvas(size.width, size.height);
};

window.draw = function() {
  var size = neutron.getContentSize();

  background('white');
  fill('blue');
  ellipse(size.width / 2, size.height / 2, 20, 20);
};

new p5();
