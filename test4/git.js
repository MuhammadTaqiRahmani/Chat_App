const express = require('express');
const path = require('path');
const fs = require('fs');
const { Request } = require('tedious');
const crypto = require('crypto');
const connection = require('../db');

const router = express.Router();

const validEmailServices = [
  'gmail.com',
  'hotmail.com',
  'yahoo.com',
  'outlook.com',
  'aol.com',
  'icloud.com'
];

const minPasswordLength = 8;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function containsUpperCase(str) {
  return /[A-Z]/.test(str);
}

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

router.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'signin.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

router.post('/signup', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (containsUpperCase(email)) {
    return res.status(400).send('Invalid email: Capital letters are not allowed');
  }

  const emailDomain = email.split('@')[1];
  if (!validEmailServices.includes(emailDomain)) {
    return res.status(400).send('Invalid email: Email service is not supported');
  }

  if (password.length < minPasswordLength) {
    return res.status(400).send('Invalid password: Password must be at least 8 characters long');
  }

  const hashedPassword = hashPassword(password);

  const checkEmailQuery = `SELECT COUNT(*) AS count FROM Users WHERE Email = @Email`;
  const checkRequest = new Request(checkEmailQuery, (err) => {
    if (err) {
      return res.status(500).send('Server error. Please try again later.');
    }
  });

  checkRequest.addParameter('Email', TYPES.NVarChar, email);

  let emailExists = false;

  checkRequest.on('row', columns => {
    columns.forEach(column => {
      if (column.value > 0) {
        emailExists = true;
      }
    });
  });

  checkRequest.on('requestCompleted', () => {
    if (emailExists) {
      res.status(400).send('This email is already registered.');
    } else {
      const insertQuery = `INSERT INTO Users (Email, Password) VALUES (@Email, @Password)`;
      const insertRequest = new Request(insertQuery, (err) => {
        if (err) {
          if (err.code === 'EREQUEST' && err.number === 2627) {
            res.status(400).send('This email is already registered.');
          } else {
            res.status(500).send('Error saving data.');
          }
        } else {
          res.status(200).send('User registered successfully.');
        }
      });

      insertRequest.addParameter('Email', TYPES.NVarChar, email);
      insertRequest.addParameter('Password', TYPES.NVarChar, hashedPassword);

      connection.execSql(insertRequest);
    }
  });

  connection.execSql(checkRequest);
});

router.post('/signin', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const emailDomain = email.split('@')[1];
  if (!validEmailServices.includes(emailDomain)) {
    return res.status(400).send('Invalid email: Email service is not supported');
  }

  const checkLoginQuery = `SELECT Password FROM Users WHERE Email = @Email`;
  const loginRequest = new Request(checkLoginQuery, (err, rowCount) => {
    if (err) {
      return res.status(500).send('Server error. Please try again later.');
    }

    if (rowCount === 0) {
      return res.status(400).send('Invalid email or password');
    }
  });

  loginRequest.addParameter('Email', TYPES.NVarChar, email);

  let storedHashedPassword = null;

  loginRequest.on('row', columns => {
    columns.forEach(column => {
      if (column.metadata.colName === 'Password') {
        storedHashedPassword = column.value;
      }
    });
  });

  loginRequest.on('requestCompleted', () => {
    if (storedHashedPassword) {
      const hashedPassword = hashPassword(password);
      if (hashedPassword === storedHashedPassword) {
        res.status(200).send('You are logged in');
      } else {
        res.status(400).send('Invalid email or password');
      }
    }
  });

  connection.execSql(loginRequest);
});

router.use((req, res) => {
  fs.readFile(path.join(__dirname, '404.html'), 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('<h1>404 Not Found</h1>');
    } else {
      res.status(404).send(data);
    }
  });
});

module.exports = router;