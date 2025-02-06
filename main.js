
// Constants
const planeSize = 5;
const tableOffset = [-2.0, 0.0, -2.0];
const textureRepeat = 2.0; // Texture tiling factor

// Buffers and Variables
let planeVertices = [];
let planeFaces = [];
let planeTexCoords = [];
let tableVertices = [];
let tableFaces = [];
let skyboxVertices = [];
let skyboxFaces = [];

let camDistance = 5;
let prog;
let skyboxProg; // Shader program for skybox
let woodTexture;
let skyboxTexture; // Cubemap texture for skybox

let vertexShaderSrc, fragmentShaderSrc;
let skyboxVertexShaderSrc, skyboxFragmentShaderSrc; // Skybox shaders sources
let planePositionBuffer, planeIndexBuffer, planeNormalBuffer, planeTexCoordBuffer;
let tablePositionBuffer, tableIndexBuffer, tableNormalBuffer;
let skyboxPositionBuffer, skyboxIndexBuffer; // Skybox buffers


// Shader Loading
// Shader Loading (Modified with console logs)
async function loadShaders() {
    try {
        const vertexResponse = await fetch('vertex.glsl');
        vertexShaderSrc = await vertexResponse.text();
        console.log("Vertex Shader Source Loaded:", vertexShaderSrc.substring(0, 50) + "..."); // Log first 50 chars

        const fragmentResponse = await fetch('fragment.glsl');
        fragmentShaderSrc = await fragmentResponse.text();
        console.log("Fragment Shader Source Loaded:", fragmentShaderSrc.substring(0, 50) + "..."); // Log first 50 chars

        const skyboxVertexResponse = await fetch('skybox_vertex.glsl'); // Load skybox vertex shader
        skyboxVertexShaderSrc = await skyboxVertexResponse.text();
        console.log("Skybox Vertex Shader Source Loaded:", skyboxVertexShaderSrc.substring(0, 50) + "..."); // Log first 50 chars

        const skyboxFragmentResponse = await fetch('skybox_fragment.glsl'); // Load skybox fragment shader
        skyboxFragmentShaderSrc = await skyboxFragmentResponse.text();
        console.log("Skybox Fragment Shader Source Loaded:", skyboxFragmentShaderSrc.substring(0, 50) + "..."); // Log first 50 chars
    } catch (error) {
        console.error("Error loading shaders:", error);
    }
}


// Texture Loading
async function loadTexture(url) {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const nextPow2 = (x) => Math.pow(2, Math.ceil(Math.log(x) / Math.log(2)));
            canvas.width = nextPow2(image.width);
            canvas.height = nextPow2(image.height);

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            resolve(texture);
        };
        image.src = url;
    });
}

// Cubemap Texture Loading
async function loadCubemapTexture(folder, faces) {
    return new Promise((resolve) => {
        let imagesLoaded = 0;
        const cubemapTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);

        const handleImageLoad = (face, image) => {
            gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            imagesLoaded++;
            if (imagesLoaded === 6) {
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // Correct MIN_FILTER for mipmapping!
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP); // Generate mipmaps!
                resolve(cubemapTexture);
            }
        };

        for (let i = 0; i < faces.length; i++) {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => handleImageLoad(faces[i].face, image);
            // ==========================================================================
            //  VERY IMPORTANT:  Corrected image.src syntax using template literal
            // ==========================================================================
            // image.src = `${folder}/${faces[i].name}.png`;
            image.src = `${folder}/${faces[i].name}.jpg`;
            // ==========================================================================
        }
    });
}


// Setup Function
async function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    background(0);
    gl.clearColor(0.5, 0.5, 0.5, 1.0); // Sky color

    await Promise.all([
        loadShaders(),
        loadTexture('./textures/wood.jpg').then(texture => woodTexture = texture),
        loadCubemapTexture('./textures/skybox', [ // Load skybox textures
            { name: 'xp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_X }, // Changed 'px' to 'xp'
            { name: 'xn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X }, // Changed 'nx' to 'xn'
            { name: 'yp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y }, // Changed 'py' to 'yp'
            { name: 'yn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y }, // Changed 'ny' to 'yn'
            { name: 'zp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z }, // Changed 'pz' to 'zp'
            { name: 'zn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z }  // Changed 'nz' to 'zn'
        ]).then(texture => skyboxTexture = texture)
    ]);
	

    // Regular program setup
    let vs = compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
    let fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    prog = createShaderProgram(vs, fs);

    // Skybox program setup
    vs = compileShader(gl.VERTEX_SHADER, skyboxVertexShaderSrc);
    fs = compileShader(gl.FRAGMENT_SHADER, skyboxFragmentShaderSrc);
    skyboxProg = createShaderProgram(vs, fs);


    setupPlaneBuffers();
    setupTableBuffers();
    setupSkyboxBuffers(); // Setup skybox buffers
}

// Shader Compilation (Modified with console logs)
function compileShader(type, source) {
    console.log("Compiling shader type:", type === gl.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER"); // Log shader type
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const infoLog = gl.getShaderInfoLog(shader);
        console.error("Shader compilation error:", infoLog); // Log error to console
        alert("Shader compilation error:\n\n" + infoLog); // Keep the alert for user feedback
        gl.deleteShader(shader);
        return null;
    } else {
        console.log("Shader compilation successful."); // Log success
    }
    return shader;
}


// Shader Program Creation (No changes needed here)
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

// Plane Buffers Setup (No changes needed here)
function setupPlaneBuffers() {
    const normals = [];

    planeVertices.push(
        -planeSize, 0.0, -planeSize,  // bottom left
         planeSize, 0.0, -planeSize,  // bottom right
         planeSize, 0.0,  planeSize,  // top right
        -planeSize, 0.0,  planeSize   // top left
    );

    planeTexCoords.push(
        0.0,           0.0,            // bottom left
        textureRepeat, 0.0,            // bottom right
        textureRepeat, textureRepeat,  // top right
        0.0,           textureRepeat   // top left
    );

    for (let i = 0; i < 4; i++) normals.push(0.0, 1.0, 0.0);

    planeFaces.push(0, 1, 2, 0, 2, 3);

    planePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeVertices));
    planeIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeFaces));
    planeNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
    planeTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeTexCoords));
}

// Table Buffers Setup (No changes needed here)
function setupTableBuffers() {
    const normals = [];
    const tabletopWidth = 2.0, tabletopHeight = 1.0, tabletopDepth = 4, tabletopThickness = 0.1;

    tableVertices.push(
        -tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,
        -tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,
        -tabletopWidth / 2, tabletopHeight - tabletopThickness, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight - tabletopThickness, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight - tabletopThickness,  tabletopDepth / 2,
        -tabletopWidth / 2, tabletopHeight - tabletopThickness,  tabletopDepth / 2
    );

    for (let i = 0; i < 4; i++) normals.push(0.0, 1.0, 0.0);
    for (let i = 0; i < 4; i++) normals.push(0.0, -1.0, 0.0);

    tableFaces.push(
        0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
        0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3,
        0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2
    );

    normals.push(
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0
    );

    const legWidth = 0.1, legHeight = tabletopHeight - tabletopThickness, legDepth = 0.1;
    const legOffset = 0.15;

    function addLeg(x, z) {
        const baseIndex = tableVertices.length / 3;
        tableVertices.push(
            x - legWidth / 2, 0.0, z - legDepth / 2,
            x + legWidth / 2, 0.0, z - legDepth / 2,
            x + legWidth / 2, 0.0, z + legDepth / 2,
            x - legWidth / 2, 0.0, z + legDepth / 2,
            x - legWidth / 2, legHeight, z - legDepth / 2,
            x + legWidth / 2, legHeight, z - legDepth / 2,
            x + legWidth / 2, legHeight, z + legDepth / 2,
            x - legWidth / 2, legHeight, z + legDepth / 2
        );

        for (let i = 0; i < 8; i++) normals.push(0.0, i < 4 ? -1.0 : 1.0, 0.0);

        tableFaces.push(
            baseIndex, baseIndex + 1, baseIndex + 5, baseIndex, baseIndex + 5, baseIndex + 4,
            baseIndex + 1, baseIndex + 2, baseIndex + 6, baseIndex + 1, baseIndex + 6, baseIndex + 5,
            baseIndex + 2, baseIndex + 3, baseIndex + 7, baseIndex + 2, baseIndex + 7, baseIndex + 6,
            baseIndex + 3, baseIndex, baseIndex + 4, baseIndex + 3, baseIndex + 4, baseIndex + 7,
            baseIndex + 4, baseIndex + 5, baseIndex + 6, baseIndex + 4, baseIndex + 6, baseIndex + 7,
            baseIndex, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2
        );
    }

    addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
    addLeg(tabletopWidth / 2 - legWidth / 2 - legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
    addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset, tabletopDepth / 2 - legDepth / 2 - legOffset);
    addLeg(tabletopWidth / 2 - legWidth / 2 - legOffset, tabletopDepth / 2 - legDepth / 2 - legOffset);

    tablePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(tableVertices));
    tableIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tableFaces));
    tableNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
}


// Skybox Buffers Setup
function setupSkyboxBuffers() {
    skyboxVertices = [
        // Positions
        -1,  1, -1,
        -1, -1, -1,
         1, -1, -1,
         1,  1, -1,
        -1,  1,  1,
        -1, -1,  1,
         1, -1,  1,
         1,  1,  1,
    ];

    skyboxFaces = [
        // Indices
        0, 1, 3, // Front
        1, 2, 3,
        4, 0, 7, // Right
        0, 3, 7,
        5, 4, 6, // Back
        4, 7, 6,
        1, 5, 2, // Left
        5, 6, 2,
        3, 2, 7, // Top
        2, 6, 7,
        1, 0, 5, // Bottom
        0, 4, 5
    ];


    skyboxPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(skyboxVertices));
    skyboxIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxFaces));
}


// Buffer Creation (No changes needed here)
function createBuffer(type, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
}


// Draw Function

function draw() {
    if (!prog || !skyboxProg) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const cameraPos = [4, 2, 0];
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPos, [-5, 0, 0], [0, 1, 0]);
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 3.5, width / height, 0.1, 100);


    // ==============================================================
    //  SKYBOX DRAWING CODE COMPLETELY COMMENTED OUT for isolation test
    // ==============================================================
    /*
    // Draw Skybox First
    gl.depthMask(false);
    gl.useProgram(skyboxProg); 

    // View matrix without translation for skybox
    let skyboxViewMatrix = mat4.clone(viewMatrix);
    skyboxViewMatrix[12] = 0;
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;

    let skyboxMvpMatrix = mat4.create();
    mat4.multiply(skyboxMvpMatrix, projectionMatrix, skyboxViewMatrix);

    const uSkyboxModelViewProjection = gl.getUniformLocation(skyboxProg, "uModelViewProjection");
    gl.uniformMatrix4fv(uSkyboxModelViewProjection, false, skyboxMvpMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    const uSkyboxTexture = gl.getUniformLocation(skyboxProg, "uCubemapTexture");
    gl.uniform1i(uSkyboxTexture, 0);

    setupSkyboxAttributes(skyboxPositionBuffer);
    drawObject(gl.TRIANGLES, skyboxFaces.length, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);
    */
    // ==============================================================


    // Draw Regular Objects (Plane and Table) - Unchanged
    gl.useProgram(prog);

    const uLightDirection1 = gl.getUniformLocation(prog, "uLightDirection1");
    const uLightDirection2 = gl.getUniformLocation(prog, "uLightDirection2");
    gl.uniform3fv(uLightDirection1, [-0.5, -1.0, -0.8]);
    gl.uniform3fv(uLightDirection2, [0.5, -0.7, 0.8]);

    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    gl.uniform3fv(uCameraPosition, cameraPos);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);

    setupMaterial(
        [0.15, 0.09, 0.03], [0.48, 0.29, 0.12], [0.25, 0.22, 0.20], 64.0, 900.0
    );

    // Draw Plane - Unchanged
    let modelMatrix = mat4.create();
    let mvpMatrix = mat4.create();

    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

    const uModelViewProjection = gl.getUniformLocation(prog, "uModelViewProjection");
    gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);

    const uModelMatrix = gl.getUniformLocation(prog, "uModelMatrix");
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

    let normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);
    const uNormalMatrix = gl.getUniformLocation(prog, "uNormalMatrix");
    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

    setupPlaneAttributes();
    drawObject(gl.TRIANGLES, planeFaces.length, gl.UNSIGNED_SHORT, 0);


    // Draw Table - Unchanged
    const tableModelMatrix = mat4.create();
    mat4.translate(tableModelMatrix, tableModelMatrix, tableOffset);

    mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, tableModelMatrix);

    gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);
    gl.uniformMatrix4fv(uModelMatrix, false, tableModelMatrix);

    mat3.normalFromMat4(normalMatrix, tableModelMatrix);
    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

    setupTableAttributes();
    drawObject(gl.TRIANGLES, tableFaces.length, gl.UNSIGNED_SHORT, 0);
}


// Skybox Attribute Setup
function setupSkyboxAttributes(positionBuffer) {
    const positionAttributeLocation = gl.getAttribLocation(skyboxProg, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);
}


// Plane Attribute Setup (Specific to 'prog' shader for plane)
function setupPlaneAttributes() {
    gl.useProgram(prog); // Ensure 'prog' is active when setting plane attributes
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, planePositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, planeNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);

    const texCoordAttributeLocation = gl.getAttribLocation(prog, 'texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, planeTexCoordBuffer);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
}



// Table Attribute Setup (Specific to 'prog' shader for table)
function setupTableAttributes() {
    gl.useProgram(prog); // Ensure 'prog' is active when setting table attributes
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, tablePositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, tableNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);
}


// Material Setup (No changes needed here)
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

// Object Drawing (No changes needed here)
function drawObject(primitiveType, count, indexType, offset) {
    gl.drawElements(primitiveType, count, indexType, offset);
}
