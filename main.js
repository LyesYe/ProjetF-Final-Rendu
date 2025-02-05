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

let camDistance = 5;
let prog;
let woodTexture;

let vertexShaderSrc, fragmentShaderSrc;
let planePositionBuffer, planeIndexBuffer, planeNormalBuffer, planeTexCoordBuffer;
let tablePositionBuffer, tableIndexBuffer, tableNormalBuffer;

// Shader Loading
async function loadShaders() {
    const vertexResponse = await fetch('vertex.glsl');
    vertexShaderSrc = await vertexResponse.text();

    const fragmentResponse = await fetch('fragment.glsl');
    fragmentShaderSrc = await fragmentResponse.text();
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

// Setup Function
async function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    background(0);

    await Promise.all([
        loadShaders(),
        loadTexture('./textures/wood.jpg').then(texture => woodTexture = texture)
    ]);

    const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    prog = createShaderProgram(vs, fs);

    setupPlaneBuffers();
    setupTableBuffers();
}

// Shader Compilation
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

// Shader Program Creation
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

// Plane Buffers Setup
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

// Buffer Creation
function createBuffer(type, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
}

// Draw Function
function draw() {
    if (!prog) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(prog);

    const uLightDirection1 = gl.getUniformLocation(prog, "uLightDirection1");
    const uLightDirection2 = gl.getUniformLocation(prog, "uLightDirection2");
    gl.uniform3fv(uLightDirection1, [-0.5, -1.0, -0.8]);
    gl.uniform3fv(uLightDirection2, [0.5, -0.7, 0.8]);

    const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
    const cameraPos = [4, 2, 0];
    gl.uniform3fv(uCameraPosition, cameraPos);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    const uTexture = gl.getUniformLocation(prog, "uTexture");
    gl.uniform1i(uTexture, 0);

    setupMaterial(
        [0.15, 0.09, 0.03], [0.48, 0.29, 0.12], [0.25, 0.22, 0.20], 64.0, 900.0
    );

    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();

    mat4.lookAt(viewMatrix, cameraPos, [-5, 0, 0], [0, 1, 0]);
    mat4.perspective(projectionMatrix, Math.PI / 3.5, width / height, 0.1, 100);

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

    setupAttributes(planePositionBuffer, planeNormalBuffer, planeTexCoordBuffer);
    drawObject(gl.TRIANGLES, planeFaces.length, gl.UNSIGNED_SHORT, 0);

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

// Attribute Setup
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

// Material Setup
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

// Object Drawing
function drawObject(primitiveType, count, indexType, offset) {
    gl.drawElements(primitiveType, count, indexType, offset);
}