# Chill Cast - Synchronized Watch-Party Platform

A modern, full-stack web application that allows multiple users to watch videos together in real-time with synchronized playback, live chat, screen sharing, and social features.

## 🎨 Features

### Frontend
- **Modern UI/UX**: Dark mode with purple/blue gradients, Netflix + Discord inspired design
- **Responsive Design**: Desktop, mobile, and smart TV compatible
- **Progressive Web App**: Installable and works offline
- **Accessibility**: WCAG 2.1 compliant

### Backend
- **Real-time Synchronization**: <1s latency synchronized video playback
- **WebSocket Communication**: Socket.IO for instant updates
- **JWT Authentication**: Secure user authentication
- **MongoDB**: Flexible document-based database

### Core Features
1. **Authentication**: Email/password login, registration, guest access
2. **Room Management**: Create/join private or public rooms
3. **Synchronized Playback**: Real-time play/pause/seek synchronization
4. **Live Chat**: Real-time messaging with avatars and typing indicators
5. **Screen Sharing**: WebRTC-based screen sharing between participants
6. **Friends System**: Add/remove friends, see online status
7. **Gamification**: Daily challenges, watch streaks, leaderboards
8. **Accessibility**: Dark mode, theme toggle, accessibility features

## 🛠️ Tech Stack

### Frontend
- **React 18** with **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time communication
- **Zustand** for state management
- **React Router** for navigation
- **axios** for API calls

### Backend
- **Node.js** with **Express** framework
- **Socket.IO** for WebSocket communication
- **Firebase Admin SDK** for Authentication & Database
- **Google Firestore** for data storage
- **Helmet** for security headers

## 📁 Project Structure

```
chill/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── utils/            # Helper functions, stores, APIs
│   │   ├── styles/           # Global CSS
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── server/                    # Backend (Node.js + Express)
    ├── src/
    │   ├── routes/           # API routes
    │   ├── controllers/      # Route handlers
    │   ├── middleware/       # Express middleware
    │   ├── socket/           # Socket.IO handlers
    │   ├── config/           # Configuration
    │   ├── utils/            # Helper functions
    │   └── server.js         # Entry point
    ├── .env.example
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase Project (with Firestore and Auth enabled)

### Installation

1. **Clone and setup**
```bash
cd chill/client
npm install

cd ../server
npm install
```

2. **Configure environment variables**

**Server (.env)**
```
PORT=5000
FIREBASE_DATABASE_URL=https://<your-project>.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key-here
```

**Client (.env)**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# ... other firebase config
```

3. **Run development servers**

**Option A: Using the start script (Windows)**
Double click `start-dev.bat`

**Option B: Manual Start**

**Terminal 1 - Backend**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room
- `PUT /api/rooms/:roomId/playback` - Update playback state

### Messages
- `POST /api/rooms/:roomId/messages` - Send message
- `GET /api/rooms/:roomId/messages` - Get room messages
- `DELETE /api/rooms/messages/:messageId` - Delete message

## 🔌 Socket.IO Events

### Client → Server
- `joinRoom` - Join watch room
- `leaveRoom` - Leave watch room
- `syncPlayback` - Sync video playback (host only)
- `sendMessage` - Send chat message
- `userTyping` - Indicate typing
- `sendReaction` - Send emoji reaction
- `startScreenShare` - Start sharing screen
- `stopScreenShare` - Stop screen sharing

### Server → Client
- `roomJoined` - Room joined successfully
- `userJoined` - User joined the room
- `userLeft` - User left the room
- `playbackSync` - Playback state sync
- `newMessage` - New chat message
- `userTyping` - User typing indicator
- `reaction` - Emoji reaction received
- `screenShareStarted` - Screen share started
- `screenShareStopped` - Screen share stopped

## 🔐 Security Features

- HTTPS ready (via reverse proxy)
- JWT-based authentication
- Password hashing with bcryptjs
- CORS configuration
- Input validation
- Helmet security headers
- Rate limiting ready

## 🧪 Testing the Application

1. **Create a room**
   - Sign up and login
   - Click "Create Room"
   - Share the invite link with another user

2. **Test synchronization**
   - Open room in multiple browser tabs
   - Play/pause video and see sync across tabs

3. **Test chat**
   - Send messages and see real-time updates
   - Check typing indicators

4. **Test screen sharing**
   - Click screen share button
   - Select screen/window to share

## 📊 Database Models

### User
- name, email, passwordHash
- avatar, bio
- friends[], achievements[]
- watchStats (hours, rooms created, streaks)

### Room
- roomId, name, hostId
- participants[], videoUrl
- playbackState (isPlaying, currentTime, duration)
- isPrivate, maxParticipants

### Message
- roomId, senderId, content
- messageType (text, emoji, system)
- timestamps

### Challenge
- title, description, type
- reward (points, badge), difficulty
- expiresAt

## 🎯 Future Enhancements

- [ ] Cloud storage for videos
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Video recommendations
- [ ] Friend requests approval flow
- [ ] Custom video uploads
- [ ] Subscription tiers
- [ ] Social sharing features
- [ ] Advanced moderation tools

## 📝 License

MIT License - feel free to use this project

## 👥 Contributors

Built with ❤️ for watch parties

---

**Chill Cast** - Watch Together. Feel Closer. 🎬
