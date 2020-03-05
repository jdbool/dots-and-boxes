/* eslint-env browser */

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const resizeCanvas = () => {
	const scale = window.devicePixelRatio || 1;

	canvas.width = canvas.clientWidth * scale;
	canvas.height = canvas.clientHeight * scale;

	ctx.scale(scale, scale);
};

const drawGame = width => {
	ctx.beginPath();
	ctx.arc(width / 2, width / 2, 40, 0, 2 * Math.PI);
	ctx.fillStyle = 'blue';
	ctx.fill();
};

const drawCanvas = () => {
	requestAnimationFrame(drawCanvas);

	const width = canvas.clientWidth;

	ctx.clearRect(0, 0, width, width);
	drawGame(width);
};

resizeCanvas();
requestAnimationFrame(drawCanvas);
window.onresize = resizeCanvas;
