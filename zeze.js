const planeSize = 5; // Taille du plan (demi-côté)

// Listes pour stocker les sommets et les faces du plan
const planeVertices = [];
const planeFaces = [];

// Listes pour stocker les sommets et les faces de la table
const tableVertices = [];
const tableFaces = [];

let camDistance = 5;
let prog; // Programme shader

// Variables pour stocker les sources des shaders
let vertexShaderSrc, fragmentShaderSrc;

// Charger les shaders de manière asynchrone
async function loadShaders() {
    const vertexResponse = await fetch('vertex.glsl');
    vertexShaderSrc = await vertexResponse.text();

    const fragmentResponse = await fetch('fragment.glsl');
    fragmentShaderSrc = await fragmentResponse.text();
}

function setup() {
    createCanvas(500, 500, WEBGL);
    background(0);

    // Charger les shaders avant de continuer
    loadShaders().then(() => {
        // Compilation des shaders
        const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
        const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);

        // Création du programme shader
        prog = createShaderProgram(vs, fs);

        // Configuration des attributs de vertex
        setupPlaneBuffers();
        setupTableBuffers();
    });
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

function setupPlaneBuffers() {
    const normals = [];

    // Génération des 4 sommets du plan
    planeVertices.push(
        -planeSize, 0.0, -planeSize, // Coin inférieur gauche
         planeSize, 0.0, -planeSize, // Coin inférieur droit
         planeSize, 0.0,  planeSize, // Coin supérieur droit
        -planeSize, 0.0,  planeSize  // Coin supérieur gauche
    );

    // Normales (toutes orientées vers le haut)
    for (let i = 0; i < 4; i++) {
        normals.push(0.0, 1.0, 0.0);
    }

    // Faces (2 triangles)
    planeFaces.push(
        0, 1, 2, // Premier triangle
        0, 2, 3  // Deuxième triangle
    );

    // Initialisation des buffers
    const position_buffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeVertices));
    const index_buffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeFaces));
    const normalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));

    // Configuration des attributs de vertex
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    setupAttribute(positionAttributeLocation, position_buffer, 3);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    setupAttribute(normalAttributeLocation, normalBuffer, 3);
}

function setupTableBuffers() {
    const tableNormals = [];

    // Tabletop dimensions (smaller size)
    const tabletopWidth = 1.0;  // Reduced width
    const tabletopHeight = 0.1; // Reduced height
    const tabletopDepth = 0.5;  // Reduced depth

    // Tabletop vertices (positioned above the plane)
    tableVertices.push(
        // Top face (Y-coordinate is tabletopHeight, which is above the plane)
        -tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2,
         tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,
        -tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2,

        // Bottom face (Y-coordinate is 0, which is the plane level)
        -tabletopWidth / 2, 0.0, -tabletopDepth / 2,
         tabletopWidth / 2, 0.0, -tabletopDepth / 2,
         tabletopWidth / 2, 0.0,  tabletopDepth / 2,
        -tabletopWidth / 2, 0.0,  tabletopDepth / 2
    );

    // Tabletop normals (all facing up or down)
    for (let i = 0; i < 8; i++) {
        tableNormals.push(0.0, 1.0, 0.0);
    }

    // Tabletop faces (12 triangles: 2 per face)
    tableFaces.push(
        // Top face
        0, 1, 2,
        0, 2, 3,

        // Bottom face
        4, 5, 6,
        4, 6, 7,

        // Front face
        0, 3, 7,
        0, 7, 4,

        // Back face
        1, 2, 6,
        1, 6, 5,

        // Left face
        0, 4, 5,
        0, 5, 1,

        // Right face
        2, 3, 7,
        2, 7, 6
    );

    // Table legs dimensions (smaller size)
    const legWidth = 0.1;
    const legHeight = 0.5;      // Reduced height
    const legDepth = 0.1;

    // Function to add a leg
    const addLeg = (x, z) => {
        const baseIndex = tableVertices.length / 3;

        // Vertices for the leg (Y-coordinate starts at 0 and goes down to -legHeight)
        tableVertices.push(
            x - legWidth / 2, 0.0, z - legDepth / 2,
            x + legWidth / 2, 0.0, z - legDepth / 2,
            x + legWidth / 2, 0.0, z + legDepth / 2,
            x - legWidth / 2, 0.0, z + legDepth / 2,

            x - legWidth / 2, -legHeight, z - legDepth / 2,
            x + legWidth / 2, -legHeight, z - legDepth / 2,
            x + legWidth / 2, -legHeight, z + legDepth / 2,
            x - legWidth / 2, -legHeight, z + legDepth / 2
        );

        // Normals for the leg
        for (let i = 0; i < 8; i++) {
            tableNormals.push(0.0, 1.0, 0.0);
        }

        // Faces for the leg (12 triangles: 2 per face)
        tableFaces.push(
            // Top face
            baseIndex, baseIndex + 1, baseIndex + 2,
            baseIndex, baseIndex + 2, baseIndex + 3,

            // Bottom face
            baseIndex + 4, baseIndex + 5, baseIndex + 6,
            baseIndex + 4, baseIndex + 6, baseIndex + 7,

            // Front face
            baseIndex, baseIndex + 3, baseIndex + 7,
            baseIndex, baseIndex + 7, baseIndex + 4,

            // Back face
            baseIndex + 1, baseIndex + 2, baseIndex + 6,
            baseIndex + 1, baseIndex + 6, baseIndex + 5,

            // Left face
            baseIndex, baseIndex + 4, baseIndex + 5,
            baseIndex, baseIndex + 5, baseIndex + 1,

            // Right face
            baseIndex + 2, baseIndex + 3, baseIndex + 7,
            baseIndex + 2, baseIndex + 7, baseIndex + 6
        );
    };

    // Add four legs
    addLeg(-tabletopWidth / 2 + legWidth / 2, -tabletopDepth / 2 + legDepth / 2);
    addLeg(tabletopWidth / 2 - legWidth / 2, -tabletopDepth / 2 + legDepth / 2);
    addLeg(-tabletopWidth / 2 + legWidth / 2, tabletopDepth / 2 - legDepth / 2);
    addLeg(tabletopWidth / 2 - legWidth / 2, tabletopDepth / 2 - legDepth / 2);

    // Initialisation des buffers pour la table
    const tablePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(tableVertices));
    const tableIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tableFaces));
    const tableNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(tableNormals));

    // Configuration des attributs de vertex pour la table
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    setupAttribute(positionAttributeLocation, tablePositionBuffer, 3);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    setupAttribute(normalAttributeLocation, tableNormalBuffer, 3);
}

function createBuffer(type, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
}

function setupAttribute(location, buffer, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

function draw() {
    if (!prog) return; // Ne pas dessiner tant que les shaders ne sont pas chargés

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(prog);

    // Directional Light Setup
    const uLightDirection = gl.getUniformLocation(prog, "uLightDirection");
    gl.uniform3fv(uLightDirection, [-1.0, -1.0, -1.0]); // Light comes from top-right

    // Configuration matériau (sol marron)
    setupMaterial([0.2, 0.1, 0.1], [0.6, 0.3, 0.1], [0.7, 0.7, 0.7], 100.0, 500.0);

    // Matrices de transformation
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();

    // Positionnement de la caméra (vue en angle)
    mat4.lookAt(
        viewMatrix,
        [5, 5, 5],    // Adjusted camera position (x, y, z)
        [0, 0, 0],    // Point visé (centre du plan)
        [0, 1, 0]     // Vecteur up
    );

    // Projection perspective
    mat4.perspective(
        projectionMatrix,
        Math.PI / 4,          // 45 degree
        width / height,       // match la résolution du canvas
        0.1,                  // Plan proche
        100                   // Plan lointain
    );

    // Calcul de la matrice MVP
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

    // Envoi des matrices au shader
    const uModelViewProjection = gl.getUniformLocation(prog, "uModelViewProjection");
    gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);

    // Dessin du plan
    drawObject(gl.TRIANGLES, planeFaces.length, gl.UNSIGNED_SHORT, 0);

    // Dessin de la table
    setupMaterial([0.4, 0.2, 0.1], [0.8, 0.4, 0.2], [0.7, 0.7, 0.7], 100.0, 500.0); // Brown wood color
    drawObject(gl.TRIANGLES, tableFaces.length, gl.UNSIGNED_SHORT, 0);
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