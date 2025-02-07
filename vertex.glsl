attribute vec3 pos;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 uModelMatrix;
uniform mat4 uModelViewProjection;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vPosition;

void main() {
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
    vNormal = uNormalMatrix * normal;
    vTexCoord = texCoord;
    vPosition = vec3(uModelMatrix * vec4(pos, 1.0));
}