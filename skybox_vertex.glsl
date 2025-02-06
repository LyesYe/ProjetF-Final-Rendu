#version 100

attribute vec3 pos;
varying vec3 fragTexCoord; // Changed from 'out' to 'varying'

uniform mat4 uModelViewProjection;

void main() {
    fragTexCoord = pos;
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
    gl_Position = vec4(gl_Position.xy, gl_Position.w, gl_Position.w); // WebGL 1.0 depth trick (adjust z)
}