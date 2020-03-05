/* eslint-env browser */

const status = document.getElementById('status');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const setStatus = (text, colour) => {
	status.innerText = text;
	status.style.color = colour;
};

const initGame = numDots => {
	let width;
	let dotRadius;

	const dotToPx = dot => ((dot / (numDots - 1)) * 0.8 + 0.1) * width;
	const pxToDot = px => ((px / width - 0.1) / 0.8) * (numDots - 1);

	let mouseDotX = null;
	let mouseDotY = null;
	let hoverLine = null;

	const updateHoverLine = () => {
		hoverLine = null;

		const roundedDotX = Math.round(mouseDotX);
		const roundedDotY = Math.round(mouseDotY);

		const tolerance = 0.15;
		const isCloseX = Math.abs(mouseDotX - roundedDotX) < tolerance;
		const isCloseY = Math.abs(mouseDotY - roundedDotY) < tolerance;

		// isCloseX XOR isCloseY
		if (isCloseX != isCloseY) {
			if (!isCloseX) {
				const lower = Math.floor(mouseDotX);
				const upper = Math.ceil(mouseDotX);
				if (lower >= 0 && upper < numDots)
					hoverLine = [lower, roundedDotY, upper, roundedDotY];
			} else {
				const lower = Math.floor(mouseDotY);
				const upper = Math.ceil(mouseDotY);
				if (lower >= 0 && upper < numDots)
					hoverLine = [roundedDotX, lower, roundedDotX, upper];
			}
		}
	};

	canvas.onmousemove = function(e) {
		const rect = canvas.getBoundingClientRect();
		mouseDotX = pxToDot(e.clientX - rect.left);
		mouseDotY = pxToDot(e.clientY - rect.top);

		updateHoverLine();
	};

	canvas.onmouseleave = () => {
		mouseDotX = null;
		mouseDotY = null;
		hoverLine = null;
	};

	const resizeCanvas = () => {
		const scale = window.devicePixelRatio || 1;

		width = canvas.clientWidth;
		dotRadius = width / 8 / numDots;

		canvas.width = width * scale;
		canvas.height = width * scale;

		ctx.scale(scale, scale);
	};

	resizeCanvas();
	window.onresize = resizeCanvas;

	const drawLine = (dotFirstX, dotFirstY, dotSecondX, dotSecondY) => {
		ctx.beginPath();
		ctx.moveTo(dotToPx(dotFirstX), dotToPx(dotFirstY));
		ctx.lineTo(dotToPx(dotSecondX), dotToPx(dotSecondY));
		ctx.lineWidth = dotRadius / 2;
		ctx.stroke();
	};

	const drawGame = () => {
		if (hoverLine) {
			const wave = Math.sin(Date.now() / 250) / 4 + 0.5;
			ctx.strokeStyle = `rgba(0, 255, 0, ${wave})`;
			drawLine(...hoverLine);
		}

		for (let y = 0; y < numDots; ++y) {
			for (let x = 0; x < numDots; ++x) {
				ctx.beginPath();
				ctx.arc(dotToPx(x), dotToPx(y), dotRadius, 0, 2 * Math.PI);
				ctx.fillStyle = 'black';
				ctx.fill();
			}
		}
	};

	const drawCanvas = () => {
		requestAnimationFrame(drawCanvas);

		ctx.fillStyle = '#ccc';
		ctx.fillRect(0, 0, width, width);
		drawGame();
	};

	requestAnimationFrame(drawCanvas);

	// setStatus("Red's Turn", 'crimson');
	setStatus("Blue's Turn", 'dodgerblue');
};

initGame(4);
