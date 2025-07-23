// DOM Elements
const authScreen = document.getElementById('authScreen');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const usernameError = document.getElementById('usernameError');
const currentUsername = document.getElementById('currentUsername');
const userAvatar = document.getElementById('userAvatar');
const roomList = document.getElementById('roomList');
const roomSearch = document.getElementById('roomSearch');
const createRoomBtn = document.getElementById('createRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const closeModal = document.querySelector('.close-modal');
const newRoomName = document.getElementById('newRoomName');
const confirmCreateRoom = document.getElementById('confirmCreateRoom');
const chatHeader = document.getElementById('chatHeader');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const formattingTools = document.querySelectorAll('.format-btn');

// App State
let currentUser = null;
let currentRoom = null;
let rooms = [
    { id: 'general', name: 'General Chat', users: [] },
    { id: 'random', name: 'Random', users: [] },
    { id: 'help', name: 'Help Desk', users: [] }
];
let users = [];
let messages = {};

// Mock WebSocket (in a real app, replace with actual WebSocket)
class MockWebSocket {
    constructor() {
        this.listeners = {
            message: [],
            open: []
        };
    }

    send(data) {
        // Simulate server response after a short delay
        setTimeout(() => {
            const msg = JSON.parse(data);
            if (msg.type === 'join') {
                this.handleJoin(msg);
            } else if (msg.type === 'message') {
                this.handleMessage(msg);
            } else if (msg.type === 'create_room') {
                this.handleCreateRoom(msg);
            }
        }, 100);
    }

    handleJoin(msg) {
        const response = {
            type: 'join_ack',
            success: true,
            username: msg.username,
            room: msg.room,
            users: [...users, msg.username],
            messages: messages[msg.room] || []
        };
        this.triggerMessage(response);
    }

    handleMessage(msg) {
        const room = msg.room;
        if (!messages[room]) messages[room] = [];
        messages[room].push({
            username: msg.username,
            content: msg.content,
            timestamp: new Date().toISOString()
        });
        
        const response = {
            type: 'new_message',
            room: room,
            message: messages[room][messages[room].length - 1]
        };
        this.triggerMessage(response);
    }

    handleCreateRoom(msg) {
        const newRoom = {
            id: msg.roomName.toLowerCase().replace(/\s+/g, '-'),
            name: msg.roomName,
            users: []
        };
        rooms.push(newRoom);
        
        const response = {
            type: 'room_created',
            room: newRoom
        };
        this.triggerMessage(response);
    }

    triggerMessage(msg) {
        this.listeners.message.forEach(callback => {
            callback({ data: JSON.stringify(msg) });
        });
    }

    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
}

// Initialize WebSocket
const socket = new MockWebSocket(); // Replace with new WebSocket('ws://yourserver.com') in production

// Event Listeners
joinButton.addEventListener('click', handleJoin);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleJoin();
});

createRoomBtn.addEventListener('click', () => {
    createRoomModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    createRoomModal.style.display = 'none';
});

confirmCreateRoom.addEventListener('click', createNewRoom);
newRoomName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createNewRoom();
});

roomSearch.addEventListener('input', filterRooms);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

formattingTools.forEach(tool => {
    tool.addEventListener('click', () => {
        const format = tool.getAttribute('data-format');
        applyFormatting(format);
    });
});

// Socket Events
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'join_ack':
            handleJoinAck(data);
            break;
        case 'new_message':
            handleNewMessage(data);
            break;
        case 'room_created':
            handleRoomCreated(data);
            break;
    }
});

// Functions
function handleJoin() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        usernameError.textContent = 'Please enter a username';
        return;
    }
    
    if (users.includes(username)) {
        usernameError.textContent = 'Username already taken';
        return;
    }
    
    // In a real app, this would be a WebSocket message to the server
    currentUser = username;
    users.push(username);
    
    // Update UI
    currentUsername.textContent = username;
    userAvatar.textContent = username.charAt(0).toUpperCase();
    
    // Hide auth screen, show chat
    authScreen.style.display = 'none';
    chatContainer.style.display = 'flex';
    
    // Load rooms
    renderRooms();
    
    // Simulate joining the general room by default
    joinRoom('general');
}

function handleJoinAck(data) {
    if (data.success) {
        currentRoom = data.room;
        users = data.users;
        
        // Update room list to show active users
        renderRooms();
        
        // Update chat header
        const room = rooms.find(r => r.id === currentRoom);
        chatHeader.innerHTML = `
            <h3>${room.name}</h3>
            <small>${users.length} active users</small>
        `;
        
        // Load messages
        messagesContainer.innerHTML = '';
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                addMessageToChat(msg, false);
            });
        }
        
        // Enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
    }
}

function renderRooms() {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = `room-item ${currentRoom === room.id ? 'active' : ''}`;
        roomItem.innerHTML = `
            <span class="room-name">${room.name}</span>
            <span class="room-users">${room.users.length} users</span>
        `;
        roomItem.addEventListener('click', () => joinRoom(room.id));
        roomList.appendChild(roomItem);
    });
}

function filterRooms() {
    const searchTerm = roomSearch.value.toLowerCase();
    const roomItems = document.querySelectorAll('.room-item');
    
    roomItems.forEach(item => {
        const roomName = item.querySelector('.room-name').textContent.toLowerCase();
        if (roomName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function joinRoom(roomId) {
    currentRoom = roomId;
    renderRooms();
    
    // Send join message to server
    socket.send(JSON.stringify({
        type: 'join',
        username: currentUser,
        room: roomId
    }));
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentRoom) return;
    
    // Send message to server
    socket.send(JSON.stringify({
        type: 'message',
        username: currentUser,
        room: currentRoom,
        content: content
    }));
    
    // Clear input
    messageInput.value = '';
}

function handleNewMessage(data) {
    if (data.room === currentRoom) {
        addMessageToChat(data.message, true);
    }
    
    // Show notification if not in the active room
    if (data.room !== currentRoom) {
        showNotification(`New message in ${data.room}`);
    }
}

function addMessageToChat(message, scrollToBottom) {
    const isCurrentUser = message.username === currentUser;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-info">
            <span>${isCurrentUser ? 'You' : message.username}</span>
            <span>${timeString}</span>
        </div>
        <div class="message-content">${formatMessageContent(message.content)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    if (scrollToBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function formatMessageContent(content) {
    // Simple formatting - in a real app you'd want more robust parsing
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return formatted;
}

function applyFormatting(format) {
    const input = messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    let formattedText = '';
    
    switch (format) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'link':
            formattedText = `[${selectedText}](url)`;
            break;
    }
    
    input.value = input.value.substring(0, start) + formattedText + input.value.substring(end);
    input.focus();
    input.setSelectionRange(start + 2, start + 2 + selectedText.length);
}

function createNewRoom() {
    const roomName = newRoomName.value.trim();
    if (!roomName) return;
    
    // Send create room request to server
    socket.send(JSON.stringify({
        type: 'create_room',
        roomName: roomName,
        username: currentUser
    }));
    
    // Close modal and clear input
    createRoomModal.style.display = 'none';
    newRoomName.value = '';
}

function handleRoomCreated(data) {
    rooms.push(data.room);
    renderRooms();
    joinRoom(data.room.id);
    showNotification(`Room "${data.room.name}" created`);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize
messagesContainer.innerHTML = '<div class="empty-state">Select a room to start chatting</div>';