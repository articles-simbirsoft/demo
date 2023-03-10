uniform sampler2D uTexture;
uniform vec2 uOffset;
uniform vec2 u_mouse;
uniform float u_time;
varying vec2 vUv;

#define PI 3.14

vec3 deformationCurve(vec3 position, vec2 uv, vec2 offset) {
   position.y = position.y + (sin(uv.x * PI) * offset.y);
   return position;
}

void main() {
   vUv = uv;
   float noise = 1. - sin(4. * uv.x + u_mouse.x * 90.) / 30.;
   vec3 newPosition = deformationCurve(position, uv , uOffset + noise * 0.02 * sin(u_time));
   gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
}
