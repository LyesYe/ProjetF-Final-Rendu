attribute vec3 pos;
attribute vec4 clr;

uniform mat4 trans;
varying vec4 vcolor;

void main() {
    gl_Position = trans * vec4(pos, 1.0);
    vcolor = clr;
}
