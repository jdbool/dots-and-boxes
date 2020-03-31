const path = require('path');
const Sequelize = require('sequelize');

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: path.join(__dirname, 'leaderboard.db'),
	logging: false
});

const Name = sequelize.define('name', {
	name: {
		type: Sequelize.STRING,
		primaryKey: true
	},
	wins: {
		type: Sequelize.INTEGER,
		allowNull: false
	}
});

module.exports = { sequelize, Name };
