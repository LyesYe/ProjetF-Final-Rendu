// main.js

// Constants
const planeSize = 6;
const tableOffset = [2.0, 0.0, -2.0];
const textureRepeat = 2.0;

// Sphere Constants
const sphereRadius = 0.7;
const sphereSegments = 32;
const sphereRings = 16;
const sphereOffset = [-3.0, sphereRadius+ 0.3, -1.0];

// Buffers and Variables
let planeVertices = [];
let planeFaces = [];
let planeTexCoords = [];
let tableVertices = [];
let tableFaces = [];
let skyboxVertices = [];
let skyboxFaces = [];
let sphereVertices = []; // Sphere vertices
let sphereFaces = [];    // Sphere faces
let sphereNormals = [];  // Sphere normals

// Wall variables
let wallVertices = [];
let wallFaces = [];
let wallNormals = [];
let wallPositionBuffer, wallIndexBuffer, wallNormalBuffer;
const wallHeight = 5;
const wallThickness = 0.2; // Adjust thickness if needed

// Window Constants
const windowWidthRatio = 0.4; // Reduced from 0.6 to 0.4 for a smaller window
const windowHeightRatio = 0.4; // Reduced from 0.5 to 0.4 for a smaller window
const windowPosYRatio = 0.5;    // Window center at half of wall height (from bottom) - keep for middle vertical position
const windowDepth = 0.1;       // Slightly thinner window depth


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
let spherePositionBuffer, sphereIndexBuffer, sphereNormalBuffer; // Sphere buffers


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
    setupSphereBuffers(); // Setup sphere buffers
    setupWallBuffers(); // Setup wall buffers
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

// Sphere Buffer Setup
function setupSphereBuffers() {
    // Clear existing arrays
    sphereVertices = [];
    sphereNormals = [];
    sphereFaces = [];

    for (let ring = 0; ring <= sphereRings; ring++) {
        const theta = (ring * Math.PI) / sphereRings;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let segment = 0; segment <= sphereSegments; segment++) {
            const phi = (segment * 2 * Math.PI) / sphereSegments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            sphereVertices.push(sphereRadius * x, sphereRadius * y, sphereRadius * z);
            sphereNormals.push(x, y, z); // Normals are the same as the normalized vertex positions for a sphere
        }
    }

    for (let ring = 0; ring < sphereRings; ring++) {
        for (let segment = 0; segment < sphereSegments; segment++) {
            const first = (ring * (sphereSegments + 1)) + segment;
            const second = first + sphereSegments + 1;

            sphereFaces.push(first, second, first + 1);
            sphereFaces.push(second, second + 1, first + 1);
        }
    }

    spherePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(sphereVertices));
    sphereNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(sphereNormals));
    sphereIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereFaces));
}


// Wall Buffers Setup
function setupWallBuffers() {
    wallVertices = [];
    wallFaces = [];
    wallNormals = [];

    const wallLength = planeSize * 2; // Walls are as long as the plane is wide/deep
    const wallYOffset = wallHeight / 2;
    const planeSizeVal = planeSize;

    // --- Window Dimensions Calculation ---
    const windowWidth = wallLength * windowWidthRatio;
    const windowHeight = wallHeight * windowHeightRatio;
    const windowPosY = wallHeight * windowPosYRatio; // Center of window Y position -  0.5 for vertical center
    const windowBottomY = windowPosY - windowHeight / 2;
    const windowTopY = windowPosY + windowHeight / 2;
    const windowStartX = -windowWidth / 2; // Center of wall is at 0 - keep for horizontal center
    const windowEndX = windowWidth / 2;
    const backWallZ = -planeSizeVal - wallThickness / 2;
    const backWallDepth = wallThickness;
    const backWallY = 0; // Base Y for back wall


    // --- Crossbar Dimensions ---
    const crossbarThickness = 0.09; // Thinner crossbars
    const vCrossbarWidth = crossbarThickness;
    const vCrossbarHeight = windowHeight;
    const vCrossbarDepth = windowDepth;
    const vCrossbarX = 0; // Centered in window
    const vCrossbarY = windowBottomY;
    const vCrossbarZ = backWallZ + windowDepth / 2; // Position slightly forward from the back wall

    const hCrossbarWidth = windowWidth;
    const hCrossbarHeight = crossbarThickness;
    const hCrossbarDepth = windowDepth;
    const hCrossbarX = windowStartX;
    const hCrossbarY = windowPosY - hCrossbarHeight / 2; // Vertically centered in window
    const hCrossbarZ = backWallZ + windowDepth / 2;


    // Back Wall - now in sections to create window opening
    // Left section of back wall (to the left of the window)
    addWallSection(wallVertices, wallFaces, wallNormals,
        -wallLength / 2, backWallY, backWallZ, // Position
        windowStartX + wallLength / 2, wallHeight, backWallDepth); // Dimensions (width up to window start)

    // Right section of back wall (to the right of the window)
    addWallSection(wallVertices, wallFaces, wallNormals,
        windowEndX, backWallY, backWallZ, // Position (starts after window)
        wallLength / 2 - windowEndX, wallHeight, backWallDepth); // Dimensions (width from window end to wall end)

    // Bottom section of back wall (below the window) - NEW SECTION
    addWallSection(wallVertices, wallFaces, wallNormals,
        windowStartX, backWallY, backWallZ, // Position (starts at window left, bottom of wall)
        windowWidth, windowBottomY, backWallDepth); // Dimensions (width of window, height below window)


    // Top section of back wall (above the window)
    addWallSection(wallVertices, wallFaces, wallNormals,
        windowStartX, windowTopY, backWallZ, // Position (starts at window left, top of window)
        windowWidth, wallHeight - windowTopY, backWallDepth); // Dimensions (width of window, height above window)

    // Vertical Crossbar
    addWallSection(wallVertices, wallFaces, wallNormals,
        vCrossbarX, vCrossbarY, vCrossbarZ, vCrossbarWidth, vCrossbarHeight, vCrossbarDepth);

    // Horizontal Crossbar
    addWallSection(wallVertices, wallFaces, wallNormals,
        hCrossbarX, hCrossbarY, hCrossbarZ, hCrossbarWidth, hCrossbarHeight, hCrossbarDepth);


    // Left Wall
    const leftWallX = -planeSizeVal - wallThickness / 2;
    const leftWallZ = -planeSizeVal;
    const leftWallWidth = wallThickness;
    const leftWallHeightVal = wallHeight;
    const leftWallLength = wallLength;
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals,
        leftWallX, 0, leftWallZ,
        leftWallWidth, leftWallHeightVal, leftWallLength);

    // Right Wall
    const rightWallX = planeSizeVal ;
    const rightWallZ = -planeSizeVal;
    const rightWallWidth = wallThickness;
    const rightWallHeightVal = wallHeight;
    const rightWallLength = wallLength;
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals,
        rightWallX, 0, rightWallZ,
        rightWallWidth, rightWallHeightVal, rightWallLength);

    // Front Wall - NEW!
    const frontWallZ = planeSizeVal + wallThickness / 2;
    const frontWallDepth = wallThickness;
    const frontWallY = 0;
    addWallSection(wallVertices, wallFaces, wallNormals,
        -wallLength / 2, frontWallY, frontWallZ, // Position
        wallLength, wallHeight, frontWallDepth); // Dimensions (full width, full height)


    wallPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallVertices));
    wallIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wallFaces));
    wallNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallNormals));


}


function addWallSection(vertices, faces, normals, x, y, z, width, height, depth) {
    addWallVerticesFacesNormals(vertices, faces, normals, x, y, z, width, height, depth);
}


function addWallVerticesFacesNormals(vertices, faces, normals, x, y, z, width, height, depth) {
    const baseIndex = vertices.length / 3;
    vertices.push(
        x,         y,         z,        // 0: bottom-left-front
        x + width, y,         z,        // 1: bottom-right-front
        x + width, y + height, z,        // 2: top-right-front
        x,         y + height, z,        // 3: top-left-front
        x,         y,         z + depth,  // 4: bottom-left-back
        x + width, y,         z + depth,  // 5: bottom-right-back
        x + width, y + height, z + depth,  // 6: top-right-back
        x,         y + height, z + depth   // 7: top-left-back
    );

    const wallFacesIndices = [
        [0, 1, 2, 0, 2, 3], // Front face (0, 1, 2), (0, 2, 3)
        [1, 5, 6, 1, 6, 2], // Right face
        [5, 4, 7, 5, 7, 6], // Back face
        [4, 0, 3, 4, 3, 7], // Left face
        [3, 2, 6, 3, 6, 7], // Top face
        [0, 1, 5, 0, 5, 4]  // Bottom face
    ];

    const calculatedFaceNormals = [
        [0, 0, 1],  // Front face normal
        [1, 0, 0],  // Right face normal
        [0, 0, -1], // Back face normal
        [-1, 0, 0], // Left face normal
        [0, 1, 0],  // Top face normal
        [0, -1, 0]  // Bottom face normal
    ];


    for (let i = 0; i < wallFacesIndices.length; i++) {
        const faceIndexGroup = wallFacesIndices[i];
        faces.push(baseIndex + faceIndexGroup[0], baseIndex + faceIndexGroup[1], baseIndex + faceIndexGroup[2]);
        faces.push(baseIndex + faceIndexGroup[3], baseIndex + faceIndexGroup[4], baseIndex + faceIndexGroup[5]);

        // Apply the same face normal for all vertices of this face (both triangles)
        const normal = calculatedFaceNormals[i];
        for (let j = 0; j < 6; j++) { // 6 vertices per face (two triangles)
            normals.push(...normal);
        }
    }
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

    const cameraPos = [0, 20, 15];
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPos, [0, 0, -10], [0, 1, 0]);
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 3.5, width / height, 0.1, 100);

    // ==============================================================
    //  SKYBOX DRAWING CODE
    // ==============================================================

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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer); // Ensure index buffer is bound!
    drawObject(gl.TRIANGLES, skyboxFaces.length, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);

    // ==============================================================

    // Draw Regular Objects (Plane, Table, Walls, Window ) -
    gl.useProgram(prog);

    // ========================= WINDOW LIGHTING =========================
    // Directional light from the window (back wall, positive Z direction)
    const windowLightDirection = [0.0, -0.5, -1.0]; // Pointing from window into room (negative Z is towards back)
    const windowLightColor = [1.0, 1.0, 0.95];     // Warm white color for sunlight
    const windowLightIntensity = 2.0;             // Intensity of the light

    // Pass light properties to shaders
    const uWindowLightDirection = gl.getUniformLocation(prog, "uWindowLightDirection");
    gl.uniform3fv(uWindowLightDirection, windowLightDirection);
    const uWindowLightColor = gl.getUniformLocation(prog, "uWindowLightColor");
    gl.uniform3fv(uWindowLightColor, windowLightColor);
    const uWindowLightIntensity = gl.getUniformLocation(prog, "uWindowLightIntensity");
    gl.uniform1f(uWindowLightIntensity, windowLightIntensity);

    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    gl.uniform3fv(uCameraPosition, cameraPos);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);

    // Material properties - you can adjust these
    setupMaterial(
        [0.1, 0.1, 0.1],     // ambient color (darker for more contrast)
        [0.6, 0.6, 0.5],     // diffuse color (slightly desaturated)
        [0.3, 0.3, 0.3],     // specular color (reduced highlight)
        32.0               // shininess (adjust for highlight size)
    );

    // Function to draw object with given model matrix
    function drawSceneObject(attributesSetup, bufferIndex, facesCount, modelMatrix) {
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

        attributesSetup();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndex);
        drawObject(gl.TRIANGLES, facesCount, gl.UNSIGNED_SHORT, 0);
    }


    // Draw Plane -
    let planeModelMatrix = mat4.create();
    drawSceneObject(setupPlaneAttributes, planeIndexBuffer, planeFaces.length, planeModelMatrix);


    // Draw Table -
    const tableModelMatrix = mat4.create();
    mat4.translate(tableModelMatrix, tableModelMatrix, tableOffset);
    // Rotate around X-axis by 45 degrees
    mat4.rotateY(tableModelMatrix, tableModelMatrix, 90 * Math.PI / 180);
    drawSceneObject(setupTableAttributes, tableIndexBuffer, tableFaces.length, tableModelMatrix);


    // Draw Sphere
    const sphereModelMatrix = mat4.create();
    mat4.translate(sphereModelMatrix, sphereModelMatrix, sphereOffset); // Apply offset
    drawSceneObject(setupSphereAttributes, sphereIndexBuffer, sphereFaces.length, sphereModelMatrix);


    // Draw Walls
    const wallModelMatrix = mat4.create(); // Base matrix, can be identity in this case as we are directly translating in wall setup
    drawWalls(wallModelMatrix);

    function drawWalls(baseModelMatrix) {
        // Back Wall Sections
        let backWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(backWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        // Left Wall
        let leftWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(leftWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        // Right Wall
        let rightWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(rightWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        // Front Wall - NEW!
        let frontWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(frontWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length); // Use existing buffers
    }

    function drawWall(modelMatrix, positionBuffer, indexBuffer, facesCount) {
        drawSceneObject(setupWallAttributes, indexBuffer, facesCount, modelMatrix);
    }




}


// Sphere Attribute Setup
function setupSphereAttributes() {
    gl.useProgram(prog); // Use the same program as plane and table
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, spherePositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);
}


// Skybox Attribute Setup
function setupSkyboxAttributes(positionBuffer) {
    gl.useProgram(skyboxProg);
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

// Wall Attribute Setup
function setupWallAttributes() {
    gl.useProgram(prog);
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, wallNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);
}




// Material Setup (No changes needed here)
function setupMaterial(ambientColor, diffuseColor, specularColor, shininess, lightPower) { //removed lightPower
    const uAmbientColor = gl.getUniformLocation(prog, "uAmbientColor");
    const uDiffuseColor = gl.getUniformLocation(prog, "uDiffuseColor");
    const uSpecularColor = gl.getUniformLocation(prog, "uSpecularColor");
    const uShininess = gl.getUniformLocation(prog, "uShininess");
    //const uLightPower = gl.getUniformLocation(prog, "uLightPower"); //removed lightPower from shader and main js

    gl.uniform3fv(uAmbientColor, ambientColor);
    gl.uniform3fv(uDiffuseColor, diffuseColor);
    gl.uniform3fv(uSpecularColor, specularColor);
    gl.uniform1f(uShininess, shininess);
    //gl.uniform1f(uLightPower, lightPower); //removed lightPower from shader and main js
}

// Object Drawing (No changes needed here)
function drawObject(primitiveType, count, indexType, offset) {
    gl.drawElements(primitiveType, count, indexType, offset);
}