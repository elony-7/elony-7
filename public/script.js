let socket;
let token;
let username;

document.addEventListener('DOMContentLoaded', () => {
  showLoginPage();
  document.getElementById('loginUsername').addEventListener('keydown', handleEnter);
  document.getElementById('loginPassword').addEventListener('keydown', handleEnter);
  document.getElementById('registerUsername').addEventListener('keydown', handleEnter);
  document.getElementById('registerPassword').addEventListener('keydown', handleEnter);
  document.getElementById('chatInput').addEventListener('keydown', handleEnter);
});

function handleEnter(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const targetId = event.target.id;
    if (targetId === 'loginUsername' || targetId === 'loginPassword') {
      login();
    } else if (targetId === 'registerUsername' || targetId === 'registerPassword') {
      register();
    } else if (targetId === 'chatInput') {
      sendMessage();
    }
  }
}

function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('registerPage').style.display = 'none';
  document.getElementById('chatPage').style.display = 'none';
}

function showRegisterPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('registerPage').style.display = 'flex';
  document.getElementById('chatPage').style.display = 'none';
}

function showChatPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('registerPage').style.display = 'none';
  document.getElementById('chatPage').style.display = 'flex';
}

function login() {
  username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.token) {
      token = data.token;
      alert('Login successful!');
      showChatPage();
      setupWebSocket();
    } else {
      alert(data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('An error occurred during login.');
  });
}

function register() {
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;

  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === 'User registered') {
      alert('Registration successful! Please log in.');
      showLoginPage();
    } else {
      alert(data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('An error occurred during registration.');
  });
}

function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.hostname}:3000`;
  socket = new WebSocket(wsUrl);
  
  socket.onmessage = event => {
    const msg = JSON.parse(event.data);
    const chatBox = document.getElementById('chatBox');

    if (msg.type === 'history') {
      msg.messages.forEach(message => displayMessage(message, chatBox));
    } else {
      displayMessage(msg, chatBox);
    }
  };

  socket.onopen = () => {
    console.log('WebSocket connection established');
  };

  socket.onerror = error => {
    console.error('WebSocket error:', error);
    alert('An error occurred with the WebSocket connection.');
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
}

function displayMessage(msg, chatBox) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.dataset.sender = msg.username === username ? 'self' : 'other';
  messageElement.innerHTML = `
    <div class="avatar"></div>
    <div class="text"><strong>${msg.username}:</strong> ${msg.message}</div>
    <div class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</div>
  `;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value;
  socket.send(JSON.stringify({ type: 'chat', username, message }));
  chatInput.value = '';
}

function logout() {
  token = null;
  socket.close();
  alert('You have been logged out.');
  showLoginPage();
}
