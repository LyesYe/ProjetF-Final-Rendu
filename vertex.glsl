
attribute vec3 pos;
attribute vec3 normal;
attribute vec2 texCoord;
uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;
uniform vec3 uLightDirection1;
uniform vec3 uLightDirection2;
uniform vec3 uCameraPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
varying vec3 vColor;
varying vec2 vTexCoord;
varying float vShadowIntensity;

void main() {
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
    
    vec3 worldPos = (uModelMatrix * vec4(pos, 1.0)).xyz;
    vec3 worldNormal = normalize(uNormalMatrix * normal);
    
    // First light (front)
    vec3 lightDir1 = normalize(-uLightDirection1);
    vec3 viewDir = normalize(uCameraPosition - worldPos);
    vec3 halfwayDir1 = normalize(lightDir1 + viewDir);
    
    // Second light (back-left)
    vec3 lightDir2 = normalize(-uLightDirection2);
    vec3 halfwayDir2 = normalize(lightDir2 + viewDir);
    
    vec3 ambient = uAmbientColor * 0.3; // Reduced ambient for deeper shadows
    
    // Calculate lighting for first light with stronger shadows
    float diffuseStrength1 = max(dot(worldNormal, lightDir1), 0.0);
    diffuseStrength1 = pow(diffuseStrength1, 1.5); // More pronounced shadows
    vec3 diffuse1 = diffuseStrength1 * uDiffuseColor;
    
    float specularStrength1 = pow(max(dot(worldNormal, halfwayDir1), 0.0), uShininess);
    vec3 specular1 = specularStrength1 * uSpecularColor;
    
    // Calculate lighting for second light
    float diffuseStrength2 = max(dot(worldNormal, lightDir2), 0.0);
    diffuseStrength2 = pow(diffuseStrength2, 1.5);
    vec3 diffuse2 = diffuseStrength2 * uDiffuseColor;
    
    float specularStrength2 = pow(max(dot(worldNormal, halfwayDir2), 0.0), uShininess);
    vec3 specular2 = specularStrength2 * uSpecularColor;
    
    // Combine lights with adjusted intensities
    float light1Intensity = 1.7;
    float light2Intensity = 0.4; // Reduced secondary light for more contrast
    
    vec3 combinedDiffuse = (diffuse1 * light1Intensity + diffuse2 * light2Intensity);
    vec3 combinedSpecular = (specular1 * light1Intensity + specular2 * light2Intensity);
    
    // Calculate shadow intensity for fragment shader
    vShadowIntensity = min(diffuseStrength1 + diffuseStrength2, 1.0);
    
    vColor = ambient + (combinedDiffuse + combinedSpecular);
    vColor = min(vColor, vec3(1.0));
    
    vTexCoord = texCoord;
}

