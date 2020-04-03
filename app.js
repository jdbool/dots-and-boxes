require('dotenv').config();

const assert = require('assert');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const compression = require('compression');

const { sequelize } = require('./database');
require('./server')(http);

app.set('trust proxy', 'loopback');

app.use(compression());
app.use(express.static(path.join(__dirname, 'game'), { maxAge: '7d' }));

(async () => {
	const { PORT } = process.env;
	assert(PORT, 'No PORT environment variable set');
	await sequelize.sync();
	http.listen(PORT, () => {
		console.log(`HTTP listening on port ${PORT}`);
	});
})();
