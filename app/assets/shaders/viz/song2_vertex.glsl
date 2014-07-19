uniform mat4 uProjection;
uniform mat4 uModelView;
uniform sampler2D uAmplitudes;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying float vAmplitude;

void main(void) {
  vec4 position = vec4(aPosition, 1.0);
  vec4 amplitude = texture2D(uAmplitudes, aTexCoord);
  position.x = position.x * amplitude.a + 1.0*sign(position.x);
  gl_Position = uProjection * uModelView * position;
  vAmplitude = amplitude.a;
}
