// vertex.glsl

attribute vec3 pos;
attribute vec3 normal;
attribute vec2 texCoord;
uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;

uniform vec3 uWindowLightDirection; // Directional light from window
uniform vec3 uWindowLightColor;     // Light color
uniform float uWindowLightIntensity; // Light intensity

uniform vec3 uCameraPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
varying vec3 vColor;
varying vec2 vTexCoord;

void main() {
    gl_Position = uModelViewProjection * vec4(pos, 1.0);

    vec3 worldPos = (uModelMatrix * vec4(pos, 1.0)).xyz;
    vec3 worldNormal = normalize(uNormalMatrix * normal);

    // --- Window Light (Directional Light) ---
    vec3 lightDir = normalize(uWindowLightDirection); // Light direction from uniform
    vec3 viewDir = normalize(uCameraPosition - worldPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    vec3 ambient = uAmbientColor * 0.3; // Ambient component

    // Diffuse component
    float diffuseStrength = max(dot(worldNormal, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * uDiffuseColor * uWindowLightColor * uWindowLightIntensity;

    // Specular component
    float specularStrength = pow(max(dot(worldNormal, halfwayDir), 0.0), uShininess);
    vec3 specular = specularStrength * uSpecularColor * uWindowLightColor * uWindowLightIntensity;

    // --- One-Sided Lighting (Optional for directional light, but can be kept) ---
    float lightFacingFactor = step(0.0, dot(worldNormal, lightDir));
    diffuse *= lightFacingFactor;
    specular *= lightFacingFactor;

    // --- Final Color Calculation ---
    vColor = ambient + diffuse + specular;
    vColor = min(vColor, vec3(1.0)); // Clamp to 1.0

    vTexCoord = texCoord;
}