// fragment.glsl

precision mediump float;
varying vec3 vColor;
varying vec2 vTexCoord;
uniform sampler2D uTexture;

void main() {
    vec4 texColor = texture2D(uTexture, vTexCoord);
    vec3 finalColor = vColor * texColor.rgb; // Apply vertex color to texture

    gl_FragColor = vec4(finalColor, 1.0);
}