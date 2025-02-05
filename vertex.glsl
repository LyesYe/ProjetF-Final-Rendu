attribute vec3 pos;
attribute vec3 normal;

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;

uniform vec3 uLightDirection;  // Direction of the directional light
uniform vec3 uCameraPosition;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;

uniform float uShininess;

varying vec3 vColor;

void main() {
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
    vec3 vPosition = (uModelMatrix * vec4(pos, 1.0)).xyz;
    vec3 vNormal = normalize(uNormalMatrix * normal);

    // Light direction (directional light)
    vec3 lightDir = normalize(-uLightDirection);

    // Ambient lighting
    vec3 ambient = uAmbientColor;

    // Diffuse lighting
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 diffuse = diff * uDiffuseColor;

    // Specular lighting
    vec3 viewDir = normalize(uCameraPosition - vPosition);
    vec3 reflectDir = reflect(-lightDir, vNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
    vec3 specular = spec * uSpecularColor;

    // Combine results
    vColor = ambient + diffuse + specular;
}