/* eslint-env browser */

const body = document.body;
const gameContainer = document.getElementById('gameContainer');
const status = document.getElementById('status');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const setStatus = (text, colour) => {
	status.innerText = text;
	status.style.color = colour;
};

const initGame = numDots => {
	gameContainer.style.display = 'block';

	const players = {
		red: {
			colour: 'crimson',
			numBoxes: 0
		},
		blue: {
			colour: 'dodgerblue',
			numBoxes: 0
		}
	};

	let shouldRedraw = true;

	let width;
	let dotSpacing;
	let dotRadius;

	let turn = 'red';

	let hoverLine = null;

	const lines = [];
	const boxes = [];

	const updateTurn = () => {
		const player = players[turn];
		setStatus(`${turn}'s turn`, player.colour);
	};
	updateTurn();

	const updateScore = () => {
		document.getElementById('redScore').innerText = players.red.numBoxes;
		document.getElementById('blueScore').innerText = players.blue.numBoxes;
	};
	updateScore();

	const dotToPx = dot => ((dot / (numDots - 1)) * 0.8 + 0.1) * width;
	const pxToDot = px => ((px / width - 0.1) / 0.8) * (numDots - 1);

	const lineAt = (x1, y1, x2, y2) =>
		lines.find(
			line =>
				line[0] === x1 && line[1] === y1 && line[2] === x2 && line[3] === y2
		);

	const boxAt = (x1, y1) => boxes.find(box => box[0] === x1 && box[1] === y1);

	const updateCursor = () => {
		canvas.style.cursor = hoverLine ? 'pointer' : 'auto';
	};

	const updateHoverLine = (mouseDotX, mouseDotY) => {
		const lastHoverLine = hoverLine;

		hoverLine = null;

		const roundedDotX = Math.round(mouseDotX);
		const roundedDotY = Math.round(mouseDotY);

		const tolerance = 0.15;
		const isCloseX = Math.abs(mouseDotX - roundedDotX) < tolerance;
		const isCloseY = Math.abs(mouseDotY - roundedDotY) < tolerance;

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

		if (hoverLine && lineAt(...hoverLine)) {
			hoverLine = null;
		}

		if (lastHoverLine !== hoverLine) {
			updateCursor();
			shouldRedraw = true;
		}
	};

	canvas.onmousemove = function(e) {
		const rect = canvas.getBoundingClientRect();
		const mouseDotX = pxToDot(e.clientX - rect.left);
		const mouseDotY = pxToDot(e.clientY - rect.top);

		updateHoverLine(mouseDotX, mouseDotY);
	};

	const boxLineOffsets = [
		[0, 0, 1, 0],
		[1, 0, 1, 1],
		[0, 1, 1, 1],
		[0, 0, 0, 1]
	];

	canvas.onclick = () => {
		if (hoverLine) {
			// Add the line
			hoverLine.push(turn);
			lines.push(hoverLine);
			hoverLine = null;
			updateCursor();

			let extraTurn = false;
			let numUnfilledBoxes = 0;

			// Fill in any boxes they just completed
			for (let y = 0; y < numDots - 1; ++y) {
				for (let x = 0; x < numDots - 1; ++x) {
					if (!boxAt(x, y)) {
						++numUnfilledBoxes;

						let shouldFill = true;
						for (const [x1, y1, x2, y2] of boxLineOffsets) {
							if (!lineAt(x1 + x, y1 + y, x2 + x, y2 + y)) {
								shouldFill = false;
								break;
							}
						}

						if (shouldFill) {
							--numUnfilledBoxes;

							boxes.push([x, y, turn]);

							players[turn].numBoxes++;
							updateScore();

							extraTurn = true;
						}
					}
				}
			}

			if (!numUnfilledBoxes) {
				console.log('gg');
				body.classList.add('gameWon');
			} else if (!extraTurn) {
				// End turn
				turn = turn === 'red' ? 'blue' : 'red';
				updateTurn();
			}

			shouldRedraw = true;
		}
	};

	canvas.onmouseleave = () => {
		hoverLine = null;
	};

	const resizeCanvas = () => {
		const scale = window.devicePixelRatio || 1;

		width = canvas.clientWidth;
		dotSpacing = (width / (numDots - 1)) * 0.8 + 0.1;
		dotRadius = width / 8 / numDots;

		canvas.width = width * scale;
		canvas.height = width * scale;

		ctx.scale(scale, scale);

		shouldRedraw = true;
	};

	resizeCanvas();
	window.onresize = resizeCanvas;

	const drawLine = (x1, y1, x2, y2) => {
		ctx.beginPath();
		ctx.moveTo(dotToPx(x1), dotToPx(y1));
		ctx.lineTo(dotToPx(x2), dotToPx(y2));
		ctx.lineWidth = dotRadius / 2;
		ctx.stroke();
	};

	const drawRoundRect = (x, y, width, height, radius) => {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	};

	const drawBox = (x1, y1) => {
		const offset = dotRadius;
		const size = dotSpacing - offset * 2;
		drawRoundRect(
			dotToPx(x1) + offset,
			dotToPx(y1) + offset,
			size,
			size,
			dotRadius
		);
		ctx.fill();
	};

	const drawCanvas = () => {
		requestAnimationFrame(drawCanvas);

		if (shouldRedraw || hoverLine) {
			shouldRedraw = false;

			ctx.fillStyle = '#ccc';
			ctx.fillRect(0, 0, width, width);

			for (const [x1, y1, player] of boxes) {
				const { colour } = players[player];
				ctx.fillStyle = colour;
				drawBox(x1, y1);
			}

			for (const [x1, y1, x2, y2, player] of lines) {
				const { colour } = players[player];
				ctx.strokeStyle = colour;
				drawLine(x1, y1, x2, y2);
			}

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
		}
	};

	requestAnimationFrame(drawCanvas);
};

initGame(5);
