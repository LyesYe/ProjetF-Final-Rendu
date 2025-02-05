
const planeSize = 5;
const tableOffset = [-2.0, 0.0, -2.0];

const planeVertices = [];
const planeFaces = [];
const planeTexCoords = []; // Added texture coordinates array
const tableVertices = [];
const tableFaces = [];

let camDistance = 5;
let prog;
let woodTexture; // Added texture variable

let vertexShaderSrc, fragmentShaderSrc;
let planePositionBuffer, planeIndexBuffer, planeNormalBuffer, planeTexCoordBuffer;
let tablePositionBuffer, tableIndexBuffer, tableNormalBuffer;




async function loadShaders() {
    const vertexResponse = await fetch('vertex.glsl');
    vertexShaderSrc = await vertexResponse.text();

    const fragmentResponse = await fetch('fragment.glsl');
    fragmentShaderSrc = await fragmentResponse.text();
}

async function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    background(0);

    // Load both shaders and texture before continuing
    await Promise.all([
        loadShaders(),
        loadTexture('./textures/wood.jpg').then(texture => {
            woodTexture = texture;
        })
    ]);

    // Compilation des shaders
    const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);

    // Création du programme shader
    prog = createShaderProgram(vs, fs);

    // Configuration des attributs de vertex
    setupPlaneBuffers();
    setupTableBuffers();
}

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createShaderProgram(vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert(gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

// ... [previous code remains the same until setupPlaneBuffers]

function setupPlaneBuffers() {
    const normals = [];

    // Generate plane vertices
    planeVertices.push(
        -planeSize, 0.0, -planeSize,  // bottom left
         planeSize, 0.0, -planeSize,  // bottom right
         planeSize, 0.0,  planeSize,  // top right
        -planeSize, 0.0,  planeSize   // top left
    );

    // Number of times to repeat the texture across the plane
    const textureRepeat = 8.0; // Adjust this value to change texture tiling

    // Add texture coordinates with proper repeat
    planeTexCoords.push(
        0.0,           0.0,            // bottom left
        textureRepeat, 0.0,            // bottom right
        textureRepeat, textureRepeat,  // top right
        0.0,           textureRepeat   // top left
    );

    // Normals (all pointing up)
    for (let i = 0; i < 4; i++) {
        normals.push(0.0, 1.0, 0.0);
    }

    // Faces (2 triangles)
    planeFaces.push(
        0, 1, 2,  // first triangle
        0, 2, 3   // second triangle
    );

    // Initialize buffers
    planePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeVertices));
    planeIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeFaces));
    planeNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
    planeTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeTexCoords));
}

// Update the loadTexture function to always enable texture repeat
async function loadTexture(url) {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            // Create a temporary canvas to resize the texture to power-of-2 dimensions
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Get the next power of 2 for both dimensions
            const nextPow2 = (x) => {
                return Math.pow(2, Math.ceil(Math.log(x) / Math.log(2)));
            };
            
            canvas.width = nextPow2(image.width);
            canvas.height = nextPow2(image.height);
            
            // Draw the image onto the canvas, effectively resizing it
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            // Use the canvas as the texture source
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
            
            // Now we can safely generate mipmaps and set repeat wrapping
            gl.generateMipmap(gl.TEXTURE_2D);
            
            // Enable texture repeat
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            
            resolve(texture);
        };
        image.src = url;
    });
}



function setupTableBuffers() {
    const normals = [];

    // Tabletop dimensions
    const tabletopWidth = 2.0;
    const tabletopHeight = 1.0;
    const tabletopDepth = 4;
    const tabletopThickness = 0.1; // Thickness parameter for the tabletop

    // Tabletop vertices (now including top and bottom faces plus sides)
    // Top face vertices
    tableVertices.push(
        // Top face
        -tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,             // 0
         tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,             // 1
         tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,             // 2
        -tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,             // 3
        // Bottom face
        -tabletopWidth / 2, tabletopHeight - tabletopThickness, -tabletopDepth / 2, // 4
         tabletopWidth / 2, tabletopHeight - tabletopThickness, -tabletopDepth / 2, // 5
         tabletopWidth / 2, tabletopHeight - tabletopThickness,  tabletopDepth / 2, // 6
        -tabletopWidth / 2, tabletopHeight - tabletopThickness,  tabletopDepth / 2  // 7
    );

    // Add normals for all vertices
    // Top face normals (up)
    for (let i = 0; i < 4; i++) {
        normals.push(0.0, 1.0, 0.0);
    }
    // Bottom face normals (down)
    for (let i = 0; i < 4; i++) {
        normals.push(0.0, -1.0, 0.0);
    }

    // Add faces for the thick tabletop
    tableFaces.push(
        // Top face
        0, 1, 2,
        0, 2, 3,
        // Bottom face
        4, 6, 5,
        4, 7, 6,
        // Front face
        0, 4, 5,
        0, 5, 1,
        // Back face
        2, 6, 7,
        2, 7, 3,
        // Left face
        0, 3, 7,
        0, 7, 4,
        // Right face
        1, 5, 6,
        1, 6, 2
    );

    // Add corresponding normals for the side faces
    // Front face normals
    normals.push(0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0);
    // Back face normals
    normals.push(0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0);
    // Left face normals
    normals.push(-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0);
    // Right face normals
    normals.push(1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0);

    // Table legs (modified to stop at bottom face)
    const legWidth = 0.1;
    const legHeight = tabletopHeight - tabletopThickness; // Modified to match bottom face height
    const legDepth = 0.1;

    function addLeg(x, z) {
        const baseIndex = tableVertices.length / 3;

        // Vertices for the leg (now starting from ground and ending at bottom face)
        tableVertices.push(
            // Bottom vertices (at ground level)
            x - legWidth / 2, 0.0, z - legDepth / 2,           // 0
            x + legWidth / 2, 0.0, z - legDepth / 2,           // 1
            x + legWidth / 2, 0.0, z + legDepth / 2,           // 2
            x - legWidth / 2, 0.0, z + legDepth / 2,           // 3
            // Top vertices (at tabletop bottom face)
            x - legWidth / 2, legHeight, z - legDepth / 2,     // 4
            x + legWidth / 2, legHeight, z - legDepth / 2,     // 5
            x + legWidth / 2, legHeight, z + legDepth / 2,     // 6
            x - legWidth / 2, legHeight, z + legDepth / 2      // 7
        );

        // Normals for the leg
        for (let i = 0; i < 8; i++) {
            const normalIndex = Math.floor(i / 4);
            if (normalIndex === 0) {
                normals.push(0.0, -1.0, 0.0); // Bottom face normals
            } else {
                normals.push(0.0, 1.0, 0.0);  // Top face normals
            }
        }

        // Faces for the leg
        tableFaces.push(
            // Front face
            baseIndex, baseIndex + 1, baseIndex + 5,
            baseIndex, baseIndex + 5, baseIndex + 4,
            // Right face
            baseIndex + 1, baseIndex + 2, baseIndex + 6,
            baseIndex + 1, baseIndex + 6, baseIndex + 5,
            // Back face
            baseIndex + 2, baseIndex + 3, baseIndex + 7,
            baseIndex + 2, baseIndex + 7, baseIndex + 6,
            // Left face
            baseIndex + 3, baseIndex, baseIndex + 4,
            baseIndex + 3, baseIndex + 4, baseIndex + 7,
            // Top face
            baseIndex + 4, baseIndex + 5, baseIndex + 6,
            baseIndex + 4, baseIndex + 6, baseIndex + 7,
            // Bottom face
            baseIndex, baseIndex + 2, baseIndex + 1,
            baseIndex, baseIndex + 3, baseIndex + 2
        );
    }

    // Add four legs
    const legOffset = 0.15;
    addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
    addLeg(tabletopWidth / 2 - legWidth / 2 - legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
    addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset, tabletopDepth / 2 - legDepth / 2 - legOffset);
    addLeg(tabletopWidth / 2 - legWidth / 2 - legOffset, tabletopDepth / 2 - legDepth / 2 - legOffset);

    // Initialize buffers
    tablePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(tableVertices));
    tableIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tableFaces));
    tableNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
}

function createBuffer(type, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
}


function draw() {
    if (!prog) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(prog);

	// In your draw function, update the light uniforms:
	const uLightDirection1 = gl.getUniformLocation(prog, "uLightDirection1");
	const uLightDirection2 = gl.getUniformLocation(prog, "uLightDirection2");

	// Front light (slightly modified from original)
	gl.uniform3fv(uLightDirection1, [-0.5, -1.0, -0.8]);

	// Back-left light (new)
	gl.uniform3fv(uLightDirection2, [0.5, -0.7, 0.8]);

    // Camera position for specular calculations
    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    const cameraPos = [4, 2, 0];
    gl.uniform3fv(uCameraPosition, cameraPos);


	// Activate texture for the floor
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);


    // Setup materials for the floor - warmer, more natural wood tones
	setupMaterial(
		[0.15, 0.09, 0.03],    // Ambient - dark wood base
		[0.48, 0.29, 0.12],    // Diffuse - rich brown wood
		[0.25, 0.22, 0.20],    // Specular - subtle wooden sheen
		64.0,                   // Shininess - semi-glossy wood finish
		900.0                   // Light power - increased for better contrast
	);

    // Matrices setup
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();

    // Improved camera angle for better lighting appreciation
    mat4.lookAt(
        viewMatrix,
        cameraPos,           // Camera position
        [-5, 0, 0],         // Look target
        [0, 1, 0]           // Up vector
    );

    // Wider field of view for better scene composition
    mat4.perspective(
        projectionMatrix,
        Math.PI / 3.5,      // ~51 degrees FOV
        width / height,
        0.1,
        100
    );

    // Floor rendering
    let mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

    const uModelViewProjection = gl.getUniformLocation(prog, "uModelViewProjection");
    gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);

    const uModelMatrix = gl.getUniformLocation(prog, "uModelMatrix");
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);
    const uNormalMatrix = gl.getUniformLocation(prog, "uNormalMatrix");
    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

    // When rendering the floor, add texture coordinates
    setupAttributes(planePositionBuffer, planeNormalBuffer, planeTexCoordBuffer);
    drawObject(gl.TRIANGLES, planeFaces.length, gl.UNSIGNED_SHORT, 0);



    // Table rendering with proper model matrix
    const tableModelMatrix = mat4.create();
    mat4.translate(tableModelMatrix, tableModelMatrix, tableOffset);

    mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, tableModelMatrix);

    gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);
    gl.uniformMatrix4fv(uModelMatrix, false, tableModelMatrix);

    mat3.normalFromMat4(normalMatrix, tableModelMatrix);
    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

    setupAttributes(tablePositionBuffer, tableNormalBuffer);
    drawObject(gl.TRIANGLES, tableFaces.length, gl.UNSIGNED_SHORT, 0);
}




function setupAttributes(positionBuffer, normalBuffer, texCoordBuffer = null) {
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);

    if (texCoordBuffer) {
        const texCoordAttributeLocation = gl.getAttribLocation(prog, 'texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(texCoordAttributeLocation);
    }
}

function setupMaterial(ambientColor, diffuseColor, specularColor, shininess, lightPower) {
    const uAmbientColor = gl.getUniformLocation(prog, "uAmbientColor");
    const uDiffuseColor = gl.getUniformLocation(prog, "uDiffuseColor");
    const uSpecularColor = gl.getUniformLocation(prog, "uSpecularColor");
    const uShininess = gl.getUniformLocation(prog, "uShininess");
    const uLightPower = gl.getUniformLocation(prog, "uLightPower");

    gl.uniform3fv(uAmbientColor, ambientColor);
    gl.uniform3fv(uDiffuseColor, diffuseColor);
    gl.uniform3fv(uSpecularColor, specularColor);
    gl.uniform1f(uShininess, shininess);
    gl.uniform1f(uLightPower, lightPower);
}

function drawObject(primitiveType, count, indexType, offset) {
    gl.drawElements(primitiveType, count, indexType, offset);
}