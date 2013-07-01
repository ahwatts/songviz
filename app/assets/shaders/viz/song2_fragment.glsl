// -*- mode: c -*-
precision mediump float;

varying float vAmplitude;

// This is a broken hsv conversion algorithm. Think of it more like
// converting an hsv to rgb where s and v are both 1, and h e [0..1]
// is mapped on to [blue..red].
void hue_to_rgb(in float h, out vec3 rgb) {
  int i;
  float f, h2;

  // The default hsv to rgb algorithm would go from red (i = 0) to
  // cyan (i = 3) and back to red at i = 6. I want it to go to at most
  // blue (i = 4), and I want to reverse it so that blue is where h =
  // 0 and red is where h = 1.
  h2 = (1.0 - h)*3.99;
  i = int(floor(h2));
  f = h2 - float(i);

  // If v and s are 1, the intermediate variables go like:
  // p = 0
  // q = 1 - f
  // t = f

  if (i == 0) {
    // v, t, p
    rgb = vec3(1.0, f, 0.0);
  } else if (i == 1) {
    // q, v, p
    rgb = vec3(1.0 - f, 1.0, 0.0);
  } else if (i == 2) {
    // p, v, t
    rgb = vec3(0.0, 1.0, f);
  } else { // i == 3
    // p, q, v
    rgb = vec3(0.0, 1.0 - f, 1.0);
  }
}

void main(void) {
  vec3 color;
  hue_to_rgb(vAmplitude, color);
  gl_FragColor = vec4(color, 1.0);
}
