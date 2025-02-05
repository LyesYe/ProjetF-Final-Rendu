precision mediump float;
varying vec3 vColor;
varying vec2 vTexCoord;
varying float vShadowIntensity;
uniform sampler2D uTexture;

void main() {
    vec4 texColor = texture2D(uTexture, vTexCoord);
    
    // Darker areas should be slightly redder/warmer for realistic wood
    vec3 shadowColor = vec3(0.15, 0.08, 0.05);
    vec3 finalColor = mix(shadowColor, vColor, vShadowIntensity);
    
    // Mix with texture color if available
    if (texColor.a > 0.0) {
        finalColor *= texColor.rgb;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}