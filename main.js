const majorRadius = 50;    // Rayon principal du tore (distance du centre au milieu de l'anneau)
const minorRadius = 30;    // Rayon secondaire (épaisseur de l'anneau)
const radialSegments = 64; // Nombre de segments autour du grand cercle
const tubularSegments = 64; // Nombre de segments autour du petit cercle

// Listes pour stocker les sommets et les faces du tore
const torusVertices = [];
const torusFaces = [];

let angleY = 0;
let angleX = 0;
let angleZ = 0;
let camDistance = 5;

function setup() {
	createCanvas(500, 500);

	background(0);
	const normals = [];
	// Génération des sommets
	for (let i = 0; i <= radialSegments; i++) {
		const theta = (i * 2 * Math.PI) / radialSegments; // Angle autour du grand cercle
		const cosTheta = Math.cos(theta);
		const sinTheta = Math.sin(theta);

		for (let j = 0; j <= tubularSegments; j++) {
			const phi = (j * 2 * Math.PI) / tubularSegments; // Angle autour du petit cercle
			const cosPhi = Math.cos(phi);
			const sinPhi = Math.sin(phi);

			// Calculer les coordonnées x, y, z du point sur le tore
			const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
			const y = minorRadius * sinPhi;
			const z = (majorRadius + minorRadius * cosPhi) * sinTheta;

			// Ajouter le point comme un vecteur 3D
			torusVertices.push(x / 100.0, y / 100.0, z / 100.0);

			const xn = cosTheta * cosPhi;
			const yn = sinPhi;
			const zn = sinTheta * cosPhi;

			normals.push(xn, yn, zn);
		}
	}

	// Génération des faces (triangles) pour relier les points avec orientation counter-clockwise
	for (let i = 0; i < radialSegments; i++) {
		for (let j = 0; j < tubularSegments; j++) {
			const first = i * (tubularSegments + 1) + j;
			const second = first + tubularSegments + 1;

			// Assurer l'orientation counter-clockwise pour les deux triangles
			torusFaces.push(first, first + 1, second);       // Triangle 1
			torusFaces.push(second, first + 1, second + 1);  // Triangle 2
		}
	}


	///////////////////////////////////////////////////////////////////////  
	// Initialiser les objets vertex buffer  
	// Nous pouvons mettre à jour le contenu des objets vertex buffer à tout moment.  
	// Nous n'avons PAS besoin de les recréer.  
	var position_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(torusVertices), gl.STATIC_DRAW);

	//Index buffer (faces)
	var index_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torusFaces), gl.STATIC_DRAW);

	//Normal buffer 
	const normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	///////////////////////////////////////////////////////////////////////  
	// Compiler les shader vertex et fragment dans un programme  
	// Nous pouvons modifier le code source des shaders et les recompiler plus tard,  
	// bien qu'une application WebGL compile généralement ses shaders une seule fois.  
	// Une application peut avoir plusieurs programmes de shaders et lier un programme  
	// de shaders différent pour rendre différents objets dans une scène.  
	const vs_source = vertexShaderSrc;

	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vs_source);
	gl.compileShader(vs);

	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(vs));
		gl.deleteShader(vs);
	}

	const fs_source = fragmentShaderSrc;

	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fs_source);
	gl.compileShader(fs);

	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(fs));
		gl.deleteShader(fs);
	}

	//Creation du programme (il peut y en avoir plusieurs pour differents objets)
	prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);

	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		alert(gl.getProgramInfoLog(prog));
	}




	///////////////////////////////////////////////////////////////////////  
	// Définir les buffers de vertex utilisés pour le rendu  
	// Avant le rendu, nous devons spécifier quels attributs de vertex sont utilisés  
	// et quels objets vertex buffer contiennent leurs données.  
	// Notez que différents objets peuvent utiliser différents ensembles d'attributs  
	// stockés dans différents objets vertex buffer.

	var positionAttributeLocation = gl.getAttribLocation(prog, 'pos');
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);

	// Indique à l'attribut comment récupérer les données du positionBuffer (ARRAY_BUFFER)
	var size = 3;          // 3 composants par itération (x, y, z)
	var type = gl.FLOAT;   // Les données sont des flottants de 32 bits
	var normalize = false; // Ne pas normaliser les données
	var stride = 0;        // 0 = avancer de size * sizeof(type) à chaque itération pour obtenir la position suivante
	var offset = 0;        // Commencer au début du buffer
	gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
	gl.enableVertexAttribArray(positionAttributeLocation);

	//On fait de meme avec le buffer des normales
	const normalAttributeLocation = gl.getAttribLocation(prog, "normal");
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

	gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(normalAttributeLocation);
}

///////////////////////////////////////////////////////////////////////  
// Rendre la scene  
// Maintenant que tout est prêt, nous pouvons rendre la scene.  
// Le rendu commence par effacer l'image.  
// Chaque fois que la scene change, nous devons la rendre à nouveau.  
function draw() {

	//angleX = 1;//frameCount * 0.01;
	angleY = frameCount * 0.01;
	angleZ = 1;//frameCount * 0.01;

	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);

	gl.useProgram(prog);



	const uLightPosition = gl.getUniformLocation(prog, "uLightPosition");
	const uCameraPosition = gl.getUniformLocation(prog, "uCameraPosition");
	const uAmbientColor = gl.getUniformLocation(prog, "uAmbientColor");
	const uDiffuseColor = gl.getUniformLocation(prog, "uDiffuseColor");
	const uSpecularColor = gl.getUniformLocation(prog, "uSpecularColor");
	const uShininess = gl.getUniformLocation(prog, "uShininess");
	const uLightPower = gl.getUniformLocation(prog, "uLightPower");

	//Valeur de la lumière ambiante
	let Ia = {
		r: 1.0,
		g: 1.0,
		b: 1.0
	};
	//Coefficient reflexion lum ambiante
	let Ka = {
		r: 0.1,
		g: 0.1,
		b: 0.1
	};
	//Valeur de la lumière diff
	let Id = {
		r: 1.0,
		g: 1.0,
		b: 1.0
	};
	//Coefficient reflexion lum diff
	let Kd = {
		r: 1.0,
		g: 0.0,
		b: 0.0
	};
	//Valeur de la lumière spec
	let Is = {
		r: 1.0,
		g: 1.0,
		b: 1.0
	};
	//Coefficient reflexion lum spec
	let Ks = {
		r: 0.8,
		g: 0.8,
		b: 0.8
	};

	let shininess = 50;
	let lightPower = 300;
	// Set light and material properties
	gl.uniform3fv(uLightPosition, [22.0, 0.0, 0.0]);
	gl.uniform3fv(uCameraPosition, [0.0, 0.0, 0]);
	gl.uniform3fv(uAmbientColor, [Ka.r, Ka.g, Ka.b]);
	gl.uniform3fv(uDiffuseColor, [Kd.r, Kd.g, Kd.b]);
	gl.uniform3fv(uSpecularColor, [Ks.r, Ks.g, Ks.b]);
	gl.uniform1f(uShininess, shininess);
	gl.uniform1f(uLightPower, lightPower);
	


	///////////////////////////////////////////////////////////////////////  
	// Mettre à jour les variables uniformes des shaders  
	// Avant le rendu, nous devons définir les valeurs des variables uniformes.  
	// Les variables uniformes peuvent être mises à jour aussi souvent que nécessaire.  
	const uModelViewProjection = gl.getUniformLocation(prog, "uModelViewProjection");
	const uModelMatrix = gl.getUniformLocation(prog, "uModelMatrix");
	const uNormalMatrix = gl.getUniformLocation(prog, "uNormalMatrix");

	const modelMatrix = mat4.create();
	const viewMatrix = mat4.create();
	const projectionMatrix = mat4.create();

	mat4.translate(modelMatrix, modelMatrix, [0, 0, -camDistance]);

	// Rotate the model matrix
	mat4.rotate(modelMatrix, modelMatrix, angleX, [1, 0, 0]); // Rotate around X-axis
	mat4.rotate(modelMatrix, modelMatrix, angleY, [0, 1, 0]); // Rotate around Y-axis
	mat4.rotate(modelMatrix, modelMatrix, angleZ, [0, 0, 1]); // Rotate around Y-axis

	mat4.perspective(projectionMatrix, Math.PI / 4, width / height, 0.1, 100);

	const mvpMatrix = mat4.create();
	mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
	mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

	gl.uniformMatrix4fv(uModelViewProjection, false, mvpMatrix);

	gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);


	const normalMatrix = mat3.create();
	//normalFromMat4 : Cette fonction génère une matrice 3x3 à partir d'une matrice modèle 4x4 (modelMatrix).
	//Elle extrait uniquement la partie rotation/scalage de la matrice modèle (ignores les translations).
	//Elle effectue automatiquement l'inversion et la transposition nécessaires pour corriger les normales.
	mat3.normalFromMat4(normalMatrix, modelMatrix);
	gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);

	//gl.drawArrays(gl.TRIANGLES, 0, 6);
	var primitiveType = gl.TRIANGLES;
	var offset = 0;
	var count = torusFaces.length;
	var indexType = gl.UNSIGNED_SHORT;
	gl.drawElements(primitiveType, count, indexType, offset);
}

let vertexShaderSrc = `
    attribute vec3 pos;
    attribute vec3 normal; // Normals for lighting calculations

    uniform mat4 uModelViewProjection;
    uniform mat4 uModelMatrix;
    uniform mat3 uNormalMatrix;

	uniform vec3 uLightPosition;  // Position of the light source
    uniform vec3 uCameraPosition; // Position of the camera

    uniform vec3 uAmbientColor;  // Ambient light color
    uniform vec3 uDiffuseColor;  // Diffuse light color
    uniform vec3 uSpecularColor; // Specular light color

    uniform float uShininess; // Shininess coefficient for specular highlights
    uniform float uLightPower; // Shininess coefficient for specular highlights

	varying vec3 vColor;

    void main() {
        gl_Position = uModelViewProjection * vec4(pos, 1.0);
        vec3 vPosition = (uModelMatrix * vec4(pos, 1.0)).xyz;
        vec3 vNormal = normalize(uNormalMatrix * normal);


        // Calculate light direction
        vec3 lightDir = normalize(vPosition - uLightPosition);
		vec3 omegaDir = -lightDir;

        // Ambient lighting
        vec3 ambient = uAmbientColor;

        // Diffuse lighting (Lambertian reflection)
        float diff = max(dot(vNormal, omegaDir), 0.0);
        vec3 diffuse = diff * uDiffuseColor;

        // Specular lighting (Phong reflection)
        vec3 viewDir = normalize(uCameraPosition - vPosition);
		
		//Calcul vecteur reflechi (phong)
        vec3 reflectDir = reflect(lightDir, vNormal);

		// Calcul du vecteur demi-chemin (H)
    	vec3 halfwayDir = normalize(omegaDir + viewDir);

        //float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
		float spec = pow(max(dot(vNormal, halfwayDir), 0.0), uShininess);
        vec3 specular = spec * uSpecularColor;

        // Combine results
        vColor = ambient + diffuse + specular;

    }
`;


let fragmentShaderSrc = `
    precision mediump float;

	varying vec3 vColor;

    void main() {


        gl_FragColor = vec4(vColor, 1.0);
    }
`;





