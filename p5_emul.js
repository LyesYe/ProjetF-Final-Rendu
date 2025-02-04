let width;
let height;
let canvas;
let frameCount = 0;
let gl;

function createCanvas(w, h) {
	canvas = document.createElement("canvas");
	canvas.id = "webgl-canvas";
	// Set the output resolution and viewport
	// We can change the output resolution later on.
	// This is helpful, for example, when the user changes the size of the window.
	const pixelRatio = window.devicePixelRatio || 1;

	canvas.width = pixelRatio * w;
	canvas.height = pixelRatio * h;
	canvas.style.zIndex = 8;
	canvas.style.position = "absolute";
	canvas.style.border = "1px solid";
	
	
	var body = document.getElementsByTagName("body")[0];
	body.appendChild(canvas);

	// Initialize WebGL
	gl = canvas.getContext("webgl");

	gl.viewport(0, 0, canvas.width, canvas.height);

	// Initialize other WebGL states
	gl.clearColor(0.0, 0.0, 0.0, 0);
	gl.lineWidth(1.0);

	width = canvas.width;
	height = canvas.height;
}

function background(color) {
	gl.clearColor(color, color, color, 1.0);
}

function translate(x, y) {
	//rien a faire
}

function renderloop() {
	frameCount++;
	if (window.draw)
		draw();
	window.requestAnimationFrame(renderloop);
}
window.onload = function () {
	if (window.preload) 
		preload();
	if (window.setup)
		setup();
	renderloop();
}