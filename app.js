require('dotenv').config();

const assert = require('assert');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').createServer(app);

require('./src/server')(http);

app.set('trust proxy', 'loopback');

app.use(express.static(path.join(__dirname, 'game')));

{
	const { PORT } = process.env;
	assert(PORT, 'No PORT environment variable set');
	http.listen(PORT, () => {
		console.log(`HTTP listening on port ${PORT}`);
	});
}
