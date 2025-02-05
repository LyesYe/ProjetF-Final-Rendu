const planeSize = 10; // Taille du plan (demi-côté)

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

// Buffers for plane and table
let planePositionBuffer, planeIndexBuffer, planeNormalBuffer;
let tablePositionBuffer, tableIndexBuffer, tableNormalBuffer;

// Charger les shaders de manière asynchrone
async function loadShaders() {
    const vertexResponse = await fetch('vertex.glsl');
    vertexShaderSrc = await vertexResponse.text();

    const fragmentResponse = await fetch('fragment.glsl');
    fragmentShaderSrc = await fragmentResponse.text();
}

function setup() {
	createCanvas(window.innerWidth, window.innerHeight);
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
    planePositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(planeVertices));
    planeIndexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeFaces));
    planeNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
}

function setupTableBuffers() {
    const normals = [];

    // Tabletop dimensions
    const tabletopWidth = 2.0;
    const tabletopHeight = 1.0;
    const tabletopDepth = 3.5;

    // Tabletop vertices
    tableVertices.push(
        -tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2, // Bottom left
         tabletopWidth / 2, tabletopHeight, -tabletopDepth / 2, // Bottom right
         tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2, // Top right
        -tabletopWidth / 2, tabletopHeight,  tabletopDepth / 2  // Top left
    );

    // Tabletop normals (all facing up)
    for (let i = 0; i < 4; i++) {
        normals.push(0.0, 1.0, 0.0);
    }

    // Tabletop faces (2 triangles)
    tableFaces.push(
        0, 1, 2, // First triangle
        0, 2, 3  // Second triangle
    );

    // Table legs dimensions
    const legWidth = 0.1;
    const legHeight = 1.0;
    const legDepth = 0.1;

    // Function to add a leg
    function addLeg(x, z) {
        const baseIndex = tableVertices.length / 3;

        // Vertices for the leg
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

        // Normals for the leg (simplified, all facing outwards)
        for (let i = 0; i < 8; i++) {
            normals.push(0.0, 1.0, 0.0);
        }

        // Faces for the leg (12 triangles)
        tableFaces.push(
            baseIndex, baseIndex + 1, baseIndex + 5,
            baseIndex, baseIndex + 5, baseIndex + 4,
            baseIndex + 1, baseIndex + 2, baseIndex + 6,
            baseIndex + 1, baseIndex + 6, baseIndex + 5,
            baseIndex + 2, baseIndex + 3, baseIndex + 7,
            baseIndex + 2, baseIndex + 7, baseIndex + 6,
            baseIndex + 3, baseIndex, baseIndex + 4,
            baseIndex + 3, baseIndex + 4, baseIndex + 7,
            baseIndex + 4, baseIndex + 5, baseIndex + 6,
            baseIndex + 4, baseIndex + 6, baseIndex + 7,
            baseIndex, baseIndex + 2, baseIndex + 3,
            baseIndex, baseIndex + 1, baseIndex + 2
        );
    }

    // Add four legs
	const legOffset = 0.15; // Moves the legs inward
	addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
	addLeg( tabletopWidth / 2 - legWidth / 2 - legOffset, -tabletopDepth / 2 + legDepth / 2 + legOffset);
	addLeg(-tabletopWidth / 2 + legWidth / 2 + legOffset,  tabletopDepth / 2 - legDepth / 2 - legOffset);
	addLeg( tabletopWidth / 2 - legWidth / 2 - legOffset,  tabletopDepth / 2 - legDepth / 2 - legOffset);


    // Initialisation des buffers
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
        [10, 4, 0],    // Position caméra (x, y, z)
        [0, 0, 0],      // Point visé (centre du plan)
        [0, 1, 0]       // Vecteur up
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

    // Send the model matrix and normal matrix to the shader
    const uModelMatrix = gl.getUniformLocation(prog, "uModelMatrix");
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);
    const uNormalMatrix = gl.getUniformLocation(prog, "uNormalMatrix");
    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

    // Dessin du plan
    setupAttributes(planePositionBuffer, planeNormalBuffer);
    drawObject(gl.TRIANGLES, planeFaces.length, gl.UNSIGNED_SHORT, 0);

    // Dessin de la table
    setupMaterial([0.4, 0.2, 0.1], [0.8, 0.4, 0.2], [0.7, 0.7, 0.7], 100.0, 500.0); // Brown wood color
    setupAttributes(tablePositionBuffer, tableNormalBuffer);
	
    drawObject(gl.TRIANGLES, tableFaces.length, gl.UNSIGNED_SHORT, 0);
}




function setupAttributes(positionBuffer, normalBuffer) {
    const positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const normalAttributeLocation = gl.getAttribLocation(prog, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttributeLocation);
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