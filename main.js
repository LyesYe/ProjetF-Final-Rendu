// ==========================================================================
// BUFFERS ET VARIABLES GÉNÉRAUX
// ==========================================================================

let planeVertices = [];
let planeFaces = [];
let planeTexCoords = [];
let tableVertices = [];
let tableFaces = [];
let skyboxVertices = [];
let skyboxFaces = [];
let sphereVertices = [];
let sphereFaces = [];
let sphereNormals = [];

let camDistance = 5;
let prog;
let skyboxProg;
let woodTexture;
let skyboxTexture;

let vertexShaderSrc, fragmentShaderSrc;
let skyboxVertexShaderSrc, skyboxFragmentShaderSrc;
let planePositionBuffer, planeIndexBuffer, planeNormalBuffer, planeTexCoordBuffer;
let tablePositionBuffer, tableIndexBuffer, tableNormalBuffer;
let skyboxPositionBuffer, skyboxIndexBuffer;
let spherePositionBuffer, sphereIndexBuffer, sphereNormalBuffer;

// ==========================================================================
// CONSTANTES
// ==========================================================================


// Plan
const planeSize = 6;

// Table
const tableOffset = [2.0, 0.0, -2.0];
const textureRepeat = 2.0;

// Toit

let newPlaneVertices = [];
let newPlaneFaces = [];
let newPlaneTexCoords = [];
let newPlanePositionBuffer, newPlaneIndexBuffer, newPlaneNormalBuffer, newPlaneTexCoordBuffer;

// SPHERE

const sphereRadius = 0.7;
const sphereSegments = 32;
const sphereRings = 16;
const sphereOffset = [-3.0, sphereRadius+ 0.3, -1.0];

// MURS

let wallVertices = [];
let wallFaces = [];
let wallNormals = [];
let wallPositionBuffer, wallIndexBuffer, wallNormalBuffer;
const wallHeight = 5;
const wallThickness = 0.2;

// FENÊTRE

const windowWidthRatio = 0.4;
const windowHeightRatio = 0.4;
const windowPosYRatio = 0.5;
const windowDepth = 0.1;

// LAMPE

let lampVertices = [];
let lampFaces = [];
let lampNormals = [];
let lampPositionBuffer, lampIndexBuffer, lampNormalBuffer;
let lampModel = null;




// ==========================================================================
// FONCTION POUR CHARGER UN MODÈLE OBJ
// ==========================================================================

async function loadOBJ(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur HTTP! status: ${response.status}`); 
            }
            const objText = await response.text();

            const vertices = [];
            const normals = [];
            const faces = [];
            const texCoords = [];

            const lines = objText.split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);

                if (parts[0] === 'v') {
                    if (parts.length >= 4) {
                        vertices.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    }
                } else if (parts[0] === 'vn') {
                    if (parts.length >= 4) {
                        normals.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        );
                    }
                } else if (parts[0] === 'vt') {
                    if (parts.length >= 3) {
                        texCoords.push(
                            parseFloat(parts[1]),
                            parseFloat(parts[2])
                        );
                    }
                }
                else if (parts[0] === 'f') {
                    if (parts.length >= 4) {
                        const faceVertexIndices = [];
                        const faceNormalIndices = [];
                        const faceTexCoordIndices = [];

                        for (let i = 1; i < parts.length; i++) {
                            const indexParts = parts[i].split('/');
                            faceVertexIndices.push(parseInt(indexParts[0]) - 1);
                            if (indexParts.length > 1 && indexParts[1]) {
                                faceTexCoordIndices.push(parseInt(indexParts[1]) - 1);
                            }
                            if (indexParts.length > 2 && indexParts[2]) { 
                                faceNormalIndices.push(parseInt(indexParts[2]) - 1);
                            }
                        }

                        if (faceVertexIndices.length === 3) {
                            faces.push(faceVertexIndices[0], faceVertexIndices[1], faceVertexIndices[2]);
                        } else if (faceVertexIndices.length === 4) {

                            faces.push(faceVertexIndices[0], faceVertexIndices[1], faceVertexIndices[2]);
                            faces.push(faceVertexIndices[0], faceVertexIndices[2], faceVertexIndices[3]);
                        } else if (faceVertexIndices.length > 4) {
                            console.warn("loadOBJ: Les polygones avec plus de 4 sommets ne sont pas supportés et seront ignorés pour la face:", line); 
                        }
                    }
                }
            }

            console.log("OBJ parsé: Sommets:", vertices.length / 3, "Normales:", normals.length / 3, "Faces (triangulées potentiellement depuis des quads):", faces.length / 3, "Coordonnées de texture:", texCoords.length / 2); 

            lampVertices = vertices;
            lampFaces = faces;
            lampNormals = normals;
            lampTexCoords = texCoords;

            lampModel = { vertices: lampVertices, faces: lampFaces, normals: lampNormals, texCoords: lampTexCoords }; 
            console.log("Modèle OBJ chargé et parsé (basique, quads triangulés):", url);
            resolve(lampModel);


        } catch (error) {
            console.error("Erreur lors du chargement ou du parsing du modèle OBJ:", error); // Erreur de chargement ou de parsing
            reject(error);
        }
    });
}


// ==========================================================================
// CONFIGURER LES BUFFERS ET ATTRIBUTS DE LA LAMPE
// ==========================================================================

function setupLampBuffers() {
    if (!lampModel) {
        console.warn("Données du modèle de lampe non encore chargées."); 
        return;
    }

    lampPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.vertices)); 
    lampIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lampModel.faces)); 
    if (lampModel.normals && lampModel.normals.length > 0) { 
        lampNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.normals)); 
    } else {
        console.warn("Pas de données de normales trouvées dans le modèle OBJ. L'éclairage pourrait être plat."); 
        lampNormalBuffer = null; 
    }
    if (lampModel.texCoords && lampModel.texCoords.length > 0) {
        lampTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(lampModel.texCoords));
    } else {
        console.warn("Pas de coordonnées de texture trouvées dans le modèle OBJ.");
        lampTexCoordBuffer = null;
    }


    console.log("Buffers de la lampe configurés en utilisant les données OBJ.");
}

function setupLampAttributes() {
    gl.bindBuffer(gl.ARRAY_BUFFER, lampPositionBuffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    if (lampNormalBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, lampNormalBuffer);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
    } else {
        gl.disableVertexAttribArray(1);
    }

    if (lampTexCoordBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, lampTexCoordBuffer);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);
    } else {
        gl.disableVertexAttribArray(2);
    }
}


// ==========================================================================
// CHARGER LES SHADERS
// ==========================================================================

async function loadShaders() {
    try {
        const vertexResponse = await fetch('vertex.glsl');
        vertexShaderSrc = await vertexResponse.text();
        console.log("Source du shader vertex chargée:", vertexShaderSrc.substring(0, 50) + "...");

        const fragmentResponse = await fetch('fragment.glsl');
        fragmentShaderSrc = await fragmentResponse.text();
        console.log("Source du shader fragment chargée:", fragmentShaderSrc.substring(0, 50) + "...");

        const skyboxVertexResponse = await fetch('skybox_vertex.glsl');
        skyboxVertexShaderSrc = await skyboxVertexResponse.text();
        console.log("Source du shader vertex du skybox chargée:", skyboxVertexShaderSrc.substring(0, 50) + "...");

        const skyboxFragmentResponse = await fetch('skybox_fragment.glsl');
        skyboxFragmentShaderSrc = await skyboxFragmentResponse.text();
        console.log("Source du shader fragment du skybox chargée:", skyboxFragmentShaderSrc.substring(0, 50) + "...");
    } catch (error) {
        console.error("Erreur lors du chargement des shaders:", error);
    }
}


// ==========================================================================
// CHARGER UNE TEXTURE 2D
// ==========================================================================

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

// ==========================================================================
// CHARGER UNE TEXTURE CUBIQUE (CUBEMAP)
// ==========================================================================

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
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
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


// ==========================================================================
// FONCTION PRINCIPALE
// ==========================================================================

async function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    background(0);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    await Promise.all([
        loadShaders(),
        loadTexture('./textures/wood.jpg').then(texture => woodTexture = texture),
        
        loadTexture('./textures/brick.jpg').then(texture => brickTexture = texture),
        loadCubemapTexture('./textures/skybox', [
            { name: 'xp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_X }, // Face positive X
            { name: 'xn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X }, // Face négative X
            { name: 'yp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y }, // Face positive Y
            { name: 'yn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y }, // Face négative Y
            { name: 'zp', face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z }, // Face positive Z
            { name: 'zn', face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z }  // Face négative Z
        ]).then(texture => skyboxTexture = texture),
        loadOBJ('./textures/Lamp.obj').then(loadedModel => lampModel = loadedModel) 
    ]);


    let vs = compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
    let fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    prog = createShaderProgram(vs, fs);

    // Configuration du programme shader du skybox
    vs = compileShader(gl.VERTEX_SHADER, skyboxVertexShaderSrc);
    fs = compileShader(gl.FRAGMENT_SHADER, skyboxFragmentShaderSrc);
    skyboxProg = createShaderProgram(vs, fs);


    setupPlaneBuffers();
    setupTableBuffers();
    setupSkyboxBuffers();
    setupSphereBuffers();
    setupWallBuffers();
    setupNewPlaneBuffers();
    setupLampBuffers();
}



// ==========================================================================
// COMPILER UN SHADER
// ==========================================================================

function compileShader(type, source) {
    console.log("Compilation du shader type:", type === gl.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER");
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const infoLog = gl.getShaderInfoLog(shader);
        console.error("Erreur de compilation du shader:", infoLog); 
        alert("Erreur de compilation du shader:\n\n" + infoLog); 
        gl.deleteShader(shader);
        return null;
    } else {
        console.log("Compilation du shader réussie."); 
    }
    return shader;
}


// ==========================================================================
// CRÉER UN PROGRAMME SHADER
// ==========================================================================

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

// ==========================================================================
// BUFFERS POUR LE TOIT
// ==========================================================================

function setupNewPlaneBuffers() {
    const normals = [];

    newPlaneVertices.push(
        -planeSize, wallHeight, -planeSize,
        planeSize, wallHeight, -planeSize,
        planeSize, wallHeight,  planeSize,
        -planeSize, wallHeight,  planeSize
    );

    newPlaneTexCoords.push(
        0.0,         0.0,             
        textureRepeat, 0.0,            
        textureRepeat, textureRepeat,   
        0.0,         textureRepeat     
    );

    for (let i = 0; i < 4; i++) normals.push(0.0, 1.0, 0.0);

    newPlaneFaces.push(0, 1, 2, 0, 2, 3); 

    newPlanePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(newPlaneVertices));
    newPlaneIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(newPlaneFaces));
    newPlaneNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
    newPlaneTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(newPlaneTexCoords));
}

// ==========================================================================
// BUFFERS POUR LE PLAN PRINCIPAL
// ==========================================================================

function setupPlaneBuffers() {
    const normals = []; 

    planeVertices.push(
        -planeSize, 0.0, -planeSize,  
        planeSize, 0.0, -planeSize, 
        planeSize, 0.0,  planeSize,   
        -planeSize, 0.0,  planeSize    
    );

    planeTexCoords.push(
        0.0,         0.0,             
        textureRepeat, 0.0,             
        textureRepeat, textureRepeat,   
        0.0,         textureRepeat     
    );

    for (let i = 0; i < 4; i++) normals.push(0.0, 1.0, 0.0);

    planeFaces.push(0, 1, 2, 0, 2, 3); 

    planePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeVertices));
    planeIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeFaces));
    planeNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
    planeTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeTexCoords));
}

// ==========================================================================
// BUFFERS POUR LA TABLE
// ==========================================================================
// Configuration des buffers pour le modèle de la table (plateau et pieds).

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


// ==========================================================================
// BUFFERS POUR LE SKYBOX
// ==========================================================================

function setupSkyboxBuffers() {
    skyboxVertices = [
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
        0, 1, 3, // Face avant
        1, 2, 3,
        4, 0, 7, // Face droite
        0, 3, 7,
        5, 4, 6, // Face arrière
        4, 7, 6,
        1, 5, 2, // Face gauche
        5, 6, 2,
        3, 2, 7, // Face supérieure
        2, 6, 7,
        1, 0, 5, // Face inférieure
        0, 4, 5
    ];

    skyboxPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(skyboxVertices));
    skyboxIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxFaces));
}

// ==========================================================================
// BUFFERS POUR LA SPHERE
// ==========================================================================

function setupSphereBuffers() {
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
            sphereNormals.push(x, y, z); 
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


// ==========================================================================
// BUFFERS ET FONCTIONS POUR LES MURS
// ==========================================================================

function setupWallBuffers() {
    wallVertices = []; 
    wallFaces = []; 
    wallNormals = [];  
    wallTexCoords = []; 


    const wallLength = planeSize * 2; 
    const wallYOffset = wallHeight / 2; 
    const planeSizeVal = planeSize;

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


    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        -wallLength / 2, backWallY, backWallZ,             
        windowStartX + wallLength / 2, wallHeight, backWallDepth, true); 

    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowEndX, backWallY, backWallZ,             
        wallLength / 2 - windowEndX, wallHeight, backWallDepth, true); 

    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowStartX, backWallY, backWallZ,             
        windowWidth, windowBottomY, backWallDepth, true); 

    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        windowStartX, windowTopY, backWallZ,             
        windowWidth, wallHeight - windowTopY, backWallDepth, true); 

    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        vCrossbarX, vCrossbarY, vCrossbarZ, vCrossbarWidth, vCrossbarHeight, vCrossbarDepth); 

    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        hCrossbarX, hCrossbarY, hCrossbarZ, hCrossbarWidth, hCrossbarHeight, hCrossbarDepth); 


    const leftWallX = -planeSizeVal - wallThickness / 2; 
    const leftWallZ = -planeSizeVal;                      
    const leftWallWidth = wallThickness;                 
    const leftWallHeightVal = wallHeight;                
    const leftWallLength = wallLength;                   
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals, wallTexCoords,
        leftWallX, 0, leftWallZ,
        leftWallWidth, leftWallHeightVal, leftWallLength); 


    const rightWallX = planeSizeVal ;                     
    const rightWallZ = -planeSizeVal;                     
    const rightWallWidth = wallThickness;                
    const rightWallHeightVal = wallHeight;               
    const rightWallLength = wallLength;                  
    addWallVerticesFacesNormals(wallVertices, wallFaces, wallNormals, wallTexCoords,
        rightWallX, 0, rightWallZ,
        rightWallWidth, rightWallHeightVal, rightWallLength); 


    const frontWallZ = planeSizeVal + wallThickness / 2;  
    const frontWallDepth = wallThickness;                 
    const frontWallY = 0;                                  
    addWallSection(wallVertices, wallFaces, wallNormals, wallTexCoords,
        -wallLength / 2, frontWallY, frontWallZ,             
        wallLength, wallHeight, frontWallDepth); 


    wallPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallVertices));
    wallIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wallFaces));
    wallNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallNormals));
    wallTexCoordBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(wallTexCoords)); 
}

function addWallSection(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection = false) { 
    addWallVerticesFacesNormals(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection);
}

function addWallVerticesFacesNormals(vertices, faces, normals, texcoords, x, y, z, width, height, depth, isBackWallSection = false) { 
    const baseIndex = vertices.length / 3; 
    const texCoordStepX = 1;
    const texCoordStepY = 1;

    const faceVertices = [
        [x,         y,          z,          [0.0 * texCoordStepX, 0.0 * texCoordStepY]],    
        [x + width, y,          z,          [1.0 * texCoordStepX, 0.0 * texCoordStepY]],    
        [x + width, y + height, z,          [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     
        [x,         y + height, z,          [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     

        // Face droite
        [x + width, y,          z,          [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x + width, y,          z + depth,  [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x + width, y + height, z + depth,  [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     
        [x + width, y + height, z,          [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     

        // Face arrière
        [x + width, y,          z + depth, isBackWallSection ? [((x + width) + planeSize) / (planeSize * 2), (y )/ wallHeight] : [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x,         y,          z + depth, isBackWallSection ? [(x + planeSize) / (planeSize * 2), (y) / wallHeight]         : [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x,         y + height, z + depth, isBackWallSection ? [(x + planeSize) / (planeSize * 2) , (y + height) / wallHeight] : [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     
        [x + width, y + height, z + depth, isBackWallSection ? [((x + width) + planeSize) / (planeSize * 2) , (y + height) / wallHeight] : [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     


        // Face gauche
        [x,         y,          z + depth,  [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x,         y,          z,          [1.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x,         y + height, z,          [1.0 * texCoordStepX, 1.0 * texCoordStepY]],     
        [x,         y + height, z + depth,  [0.0 * texCoordStepX, 1.0 * texCoordStepY]],     

        // Face supérieure
        [x,         y + height, z,          [0.0 * texCoordStepX, 0.0 * texCoordStepY]],     
        [x + width, y + height, z,          [1.0 * texCoordStepX, 0.0 * texCoordStepY]],    
        [x + width, y + height, z + depth,  [1.0 * texCoordStepX, 1.0 * texCoordStepY]],    
        [x,         y + height, z + depth,  [0.0 * texCoordStepX, 1.0 * texCoordStepY]],    

        // Face inférieure
        [x,         y,          z + depth,  [0.0 * texCoordStepX, 0.0 * texCoordStepY]],    
        [x + width, y,          z + depth,  [1.0 * texCoordStepX, 0.0 * texCoordStepY]],    
        [x + width, y,          z,          [1.0 * texCoordStepX, 1.0 * texCoordStepY]],    
        [x,         y,          z,          [0.0 * texCoordStepX, 1.0 * texCoordStepY]]     
    ];


    for (let i = 0; i < faceVertices.length; i++) { 
        vertices.push(faceVertices[i][0], faceVertices[i][1], faceVertices[i][2]);
        texcoords.push(faceVertices[i][3][0], faceVertices[i][3][1]); 
    }


    const faceNormals = [
        [0, 0, 1],  // Normale de la face avant
        [1, 0, 0],  // Normale de la face droite
        [0, 0, -1], // Normale de la face arrière
        [-1, 0, 0], // Normale de la face gauche
        [0, 1, 0],  // Normale de la face supérieure
        [0, -1, 0]  // Normale de la face inférieure
    ];


    const wallFacesIndices = [
        [0, 1, 2, 0, 2, 3],     // Face avant
        [4, 5, 6, 4, 6, 7],     // Face droite
        [8, 9, 10, 8, 10, 11],    // Face arrière
        [12, 13, 14, 12, 14, 15],   // Face gauche
        [16, 17, 18, 16, 18, 19],   // Face supérieure
        [20, 21, 22, 20, 22, 23]    // Face inférieure
    ];


    for (let i = 0; i < wallFacesIndices.length; i++) { 
        const faceIndexGroup = wallFacesIndices[i];
        faces.push(baseIndex + faceIndexGroup[0], baseIndex + faceIndexGroup[1], baseIndex + faceIndexGroup[2]); // Premier triangle de la face
        faces.push(baseIndex + faceIndexGroup[3], baseIndex + faceIndexGroup[4], baseIndex + faceIndexGroup[5]); // Deuxième triangle de la face

        // Ajout des normales correspondantes à la face pour tous les vertices de la face
        for (let j = 0; j < 6; j++) { 
            normals.push(faceNormals[i][0], faceNormals[i][1], faceNormals[i][2]);
        }
    }
}


// ==========================================================================
// CREER UN BUFFER
// ==========================================================================

function createBuffer(type, data) {
    const buffer = gl.createBuffer(); 
    gl.bindBuffer(type, buffer);   
    gl.bufferData(type, data, gl.STATIC_DRAW); 
    return buffer;
}

// ==========================================================================
// DRAW
// ==========================================================================

function draw() {
    if (!prog || !skyboxProg) return;

    // ========================= FRAME INITIALIZATION =========================
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const cameraPos = [0, 2, 4];
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPos, [0, 0, -17], [0, 1, 0]);
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 3.5, width / height, 0.1, 100);


    // ========================= SKYBOX DRAWING =========================
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

    gl.depthMask(true);

    // ========================= OBJECTS DRAWING =========================
    gl.useProgram(prog);

    

    // ========================= DIRECTIONAL LIGHTS =========================
    // Directional light 1
    const lightDirection1 = [-0.1, -0.2, 0.3];
    const lightColor1 = [1.0, 1.0, 0.95];
    const lightIntensity1 = 1.5;

    // Get and set uniform locations for directional lights
    const uLightDirection1 = gl.getUniformLocation(prog, "uLightDirection1");
    gl.uniform3fv(uLightDirection1, lightDirection1);
    const uLightColor1 = gl.getUniformLocation(prog, "uLightColor1");
    gl.uniform3fv(uLightColor1, lightColor1);
    const uLightIntensity1 = gl.getUniformLocation(prog, "uLightIntensity1");
    gl.uniform1f(uLightIntensity1, lightIntensity1);


    // 
    // Ambient light
    const ambientLightColor = [0.2, 0.2, 0.2]; // Soft white ambient light
    const ambientLightIntensity = 0.5; // Moderate intensity

    const uAmbientLightColor = gl.getUniformLocation(prog, "uAmbientLightColor");
    gl.uniform3fv(uAmbientLightColor, ambientLightColor);

    const uAmbientLightIntensity = gl.getUniformLocation(prog, "uAmbientLightIntensity");
    gl.uniform1f(uAmbientLightIntensity, ambientLightIntensity);

    // ========================= POINT LIGHT =========================

    const pointLightColor = [1.0, 1.0, 0.9];
    const pointLightIntensity = 2.9;

    // Point light position
    let pointLightPosition = [1, 1.5, -1.9];
    let pointLightOffset = [0.0, 0.1, 0.0]; // Adjustable offset [X, Y, Z]
    vec3.add(pointLightPosition, pointLightPosition, pointLightOffset);

    // Get and set uniform locations for point light
    const uPointLightPosition = gl.getUniformLocation(prog, "uPointLightPosition");
    gl.uniform3fv(uPointLightPosition, pointLightPosition);
    const uPointLightColor = gl.getUniformLocation(prog, "uPointLightColor");
    gl.uniform3fv(uPointLightColor, pointLightColor);
    const uPointLightIntensity = gl.getUniformLocation(prog, "uPointLightIntensity");
    gl.uniform1f(uPointLightIntensity, pointLightIntensity);

    // ======== ATTENUATION UNIFORMS (Add these lines) ========
    const uPointLightAttenuationConstant = gl.getUniformLocation(prog, "uPointLightAttenuationConstant");
    const uPointLightAttenuationLinear = gl.getUniformLocation(prog, "uPointLightAttenuationLinear");
    const uPointLightAttenuationQuadratic = gl.getUniformLocation(prog, "uPointLightAttenuationQuadratic");

    // Set attenuation factors - experiment with these values
    gl.uniform1f(uPointLightAttenuationConstant,  1.9);   // Constant factor (usually 1.0)
    gl.uniform1f(uPointLightAttenuationLinear,    0.09);  // Linear factor
    gl.uniform1f(uPointLightAttenuationQuadratic, 0.32); // Quadratic factor


    // ========================= CAMERA UNIFORM =========================
    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    gl.uniform3fv(uCameraPosition, cameraPos);

    // ========================= TEXTURE UNIFORM =========================
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // Default texture is wood
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);

    // ========================= MATERIAL SETUP - GENERIC OBJECTS =========================
    setupMaterial(
        [0.2, 0.2, 0.2],  // Ambient color
        [0.8, 0.8, 0.8],  // Diffuse color
        [0.9, 0.9, 0.9],  // Specular color
        1600.0,         // Shininess
        100.0         // Light power
    );

    // ========================= DRAW SCENE OBJECT FUNCTION =========================
    function drawSceneObject(attributesSetup, bufferIndex, facesCount, modelMatrix, objectType) {
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

        const uObjectType = gl.getUniformLocation(prog, "uObjectType");
        gl.uniform1i(uObjectType, objectType); // Set object type

        attributesSetup();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndex);
        drawObject(gl.TRIANGLES, facesCount, gl.UNSIGNED_SHORT, 0);
    }

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
    drawSceneObject(setupTableAttributes, tableIndexBuffer, tableFaces.length, tableModelMatrix, 1); 

    // Draw Sphere
    const sphereModelMatrix = mat4.create();
    mat4.translate(sphereModelMatrix, sphereModelMatrix, sphereOffset);
    drawSceneObject(setupSphereAttributes, sphereIndexBuffer, sphereFaces.length, sphereModelMatrix, 0); // 0 for sphere

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


    // ========================= DRAW LAMP OBJECT =========================
    // switch back to wood texture for other objects
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture); // Bind wood texture
    gl.uniform1i(uTexture, 0); // Tell shader to use wood texture


    let lampModelMatrix = mat4.create();

    // Lamp transformations
    let scaleFactor = 0.003;
    mat4.scale(lampModelMatrix, lampModelMatrix, [scaleFactor, scaleFactor, scaleFactor]);
    mat4.translate(lampModelMatrix, lampModelMatrix, [600.0, 400, -250.0]);
    mat4.rotateY(lampModelMatrix, lampModelMatrix, Math.PI / 4);

        setupMaterial(
            [0.0, 0.0, 0.1],  // Ambient color (dark blue)
            [0.0, 0.0, 0.4],  // Diffuse color (dark blue)
            [0.0, 0.0, 0.5],  // Specular color (bright blue)
            128.0,            // Shininess (high)
            200.0             // Light power
        );

    drawSceneObject(setupLampAttributes, lampIndexBuffer, lampModel.faces.length, lampModelMatrix, 2);
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