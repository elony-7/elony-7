const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(cors());

const usersFilePath = './users.json';
const messagesFilePath = './messages.json';
const SECRET_KEY = 'your_secret_key';

// Read users from file
let users = [];
if (fs.existsSync(usersFilePath)) {
  const data = fs.readFileSync(usersFilePath);
  users = JSON.parse(data);
}

// Read messages from file
let messages = [];
if (fs.existsSync(messagesFilePath)) {
  const data = fs.readFileSync(messagesFilePath);
  messages = JSON.parse(data);
}

// Save users to file
function saveUsers() {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

// Save messages to file
function saveMessages() {
  fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));
}

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(user => user.username === username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = bcrypt.hashSync(password, 8);
  users.push({ username, password: hashedPassword });
  saveUsers();
  res.status(201).json({ message: 'User registered' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(user => user.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username }, SECRET_KEY);
  res.json({ token });
});

wss.on('connection', ws => {
  // Send the last 2 hours of messages to the new client
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recentMessages = messages.filter(msg => msg.timestamp >= twoHoursAgo);
  ws.send(JSON.stringify({ type: 'history', messages: recentMessages }));

  ws.on('message', message => {
    const msg = JSON.parse(message);
    if (msg.type === 'chat') {
      const newMessage = {
        username: msg.username,
        message: msg.message,
        timestamp: Date.now()
      };
      messages.push(newMessage);
      saveMessages();
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(newMessage));
        }
      });
    }
  });
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
