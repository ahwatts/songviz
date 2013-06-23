// -*- mode: c -*-
precision mediump float;

varying vec4 vColor;

void main(void) {
  float ignored = 1.0;
  vec3 real_color = normalize(abs(vColor.rgb));
  gl_FragColor = vec4(real_color, vColor.a);
}
