attribute vec3 pos;
uniform mat4 uModelViewProjection;
varying vec3 vTexCoord;

void main() {
    vTexCoord = pos;
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
}