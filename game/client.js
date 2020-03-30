/* eslint-env browser */
/* global io:readonly */

const socket = io();
const joinContainer = document.getElementById('joinContainer');
const miscContainer = document.getElementById('miscContainer');
const gameContainer = document.getElementById('gameContainer');
const gameStatus = document.getElementById('gameStatus');

const colors = {
	red: 'crimson',
	blue: 'dodgerblue'
};

const hide = el => void (el.style.display = 'none');
const show = el => void (el.style.display = 'block');

const createTextElement = (tagName, innerText, parent) => {
	const el = document.createElement(tagName);
	el.innerText = innerText;
	if (parent) parent.appendChild(el);
	return el;
};

const handleError = err => {
	const container = document.createElement('div');
	container.className = 'bigContainer';

	createTextElement('h1', 'Error', container);
	createTextElement('p', err, container);

	document.body.appendChild(container);
};

const setGameStatus = (text, color) => {
	gameStatus.innerText = text;
	gameStatus.style.color = color;
};

const initGame = (size, ourColor) => {
	let cancelled = false;
	socket.on('gameCancelled', () => {
		cancelled = true;
		hide(gameContainer);
		handleError('Opponent left!');
	});

	const canvas = document.querySelector('canvas');
	const ctx = canvas.getContext('2d');

	let shouldRedraw = true;

	let width;
	let dotSpacing;
	let dotRadius;

	let turn = 'red';

	const updateTurn = () => {
		setGameStatus(
			turn === ourColor ? 'Your Turn' : "Opponent's Turn",
			colors[turn]
		);
	};
	updateTurn();

	let hoverLine = null;

	const lines = [];
	const boxes = [];

	const dotToPx = dot => ((dot / (size - 1)) * 0.8 + 0.1) * width;
	const pxToDot = px => ((px / width - 0.1) / 0.8) * (size - 1);

	const lineAt = (x1, y1, x2, y2) =>
		lines.find(
			line =>
				line[0] === x1 && line[1] === y1 && line[2] === x2 && line[3] === y2
		);

	const updateCursor = () => {
		canvas.style.cursor = hoverLine ? 'pointer' : 'auto';
	};

	const getScore = () => {
		let redScore = 0;
		let blueScore = 0;

		// eslint-disable-next-line no-unused-vars
		for (const [x, y, color] of boxes) {
			if (color === 'red') ++redScore;
			else ++blueScore;
		}

		return [redScore, blueScore];
	};

	const updateScore = () => {
		const [redScore, blueScore] = getScore();

		document.getElementById('redScore').innerText = redScore;
		document.getElementById('blueScore').innerText = blueScore;
	};
	updateScore();

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
				if (lower >= 0 && upper < size)
					hoverLine = [lower, roundedDotY, upper, roundedDotY];
			} else {
				const lower = Math.floor(mouseDotY);
				const upper = Math.ceil(mouseDotY);
				if (lower >= 0 && upper < size)
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

	socket.on('addLine', addedLine => {
		new Audio('./sounds/click.mp3').play();

		lines.push(addedLine);
		hoverLine = null;
		updateCursor();
		shouldRedraw = true;
	});

	socket.on('addBoxes', addedBoxes => {
		new Audio('./sounds/box.mp3').play();

		boxes.push(...addedBoxes);
		shouldRedraw = true;
		updateScore();
	});

	socket.on('updateTurn', newTurn => {
		turn = newTurn;
		updateTurn();
	});

	const declareWinner = winner => {
		if (winner) {
			const weWon = winner === ourColor;
			setGameStatus(weWon ? 'You Win' : 'You Lose', colors[winner]);
			document.body.classList.add(weWon ? 'gameWon' : 'gameLost');
			new Audio(`./sounds/${weWon ? 'win' : 'lose'}.mp3`).play();
		} else {
			setGameStatus("It's a tie!", 'white');
		}
	};

	socket.on('gameOver', () => {
		const [redScore, blueScore] = getScore();

		if (redScore > blueScore) {
			declareWinner('red');
		} else if (blueScore > redScore) {
			declareWinner('blue');
		} else {
			declareWinner(null);
		}
	});

	canvas.onclick = () => {
		if (hoverLine) {
			socket.emit('addLine', hoverLine);
		}
	};

	canvas.onmouseleave = () => {
		hoverLine = null;
	};

	const resizeCanvas = () => {
		const scale = window.devicePixelRatio || 1;

		width = canvas.clientWidth;
		dotSpacing = (width / (size - 1)) * 0.8 + 0.1;
		dotRadius = width / 8 / size;

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
		if (cancelled) return;
		requestAnimationFrame(drawCanvas);

		if (shouldRedraw || hoverLine) {
			shouldRedraw = false;

			ctx.fillStyle = '#ccc';
			ctx.fillRect(0, 0, width, width);

			for (const [x1, y1, player] of boxes) {
				ctx.fillStyle = colors[player];
				drawBox(x1, y1);
			}

			for (const [x1, y1, x2, y2, player] of lines) {
				ctx.strokeStyle = colors[player];
				drawLine(x1, y1, x2, y2);
			}

			if (hoverLine) {
				const wave = Math.sin(Date.now() / 250) / 4 + 0.5;
				ctx.strokeStyle = `rgba(0, 255, 0, ${wave})`;
				drawLine(...hoverLine);
			}

			for (let y = 0; y < size; ++y) {
				for (let x = 0; x < size; ++x) {
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

const gameCreated = code => {
	show(miscContainer);
	miscContainer.innerHTML = '';

	createTextElement('h1', code, miscContainer);
	createTextElement(
		'p',
		'Waiting for another player to join...',
		miscContainer
	);
};

document.getElementById('newGameButton').onclick = function() {
	hide(joinContainer);

	const container = document.createElement('div');
	container.className = 'bigContainer';

	for (const size of [3, 4, 5, 6]) {
		const p = document.createElement('p');

		const button = document.createElement('button');
		button.innerText = `${size}×${size}`;
		button.className = 'full';

		button.onclick = function() {
			container.remove();

			socket.emit('newGame', size, (err, code) => {
				if (err) {
					handleError(err);
				} else {
					gameCreated(code);
				}
			});
		};

		p.appendChild(button);
		container.appendChild(p);
	}

	document.body.appendChild(container);
};

document.getElementById('joinButton').onclick = function() {
	const code = document.getElementById('roomCode').value.trim();
	if (!code) return;

	socket.emit('joinGame', code, err => {
		if (err) {
			document.getElementById('joinProblem').innerText = err;
		}
	});
};

socket.on('gameStarted', (size, ourColor) => {
	hide(joinContainer);
	hide(miscContainer);
	show(gameContainer);
	initGame(size, ourColor);
});
