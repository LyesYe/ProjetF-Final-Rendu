#version 100
precision mediump float;

varying vec3 fragTexCoord; // Changed from 'in' to 'varying'
uniform samplerCube uCubemapTexture;

void main() {
    gl_FragColor = textureCube(uCubemapTexture, fragTexCoord); // textureCube instead of texture
}