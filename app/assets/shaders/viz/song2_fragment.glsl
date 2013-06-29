// -*- mode: c -*-
precision mediump float;

void main(void) {
  if (gl_FrontFacing) {
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
  } else {
    gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
  }
}
