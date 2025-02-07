precision mediump float;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uLightPower;

// Directional light 1
uniform vec3 uLightDirection1;
uniform vec3 uLightColor1;
uniform float uLightIntensity1;

// Ambient light
uniform vec3 uAmbientLightColor;      // Color of the ambient light
uniform float uAmbientLightIntensity; // Intensity of the ambient light

// Point light
uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uPointLightIntensity;

uniform vec3 uCameraPosition;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;

uniform sampler2D uTexture;

uniform int uObjectType; // 0 for sphere, 1 for table, 2 for lamp

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vPosition);

    vec3 ambient = uAmbientColor;
    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);

    // Apply ambient light to all objects
    vec3 ambientLight = uAmbientLightColor * uAmbientLightIntensity;

    if (uObjectType == 0) {
        // Sphere - only affected by directional light 1
        vec3 lightDir1 = normalize(-uLightDirection1);
        float diff1 = max(dot(normal, lightDir1), 0.0);
        vec3 reflectDir1 = reflect(-lightDir1, normal);
        float spec1 = pow(max(dot(viewDir, reflectDir1), 0.0), uShininess);
        diffuse = uDiffuseColor * diff1 * uLightColor1 * uLightIntensity1;
        specular = uSpecularColor * spec1 * uLightColor1 * uLightIntensity1;
    } else if (uObjectType == 1) {
        // Table - affected by point light
        vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
        float pointDiff = max(dot(normal, pointLightDir), 0.0);
        vec3 pointReflectDir = reflect(-pointLightDir, normal);
        float pointSpec = pow(max(dot(viewDir, pointReflectDir), 0.0), uShininess);
        diffuse = uDiffuseColor * pointDiff * uPointLightColor * uPointLightIntensity;
        specular = uSpecularColor * pointSpec * uPointLightColor * uPointLightIntensity;
    } else if (uObjectType == 2) {
        // Lamp - affected by point light but remains dark blue
        vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
        float pointDiff = max(dot(normal, pointLightDir), 0.0);
        vec3 pointReflectDir = reflect(-pointLightDir, normal);
        float pointSpec = pow(max(dot(viewDir, pointReflectDir), 0.0), uShininess);

        // Use the lamp's dark blue color as the base
        vec3 lampBaseColor = vec3(0.0, 0.0, 0.2); // Dark blue

        // Add a small contribution from the point light to brighten the lamp
        diffuse = lampBaseColor + (uDiffuseColor * pointDiff * uPointLightColor * uPointLightIntensity * 0.2); // Scale down light contribution
        specular = uSpecularColor * pointSpec * uPointLightColor * uPointLightIntensity * 0.1; // Scale down specular contribution
    }

    // Add ambient light to the final color
    ambient += ambientLight;

    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Final color calculation
    vec3 finalColor = (ambient + diffuse + specular) * texColor.rgb;

    gl_FragColor = vec4(finalColor, 1.0);
}