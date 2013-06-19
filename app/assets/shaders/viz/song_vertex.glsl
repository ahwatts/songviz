// -*- mode: c -*-

// projectionMatrix, modelViewMatrix, and position (among others) are
// defined by three.js.

attribute vec4 aColor;
varying vec4 vColor;

void main(void) {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vColor = aColor;
}
