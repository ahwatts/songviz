// -*- mode: c -*-
uniform mat4 uProjection;
uniform mat4 uModelView;
attribute vec3 aPosition;
varying vec4 vColor;

void main(void) {
  gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
  vColor = vec4(aPosition, 1.0);
}
