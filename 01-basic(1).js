function setup() {

	createCanvas(600, 600);

	prog = createProgram(vertexShaderSrc, fragmentShaderSrc);

	///////////////////////////////////////////////////////////////////////  
	// Initialiser les objets vertex buffer  
	// Nous pouvons mettre à jour le contenu des objets vertex buffer à tout moment.  
	// Nous n'avons PAS besoin de les recréer.  

	var positions = [
		-0.8, 0.4, 0,
		0.8, 0.4, 0,
		0.8, -0.4, 0,
		-0.8, 0.4, 0,
		0.8, -0.4, 0,
		-0.8, -0.4, 0
	];

	var colors = [
		1, 0, 0, 1,
		0, 1, 0, 1,
		0, 0, 1, 1,
		1, 0, 0, 1,
		0, 0, 1, 1,
		1, 0, 1, 1
	];

	var position_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);


	///////////////////////////////////////////////////////////////////////  
	// Définir les vertex buffers utilisés pour le rendu  
	// Avant de procéder au rendu, nous devons spécifier quels attributs de vertex sont utilisés  
	// et quels vertex buffers contiennent leurs données.  
	// Notez que différents objets peuvent utiliser différents ensembles d'attributs  
	// stockés dans des vertex buffers distincts.  

	var p = gl.getAttribLocation(prog, 'pos');
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(p);

	var c = gl.getAttribLocation(prog, 'clr');
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(c);

	///////////////////////////////////////////////////////////////////////  
	// Compiler les shader vertex et fragment dans un programme  
	// Nous pouvons modifier le code source des shaders et les recompiler plus tard,  
	// bien qu'une application WebGL compile généralement ses shaders une seule fois.  
	// Une application peut avoir plusieurs programmes de shaders et lier un programme  
	// de shaders différent pour rendre différents objets dans une scène.  



	///////////////////////////////////////////////////////////////////////  
	// Mettre à jour les variables uniformes des shaders  
	// Avant de procéder au rendu, nous devons définir les valeurs des variables uniformes.  
	// Les variables uniformes peuvent être mises à jour aussi souvent que nécessaire.  

	var m = gl.getUniformLocation(prog, 'trans');

	var matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];

	gl.useProgram(prog);
	gl.uniformMatrix4fv(m, false, matrix);




}

function draw() {
	///////////////////////////////////////////////////////////////////////  
	// Rendre la scène  
	// Maintenant que tout est prêt, nous pouvons rendre la scène.  
	// Le rendu commence par effacer l'image.  
	// Chaque fois que la scène change, nous devons la rendre à nouveau.  

	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(prog);

	var fc = gl.getUniformLocation(prog, 'frameCount');
	gl.uniform1f(fc, frameCount);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

let vertexShaderSrc = `
 
    attribute vec3 pos;
    attribute vec4 clr;
    uniform mat4 trans;
	uniform float frameCount;
    varying vec4 vcolor;
    
    void main()
    {
		vec3 aPos = vec3(pos.x, pos.y+sin(frameCount/100.0)/10.0, pos.z);
        gl_Position = trans * vec4(aPos,1);
        vcolor = clr;
    }
 
`
let fragmentShaderSrc = `
 
    precision mediump float;
    varying vec4 vcolor;
    uniform float frameCount;
    void main()
    {
        gl_FragColor = vcolor;
    }
 
`




function createProgram(vSrc, fSrc) {

	let retProgram = null;

	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vSrc);
	gl.compileShader(vs);

	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(vs));
		gl.deleteShader(vs);
	}

	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fSrc);
	gl.compileShader(fs);

	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(fs));
		gl.deleteShader(fs);
	}

	retProgram = gl.createProgram();
	gl.attachShader(retProgram, vs);
	gl.attachShader(retProgram, fs);
	gl.linkProgram(retProgram);

	if (!gl.getProgramParameter(retProgram, gl.LINK_STATUS)) {
		alert(gl.getProgramInfoLog(retProgram));
	}

	return retProgram;
}