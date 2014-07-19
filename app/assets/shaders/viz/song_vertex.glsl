attribute float amplitude;
varying vec4 vColor;

void main(void) {
  gl_Position = projectionMatrix * modelViewMatrix *
    vec4(position.x, position.y * amplitude * 256.0, position.z, 1.0);
  vColor = vec4(amplitude, 0.0, 0.5, 1.0);
}
