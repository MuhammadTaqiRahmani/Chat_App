// Project: Relay - User Authentication System
// Developer: Muhammad Taqi Rahmani
// GitHub: https://github.com/MuhammadTaqiRahmani/User-Authentication-System

// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const createTableIfNotExists = require('./initDb');
const routes = require('./routes');

const app = express();
const hostname = '127.0.0.1';
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.use('/', routes);

// Initializing the database table
createTableIfNotExists();

// Starting my server
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
