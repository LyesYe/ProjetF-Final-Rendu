// Constants
const planeSize = 6;
const tableOffset = [2.0, 0.0, -2.0];
const textureRepeat = 2.0;


// new plane 

let newPlaneVertices = [];
let newPlaneFaces = [];
let newPlaneTexCoords = [];
let newPlanePositionBuffer, newPlaneIndexBuffer, newPlaneNormalBuffer, newPlaneTexCoordBuffer;

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


// ==========================================================================
// LAMP MODEL DATA AND BUFFERS
// ==========================================================================


// Lamp Buffers and Variables (no changes needed here for variables themselves)
let lampVertices = [];
let lampFaces = [];
let lampNormals = [];
let lampPositionBuffer, lampIndexBuffer, lampNormalBuffer;
let lampModel = null;


async function loadOBJ(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const objText = await response.text(); // Get OBJ file as text

            const vertices = [];
            const normals = [];
            const faces = [];
            const texCoords = []; // To store texture coordinates

            const lines = objText.split('\n'); // Split lines
            for (const line of lines) {
                const parts = line.trim().split(/\s+/); // Split by spaces, handle multiple spaces

                if (parts[0] === 'v') { // Vertex position
                    if (parts.length >= 4) {
                        vertices.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    }
                } else if (parts[0] === 'vn') { // Vertex normal
                    if (parts.length >= 4) {
                        normals.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    }
                } else if (parts[0] === 'vt') { // Vertex texture coordinate
                    if (parts.length >= 3) {
                        texCoords.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2])
                        );
                    }
                }
                else if (parts[0] === 'f') { // Face (handling triangles AND quads)
                    if (parts.length >= 4) {
                        const faceVertexIndices = [];
                        const faceNormalIndices = [];
                        const faceTexCoordIndices = [];

                        for (let i = 1; i < parts.length; i++) {
                            const indexParts = parts[i].split('/'); // v, v/vt, v//vn, or v/vt/vn formats
                            faceVertexIndices.push(parseInt(indexParts[0]) - 1); // Vertex index
                            if (indexParts.length > 1 && indexParts[1]) { // Texture coord index (if present)
                                faceTexCoordIndices.push(parseInt(indexParts[1]) - 1);
                            }
                            if (indexParts.length > 2 && indexParts[2]) { // Normal index (if present)
                                faceNormalIndices.push(parseInt(indexParts[2]) - 1);
                            }
                        }

                        if (faceVertexIndices.length === 3) { // Triangle face
                            faces.push(faceVertexIndices[0], faceVertexIndices[1], faceVertexIndices[2]);
                        } else if (faceVertexIndices.length === 4) { // Quad face - Triangulate!
                            // Triangulate quad (v1, v2, v3, v4) into two triangles: (v1, v2, v3) and (v1, v3, v4)
                            faces.push(faceVertexIndices[0], faceVertexIndices[1], faceVertexIndices[2]); // Triangle 1: v1, v2, v3
                            faces.push(faceVertexIndices[0], faceVertexIndices[2], faceVertexIndices[3]); // Triangle 2: v1, v3, v4
                        } else if (faceVertexIndices.length > 4) {
                            console.warn("loadOBJ: Polygons with more than 4 vertices are not supported and will be ignored for face:", line);
                        }
                    }
                }
                // You can add parsing for 'mtllib', 'usemtl' later if needed
            }

            console.log("OBJ parsed: Vertices:", vertices.length / 3, "Normals:", normals.length / 3, "Faces (triangulated from potentially quads):", faces.length / 3, "Texture Coords:", texCoords.length / 2); // Log parsed counts

            // Assign parsed data to your lamp model variables
            lampVertices = vertices;
            lampFaces = faces;
            lampNormals = normals; // Normals might be empty if OBJ doesn't have them
            lampTexCoords = texCoords; // Assign texture coordinates

            lampModel = { vertices: lampVertices, faces: lampFaces, normals: lampNormals, texCoords: lampTexCoords }; // Include texCoords in model data
            console.log("OBJ model loaded and parsed (basic, quads triangulated):", url);
            resolve(lampModel);


        } catch (error) {
            console.error("Error loading or parsing OBJ model:", error);
            reject(error);
        }
    });
}


// Modify setupBuffer and setupAttribute functions to use texture coords if available
function setupLampBuffers() {
    if (!lampModel) {
        console.warn("Lamp model data not loaded yet.");
        return;
    }

    lampPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.vertices));
    lampIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lampModel.faces));
    if (lampModel.normals && lampModel.normals.length > 0) { // Only create normal buffer if normals are loaded
        lampNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.normals));
    } else {
        console.warn("No normals data found in OBJ model. Lighting might be flat.");
        lampNormalBuffer = null; // Indicate no normal buffer
    }
    if (lampModel.texCoords && lampModel.texCoords.length > 0) {
        lampTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.texCoords));
    } else {
        console.warn("No texture coordinates found in OBJ model.");
        lampTexCoordBuffer = null;
    }


    console.log("Lamp buffers setup using OBJ data.");
}

function setupLampAttributes() {
    gl.bindBuffer(gl.ARRAY_BUFFER, lampPositionBuffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    if (lampNormalBuffer) { // Only setup normal attribute if buffer exists
        gl.bindBuffer(gl.ARRAY_BUFFER, lampNormalBuffer);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
    } else {
        gl.disableVertexAttribArray(1); // Disable normal attribute if no normals
    }

    if (lampTexCoordBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, lampTexCoordBuffer);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0); // Texture coords are 2D (u, v)
        gl.enableVertexAttribArray(2);
    } else {
        gl.disableVertexAttribArray(2); // Disable texture coord attribute if no tex coords
    }
}





// Shader Loading
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

            image.src = `${folder}/${faces[i].name}.jpg`;
        }
    });
}


// Setup Function (modified)
async function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    background(0);
    gl.clearColor(0.5, 0.5, 0.5, 1.0); // Sky color

    await Promise.all([
        loadShaders(),
        loadTexture('./textures/wood.jpg').then(texture => woodTexture = texture),
        // Load brick texture for walls - NEW
        loadTexture('./textures/brick.jpg').then(texture => brickTexture = texture),
        loadCubemapTexture('./textures/skybox', [
            { name: 'xp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_X },
            { name: 'xn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X },
            { name: 'yp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y },
            { name: 'yn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y },
            { name: 'zp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z },
            { name: 'zn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z }
        ]).then(texture => skyboxTexture = texture),
        loadOBJ('./textures/Lamp.obj').then(loadedModel => lampModel = loadedModel) // Load lamp model and store
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
    setupSkyboxBuffers();
    setupSphereBuffers();
    setupWallBuffers();
    setupNewPlaneBuffers();
    setupLampBuffers(); // Setup lamp buffers after loading model data
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


function setupNewPlaneBuffers() {
    const normals = [];

    newPlaneVertices.push(
        -planeSize, wallHeight, -planeSize,  // bottom left
         planeSize, wallHeight, -planeSize,  // bottom right
         planeSize, wallHeight,  planeSize,  // top right
        -planeSize, wallHeight,  planeSize   // top left
    );

    newPlaneTexCoords.push(
        0.0,           0.0,            // bottom left
        textureRepeat, 0.0,            // bottom right
        textureRepeat, textureRepeat,  // top right
        0.0,           textureRepeat   // top left
    );

    for (let i = 0; i < 4; i++) normals.push(0.0, 1.0, 0.0);

    newPlaneFaces.push(0, 1, 2, 0, 2, 3);

    newPlanePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(newPlaneVertices));
    newPlaneIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(newPlaneFaces));
    newPlaneNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
    newPlaneTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(newPlaneTexCoords));
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

// Table Buffers Setup
function setupTableBuffers() {
    const normals = [];
    const tabletopWidth = 2.0, tabletopHeight = 1.0, tabletopDepth = 3.5, tabletopThickness = 0.1;

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
    wallTexCoords = []; // Initialize wallTexCoords array - NEW!


    const wallLength = planeSize * 2;
    const wallYOffset = wallHeight / 2;
    const planeSizeVal = planeSize;

    // --- Window Dimensions Calculation ---
    const windowWidth = wallLength * windowWidthRatio;
    const windowHeight = wallHeight * windowHeightRatio;
    const windowPosY = wallHeight * windowPosYRatio;
    const windowBottomY = windowPosY - windowHeight / 2;
    const windowTopY = windowPosY + windowHeight / 2;
    const windowStartX = -windowWidth / 2;
    const windowEndX = windowWidth / 2;
    const backWallZ = -planeSizeVal - wallThickness / 2;
    const backWallDepth = wallThickness;
    const backWallY = 0;


    // --- Crossbar Dimensions ---
    const crossbarThickness = 0.09;
    const vCrossbarWidth = crossbarThickness;
    const vCrossbarHeight = windowHeight;
    const vCrossbarDepth = windowDepth;
    const vCrossbarX = 0;
    const vCrossbarY = windowBottomY;
    const vCrossbarZ = backWallZ + windowDepth / 2;

    const hCrossbarWidth = windowWidth;
    const hCrossbarHeight = crossbarThickness;
    const hCrossbarDepth = windowDepth;
    const hCrossbarX = windowStartX;
    const hCrossbarY = windowPosY - hCrossbarHeight / 2;
    const hCrossbarZ = backWallZ + windowDepth / 2;


    // Back Wall - now in sections to create window opening
    // Left section of back wall (to the left of the window)
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        -wallLength / 2, backWallY, backWallZ, // Position
        windowStartX + wallLength / 2, wallHeight, backWallDepth, true); // isBackWallSection = true - NEW!

    // Right section of back wall (to the right of the window)
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowEndX, backWallY, backWallZ, // Position (starts after window)
        wallLength / 2 - windowEndX, wallHeight, backWallDepth, true); // isBackWallSection = true - NEW!

    // Bottom section of back wall (below the window) - NEW SECTION
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowStartX, backWallY, backWallZ, // Position (starts at window left, bottom of wall)
        windowWidth, windowBottomY, backWallDepth, true); // isBackWallSection = true - NEW!

    // Top section of back wall (above the window)
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowStartX, windowTopY, backWallZ, // Position (starts at window left, top of window)
        windowWidth, wallHeight - windowTopY, backWallDepth, true); // isBackWallSection = true - NEW!

    // Vertical Crossbar
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        vCrossbarX, vCrossbarY, vCrossbarZ, vCrossbarWidth, vCrossbarHeight, vCrossbarDepth); // isBackWallSection = false (default)

    // Horizontal Crossbar
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        hCrossbarX, hCrossbarY, hCrossbarZ, hCrossbarWidth, hCrossbarHeight, hCrossbarDepth); // isBackWallSection = false (default)


    // Left Wall
    const leftWallX = -planeSizeVal - wallThickness / 2;
    const leftWallZ = -planeSizeVal;
    const leftWallWidth = wallThickness;
    const leftWallHeightVal = wallHeight;
    const leftWallLength = wallLength;
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals, wallTexCoords,
        leftWallX, 0, leftWallZ,
        leftWallWidth, leftWallHeightVal, leftWallLength); // isBackWallSection = false (default)

    // Right Wall
    const rightWallX = planeSizeVal ;
    const rightWallZ = -planeSizeVal;
    const rightWallWidth = wallThickness;
    const rightWallHeightVal = wallHeight;
    const rightWallLength = wallLength;
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals, wallTexCoords,
        rightWallX, 0, rightWallZ,
        rightWallWidth, rightWallHeightVal, rightWallLength); // isBackWallSection = false (default)

    // Front Wall - NEW!
    const frontWallZ = planeSizeVal + wallThickness / 2;
    const frontWallDepth = wallThickness;
    const frontWallY = 0;
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        -wallLength / 2, frontWallY, frontWallZ, // Position
        wallLength, wallHeight, frontWallDepth); // isBackWallSection = false (default)

    wallPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallVertices));
    wallIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wallFaces));
    wallNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallNormals));
    wallTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallTexCoords)); // Create texture coord buffer - NEW!
}




function addWallSection(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection = false) { // Added isBackWallSection = false
    addWallVerticesFacesNormals(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection); // Pass isBackWallSection
}


function addWallVerticesFacesNormals(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection = false) { // Added isBackWallSection = false
    const baseIndex = vertices.length / 3;
    const texCoordStepX = 1; // Adjust for texture tiling on width
    const texCoordStepY = 1; // Adjust for texture tiling on height

    const faceVertices = [
        // Front face - Texture coordinates added!
        [x,         y,          z,         [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 0: bottom-left-front,    [U, V]
        [x + width, y,          z,         [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 1: bottom-right-front,   [U, V]
        [x + width, y + height, z,         [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 2: top-right-front,      [U, V]
        [x,         y + height, z,         [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 3: top-left-front,       [U, V]

        // Right face
        [x + width, y,          z,         [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 1: bottom-right-front,   [U, V]
        [x + width, y,          z + depth, [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 5: bottom-right-back,    [U, V]
        [x + width, y + height, z + depth, [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 6: top-right-back,       [U, V]
        [x + width, y + height, z,         [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 2: top-right-front,      [U, V]

        // Back face - **Modified Texture Coordinates for Back Wall Sections**
        [x + width, y,          z + depth, isBackWallSection ? [((x + width) + planeSize) / (planeSize * 2), (y )/ wallHeight] : [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 5: bottom-right-back,    [U, V]
        [x,         y,          z + depth, isBackWallSection ? [(x + planeSize) / (planeSize * 2), (y) / wallHeight]        : [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 4: bottom-left-back,     [U, V]
        [x,         y + height, z + depth, isBackWallSection ? [(x + planeSize) / (planeSize * 2) , (y + height) / wallHeight] : [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 7: top-left-back,        [U, V]
        [x + width, y + height, z + depth, isBackWallSection ? [((x + width) + planeSize) / (planeSize * 2) , (y + height) / wallHeight] : [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 6: top-right-back,       [U, V]


        // Left face
        [x,         y,          z + depth, [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 4: bottom-left-back,     [U, V]
        [x,         y,          z,         [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 0: bottom-left-front,    [U, V]
        [x,         y + height, z,         [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 3: top-left-front,       [U, V]
        [x,         y + height, z + depth, [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 7: top-left-back,        [U, V]

        // Top face
        [x,         y + height, z,         [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 3: top-left-front,       [U, V]
        [x + width, y + height, z,         [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 2: top-right-front,      [U, V]
        [x + width, y + height, z + depth, [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 6: top-right-back,       [U, V]
        [x,         y + height, z + depth, [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 7: top-left-back,        [U, V]

        // Bottom face
        [x,         y,          z + depth, [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 4: bottom-left-back,     [U, V]
        [x + width, y,          z + depth, [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     // 5: bottom-right-back,    [U, V]
        [x + width, y,          z,         [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     // 1: bottom-right-front,   [U, V]
        [x,         y,          z,         [0.0 * texCoordStepX, 1.0 * texCoordStepY]]      // 0: bottom-left-front,    [U, V]
    ];


    for (let i = 0; i < faceVertices.length; i++) {
        vertices.push(faceVertices[i][0], faceVertices[i][1], faceVertices[i][2]);
        texcoords.push(faceVertices[i][3][0], faceVertices[i][3][1]); // Add texture coordinates!
    }


    // Consistent normals for all vertices of each face -  needs to be per face now!
    const faceNormals = [
        [0, 0, 1],  // Front face normal
        [1, 0, 0],  // Right face normal
        [0, 0, -1], // Back face normal
        [-1, 0, 0], // Left face normal
        [0, 1, 0],  // Top face normal
        [0, -1, 0]  // Bottom face normal
    ];


    const wallFacesIndices = [
        [0, 1, 2, 0, 2, 3],       // Front face
        [4, 5, 6, 4, 6, 7],       // Right face
        [8, 9, 10, 8, 10, 11],    // Back face
        [12, 13, 14, 12, 14, 15],  // Left face
        [16, 17, 18, 16, 18, 19],  // Top face
        [20, 21, 22, 20, 22, 23]   // Bottom face
    ];


    for (let i = 0; i < wallFacesIndices.length; i++) {
        const faceIndexGroup = wallFacesIndices[i];
        faces.push(baseIndex + faceIndexGroup[0], baseIndex + faceIndexGroup[1], baseIndex + faceIndexGroup[2]);
        faces.push(baseIndex + faceIndexGroup[3], baseIndex + faceIndexGroup[4], baseIndex + faceIndexGroup[5]);

        // Add normals corresponding to the face for all vertices in the face
        for (let j = 0; j < 6; j++) { // 6 vertices per face (2 triangles)
            normals.push(faceNormals[i][0], faceNormals[i][1], faceNormals[i][2]);
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

    // **Initialize Frame and Prepare Camera Matrices**
    // ========================= FRAME INITIALIZATION =========================
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const cameraPos = [0, 2, 4];
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPos, [0, 0, -17], [0, 1, 0]);
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 3.5, width / height, 0.1, 100);
    // ========================= END FRAME INITIALIZATION =========================


    // **SKYBOX DRAWING**
    // ========================= SKYBOX DRAWING CODE =========================
    // Draw Skybox First - Disable depth writing for skybox
    gl.depthMask(false);
    gl.useProgram(skyboxProg);

    // Create Skybox MVP Matrix (ModelViewProjection)
    // Skybox view matrix is view matrix without translation
    let skyboxViewMatrix = mat4.clone(viewMatrix);
    skyboxViewMatrix[12] = 0; // Set translation part of view matrix to zero
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;

    let skyboxMvpMatrix = mat4.create();
    mat4.multiply(skyboxMvpMatrix, projectionMatrix, skyboxViewMatrix);

    // Set Skybox Uniforms
    const uSkyboxModelViewProjection = gl.getUniformLocation(skyboxProg, "uModelViewProjection");
    gl.uniformMatrix4fv(uSkyboxModelViewProjection, false, skyboxMvpMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    const uSkyboxTexture = gl.getUniformLocation(skyboxProg, "uCubemapTexture");
    gl.uniform1i(uSkyboxTexture, 0);

    // Setup Skybox attributes and draw
    setupSkyboxAttributes(skyboxPositionBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer); // Ensure index buffer is bound!
    drawObject(gl.TRIANGLES, skyboxFaces.length, gl.UNSIGNED_SHORT, 0);

    // Re-enable depth writing for regular objects
    gl.depthMask(true);
    // ========================= END SKYBOX DRAWING CODE =========================


    // **REGULAR OBJECTS DRAWING (Plane, Table, Walls, Lamp, Sphere)**
    // ========================= REGULAR OBJECTS DRAWING =========================
    gl.useProgram(prog);


    // **LIGHTING UNIFORMS - DIRECTIONAL LIGHTS**
    // ========================= DIRECTIONAL LIGHTS =========================
    // Directional light 1: Window light (from back-top)
    const lightDirection1 = [-0.1, -0.2, 0.3];
    const lightColor1 = [1.0, 1.0, 0.95];
    const lightIntensity1 = 0.9;

    // Directional light 2: Fill light (from top)
    const lightDirection2 = [0, -1, 1];
    const lightColor2 = [0.8, 0.8, 1.0];
    const lightIntensity2 = 0.3;

    // Get and set uniform locations for directional lights
    const uLightDirection1 = gl.getUniformLocation(prog, "uLightDirection1");
    gl.uniform3fv(uLightDirection1, lightDirection1);
    const uLightDirection2 = gl.getUniformLocation(prog, "uLightDirection2");
    gl.uniform3fv(uLightDirection2, lightDirection2);

    const uLightColor1 = gl.getUniformLocation(prog, "uLightColor1");
    gl.uniform3fv(uLightColor1, lightColor1);
    const uLightColor2 = gl.getUniformLocation(prog, "uLightColor2");
    gl.uniform3fv(uLightColor2, lightColor2);
    const uLightIntensity1 = gl.getUniformLocation(prog, "uLightIntensity1");
    gl.uniform1f(uLightIntensity1, lightIntensity1);
    const uLightIntensity2 = gl.getUniformLocation(prog, "uLightIntensity2");
    gl.uniform1f(uLightIntensity2, lightIntensity2);
    // ========================= END DIRECTIONAL LIGHTS =========================


    // **LIGHTING UNIFORMS - POINT LIGHT**
    // ========================= POINT LIGHT =========================
    // Point light properties
    const pointLightColor = [1.0, 1.0, 0.9];
    const pointLightIntensity = 0.4;

    // Point light position - initially inside the lamp, adjustable with offset
    let pointLightPosition = [1.8, 5, -0.75];
    let pointLightOffset = [0.0, 0.1, 0.0]; // Adjustable offset [X, Y, Z]
    vec3.add(pointLightPosition, pointLightPosition, pointLightOffset);

    // Get and set uniform locations for point light
    const uPointLightPosition = gl.getUniformLocation(prog, "uPointLightPosition");
    gl.uniform3fv(uPointLightPosition, pointLightPosition);
    const uPointLightColor = gl.getUniformLocation(prog, "uPointLightColor");
    gl.uniform3fv(uPointLightColor, pointLightColor);
    const uPointLightIntensity = gl.getUniformLocation(prog, "uPointLightIntensity");
    gl.uniform1f(uPointLightIntensity, pointLightIntensity);
    // ========================= END POINT LIGHT =========================


    // **CAMERA POSITION UNIFORM**
    // ========================= CAMERA UNIFORM =========================
    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    gl.uniform3fv(uCameraPosition, cameraPos);
    // ========================= END CAMERA UNIFORM =========================


    // **TEXTURE UNIFORM**
    // ========================= TEXTURE UNIFORM =========================
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // Default texture is wood
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);
    // ========================= END TEXTURE UNIFORM =========================


    // **MATERIAL PROPERTIES SETUP (for most objects except lamp)**
    // ========================= MATERIAL SETUP - GENERIC OBJECTS =========================
    setupMaterial(
        [0.2, 0.2, 0.2],  // Ambient color
        [0.8, 0.8, 0.8],  // Diffuse color
        [0.9, 0.9, 0.9],  // Specular color
        16.0,         // Shininess
        100.0         // Light power
    );
    // ========================= END MATERIAL SETUP - GENERIC OBJECTS =========================


    // **DRAW SCENE OBJECT FUNCTION (reusable for all objects)**
    // ========================= DRAW SCENE OBJECT FUNCTION =========================
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
    // ========================= END DRAW SCENE OBJECT FUNCTION =========================


    // **DRAWING INDIVIDUAL SCENE OBJECTS**
    // ========================= DRAW OBJECTS - SCENE =========================
    // Draw Plane
    let planeModelMatrix = mat4.create();
    drawSceneObject(setupPlaneAttributes, planeIndexBuffer, planeFaces.length, planeModelMatrix);

    // Draw New Plane
    let newPlaneModelMatrix = mat4.create();
    drawSceneObject(setupNewPlaneAttributes, newPlaneIndexBuffer, newPlaneFaces.length, newPlaneModelMatrix);

    // Draw Table
    const tableModelMatrix = mat4.create();
    mat4.translate(tableModelMatrix, tableModelMatrix, tableOffset);
    mat4.rotateY(tableModelMatrix, tableModelMatrix, 90 * Math.PI / 180);
    drawSceneObject(setupTableAttributes, tableIndexBuffer, tableFaces.length, tableModelMatrix);

    // Draw Sphere
    const sphereModelMatrix = mat4.create();
    mat4.translate(sphereModelMatrix, sphereModelMatrix, sphereOffset);
    drawSceneObject(setupSphereAttributes, sphereIndexBuffer, sphereFaces.length, sphereModelMatrix);

    // **DRAW Walls with Brick Texture**
    // ========================= DRAW WALLS WITH BRICK TEXTURE =========================
    gl.activeTexture(gl.TEXTURE0); // Activate texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, brickTexture); // Bind brick texture to unit 0
    
    gl.uniform1i(uTexture, 0); // Tell shader to use texture from unit 0

    const wallModelMatrix = mat4.create();
    drawWalls(wallModelMatrix);

    function drawWalls(baseModelMatrix) {
        // Nested function to draw individual walls
        function drawWall(modelMatrix, positionBuffer, indexBuffer, facesCount) {
            drawSceneObject(setupWallAttributes, indexBuffer, facesCount, modelMatrix);
        }

        // Draw individual walls (Back, Left, Right, Front)
        let backWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(backWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        let leftWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(leftWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        let rightWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(rightWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);

        let frontWallModelMatrix = mat4.clone(baseModelMatrix);
        drawWall(frontWallModelMatrix, wallPositionBuffer, wallIndexBuffer, wallFaces.length);
    }
    // ========================= END DRAW WALLS WITH BRICK TEXTURE =========================


    // **DRAW LAMP OBJECT**
    // ========================= DRAW LAMP OBJECT =========================
    // After drawing walls, switch back to wood texture for other objects (if needed)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // Bind wood texture
    gl.uniform1i(uTexture, 0); // Tell shader to use wood texture


    let lampModelMatrix = mat4.create();

    // Lamp transformations (Scale, Translate, Rotate)
    let scaleFactor = 0.003;
    mat4.scale(lampModelMatrix, lampModelMatrix, [scaleFactor, scaleFactor, scaleFactor]);
    mat4.translate(lampModelMatrix, lampModelMatrix, [600.0, 400, -250.0]);
    mat4.rotateY(lampModelMatrix, lampModelMatrix, Math.PI / 4);

    // Material properties for the Lamp
    setupMaterial(
        [0.0, 0.0, 0.1],  // Ambient color (dark blue)
        [0.0, 0.0, 0.2],  // Diffuse color (dark blue)
        [0.2, 0.2, 1.0],  // Specular color (bright blue)
        128.0,        // Shininess (high)
        200.0         // Light power
    );

    drawSceneObject(setupLampAttributes, lampIndexBuffer, lampModel.faces.length, lampModelMatrix);
    // ========================= END DRAW LAMP OBJECT =========================

}



// new plane attribute

function setupNewPlaneAttributes() {
    gl.useProgram(prog);
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, newPlanePositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, newPlaneNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);

    const texCoordAttributeLocation = gl.getAttribLocation(prog, 'texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, newPlaneTexCoordBuffer);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
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
    // **Position Attribute**
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    // **Normal Attribute**
    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, wallNormalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);

    // **Texture Coordinate Attribute - ADDED!**
    const texCoordAttributeLocation = gl.getAttribLocation(prog, 'texCoord');
    if (texCoordAttributeLocation === -1) {
        console.error("Attribute 'texCoord' not found in shader program.");
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, wallTexCoordBuffer); // Bind texture coord buffer
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0); // 2 components for texCoord
    gl.enableVertexAttribArray(texCoordAttributeLocation); // Enable texture coord attribute
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