const randomString = require('randomstring');
const log = require('debug')('server');
const logGame = log.extend('game');

const { sequelize, Name } = require('./database');

const newGame = (code, size, redSocket) => ({
	code,
	size,
	redSocket,
	blueSocket: null,
	turn: 'red',
	lines: [],
	boxes: []
});

const lineAt = (lines, x1, y1, x2, y2) =>
	lines.find(
		line => line[0] === x1 && line[1] === y1 && line[2] === x2 && line[3] === y2
	);

const boxAt = (boxes, x1, y1) =>
	boxes.find(box => box[0] === x1 && box[1] === y1);

const boxLineOffsets = [
	[0, 0, 1, 0],
	[1, 0, 1, 1],
	[0, 1, 1, 1],
	[0, 0, 0, 1]
];

module.exports = http => {
	const io = require('socket.io')(http);

	const getWinner = game => {
		let redScore = 0;
		let blueScore = 0;

		// eslint-disable-next-line no-unused-vars
		for (const [x, y, color] of game.boxes) {
			if (color === 'red') ++redScore;
			else ++blueScore;
		}

		if (redScore > blueScore) return 'red';
		else if (blueScore > redScore) return 'blue';
		return null;
	};

	const gameFinished = game => {
		const winner = getWinner(game);
		if (!winner) return;

		const winnerSocket = winner === 'red' ? game.redSocket : game.blueSocket;

		winnerSocket.emit('promptWinnerName', async name => {
			if (typeof name !== 'string') return;
			name = name.trim().toLowerCase();
			if (!name) return;

			logGame(name);
			// eslint-disable-next-line no-unused-vars
			const [_, created] = await Name.findOrCreate({
				where: { name },
				defaults: {
					wins: 1
				},
				raw: true
			});
			if (!created) {
				await Name.increment('wins', {
					where: { name },
					raw: true
				});
			}
			const nameRows = await Name.findAll({
				order: [['wins', 'DESC']],
				limit: 10
			});
			winnerSocket.emit('displayLeaderboard', nameRows);
		});
	};

	const lineAdded = game => {
		let extraTurn = false;
		let numUnfilledBoxes = 0;
		let addedBoxes = [];

		// Fill in any boxes they just completed
		for (let y = 0; y < game.size - 1; ++y) {
			for (let x = 0; x < game.size - 1; ++x) {
				if (!boxAt(game.boxes, x, y)) {
					++numUnfilledBoxes;

					let shouldFill = true;
					for (const [x1, y1, x2, y2] of boxLineOffsets) {
						if (!lineAt(game.lines, x1 + x, y1 + y, x2 + x, y2 + y)) {
							shouldFill = false;
							break;
						}
					}

					if (shouldFill) {
						--numUnfilledBoxes;

						const box = [x, y, game.turn];
						game.boxes.push(box);
						addedBoxes.push(box);
						logGame('added box');

						extraTurn = true;
					}
				}
			}
		}

		if (addedBoxes.length) {
			io.to(game.code).emit('addBoxes', addedBoxes);
		}

		if (!numUnfilledBoxes) {
			io.to(game.code).emit('gameOver');
			gameFinished(game);
			log('ending game %s', game.code);
			delete games[game.code];
		} else if (!extraTurn) {
			// End turn
			game.turn = game.turn === 'red' ? 'blue' : 'red';
			io.to(game.code).emit('updateTurn', game.turn);
			logGame("%s's turn", game.turn);
		}
	};

	const games = {};

	const getNewRoomCode = () => {
		let length = 4;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const code = randomString.generate({
				length,
				charset: 'numeric'
			});
			if (!games[code]) return code;
			++length;
		}
	};

	const getGame = socket => {
		for (const code of Object.keys(socket.rooms))
			if (games[code]) return games[code];
	};

	io.on('connection', socket => {
		log('socket connected');

		socket.on('disconnecting', () => {
			log('socket disconnecting');
			for (const code of Object.keys(socket.rooms)) {
				if (games[code]) {
					log('cancelling game %s', code);
					delete games[code];
					socket.to(code).emit('gameCancelled');
				}
			}
		});

		socket.on('disconnect', () => {
			log('socket disconnected');
		});

		socket.on('newGame', (size, callback) => {
			if (typeof size !== 'number' || typeof callback !== 'function') return;

			if (getGame(socket)) {
				callback('already in a room');
				return;
			}

			size = Math.floor(size);
			if (size < 3 || size > 6) {
				callback('invalid size');
				return;
			}

			const code = getNewRoomCode();

			log('creating game %s', code);
			logGame('size is %d', size);
			games[code] = newGame(code, size, socket);
			socket.join(code);

			callback(null, code);
		});

		socket.on('joinGame', (code, callback) => {
			if (typeof code !== 'string' || typeof callback !== 'function') return;

			if (getGame(socket)) {
				callback('already in a room');
				return;
			}

			const game = games[code];
			if (!game) {
				callback('invalid code');
				return;
			}

			if (game.blueSocket) {
				callback('room full');
				return;
			}

			game.blueSocket = socket;
			socket.join(code);

			game.redSocket.emit('gameStarted', game.size, 'red');
			game.blueSocket.emit('gameStarted', game.size, 'blue');
		});

		socket.on('addLine', line => {
			if (!(line instanceof Array)) return;

			const game = getGame(socket);
			if (!game) return;

			if (lineAt(game.lines, ...line)) return;

			const color = game.redSocket === socket ? 'red' : 'blue';
			if (game.turn !== color) return;

			line.push(color);
			game.lines.push(line);

			io.to(game.code).emit('addLine', line);
			logGame('added line');

			lineAdded(game);
		});
	});
};
