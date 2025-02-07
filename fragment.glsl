precision mediump float;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uLightPower;

uniform vec3 uLightDirection1;
uniform vec3 uLightDirection2;
uniform vec3 uLightColor1;
uniform vec3 uLightColor2;
uniform float uLightIntensity1;
uniform float uLightIntensity2;

// Point light uniforms
uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uPointLightIntensity;

uniform vec3 uCameraPosition;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;

uniform sampler2D uTexture;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vPosition);

    // Light 1 (Directional)
    vec3 lightDir1 = normalize(-uLightDirection1);
    float diff1 = max(dot(normal, lightDir1), 0.0);
    vec3 reflectDir1 = reflect(-lightDir1, normal);
    float spec1 = pow(max(dot(viewDir, reflectDir1), 0.0), uShininess);
    vec3 diffuse1 = uDiffuseColor * diff1 * uLightColor1 * uLightIntensity1;
    vec3 specular1 = uSpecularColor * spec1 * uLightColor1 * uLightIntensity1;

    // Light 2 (Directional)
    vec3 lightDir2 = normalize(-uLightDirection2);
    float diff2 = max(dot(normal, lightDir2), 0.0);
    vec3 reflectDir2 = reflect(-lightDir2, normal);
    float spec2 = pow(max(dot(viewDir, reflectDir2), 0.0), uShininess);
    vec3 diffuse2 = uDiffuseColor * diff2 * uLightColor2 * uLightIntensity2;
    vec3 specular2 = uSpecularColor * spec2 * uLightColor2 * uLightIntensity2;

    // Point Light
    vec3 pointLightDir = normalize(uPointLightPosition - vPosition); // Direction from fragment to light
    float pointDiff = max(dot(normal, pointLightDir), 0.0);
    vec3 pointReflectDir = reflect(-pointLightDir, normal);
    float pointSpec = pow(max(dot(viewDir, pointReflectDir), 0.0), uShininess);
    vec3 pointDiffuse = uDiffuseColor * pointDiff * uPointLightColor * uPointLightIntensity;
    vec3 pointSpecular = uSpecularColor * pointSpec * uPointLightColor * uPointLightIntensity;

    // Combine lights
    vec3 ambient = uAmbientColor;
    vec3 diffuse = diffuse1 + diffuse2 + pointDiffuse; // Add point light diffuse
    vec3 specular = specular1 + specular2 + pointSpecular; // Add point light specular

    // Reduce specular contribution for a more natural look
    specular *= 0.5;

    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Final color calculation
    vec3 finalColor = (ambient + diffuse + specular) * texColor.rgb;

    gl_FragColor = vec4(finalColor, 1.0);
}