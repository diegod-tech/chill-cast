# Quick Start Guide

## 📋 Requirements

- Node.js 16+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- MongoDB ([Local Installation](https://docs.mongodb.com/manual/installation/) or [MongoDB Atlas](https://www.mongodb.com/cloud))

## ⚡ Quick Start (5 minutes)

### Step 1: Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:**
- Create free cluster at https://www.mongodb.com/cloud/atlas
- Get connection string from "Connect" button

### Step 2: Clone and Install Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Backend will start on `http://localhost:5000`

### Step 3: Install Frontend (New Terminal)

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

### Step 4: Open in Browser

Visit `http://localhost:5173` and start testing!

---

## 🧪 Testing the App

### 1. Create Account
- Go to http://localhost:5173
- Click "Sign Up"
- Fill in name, email, password

### 2. Create a Room
- Click "Create Room" on dashboard
- Give it a name (e.g., "Movie Night")
- Click Create

### 3. Test Real-time Features
- Open room in multiple browser tabs
- Send chat message - see it update instantly
- Try play/pause on video

### 4. Test in Two Browsers
- Open `http://localhost:5173` in Chrome
- Open `http://localhost:5173` in Firefox
- Login to both
- Create room in Chrome, join from Firefox
- Test synchronized playback

---

## 📁 Project Structure

```
chill/
├── client/           # React frontend
│   ├── src/
│   │   ├── pages/   # Page components (Dashboard, WatchRoom, etc)
│   │   ├── components/ # Reusable components
│   │   ├── utils/   # API, socket, store, helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/          # Node.js backend
│   ├── src/
│   │   ├── routes/  # API endpoints
│   │   ├── controllers/ # Logic
│   │   ├── models/  # Database schemas
│   │   ├── socket/  # Real-time handlers
│   │   ├── middleware/ # Auth, error handling
│   │   └── server.js # Entry point
│   └── package.json
│
├── README.md        # Full documentation
├── API.md           # API reference
└── DEPLOYMENT.md    # Production guide
```

---

## 🔧 Common Issues & Solutions

### "Cannot find module"
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### MongoDB connection error
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB
mongod
```

### Port already in use
```bash
# Change port in .env
PORT=5001

# Or kill process using port
lsof -i :5000
kill -9 <PID>
```

### CORS error
Make sure `CORS_ORIGIN` in server `.env` matches client URL (usually `http://localhost:5173`)

### WebSocket connection fails
- Check Socket.IO is running on backend
- Verify `VITE_SOCKET_URL` in client `.env`
- Check browser console for errors

---

## 📚 Available Scripts

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check for errors
```

### Backend
```bash
npm run dev      # Start with auto-reload
npm start        # Start server
```

---

## 🌳 File Structure Details

### Frontend Pages
- `LandingPage.jsx` - Welcome page
- `LoginPage.jsx` - User login
- `RegisterPage.jsx` - User registration  
- `DashboardPage.jsx` - Main dashboard with rooms
- `WatchRoomPage.jsx` - Video player + chat
- `ProfilePage.jsx` - User profile & stats
- `FriendsPage.jsx` - Friends management
- `ChallengesPage.jsx` - Challenges & leaderboard
- `SettingsPage.jsx` - Settings & preferences

### Backend Routes
- `auth.js` - Authentication endpoints
- `rooms.js` - Room management endpoints
- `messages.js` - Chat message endpoints

### Database Models
- `User.js` - User accounts & stats
- `Room.js` - Watch party rooms
- `Message.js` - Chat messages
- `Challenge.js` - Gamification challenges
- `UserChallenge.js` - User challenge progress

---

## 🔐 Default Credentials

For local testing, no default credentials needed - create your own account!

---

## 🚀 Next Steps

1. **Customize Styling**: Edit `client/src/styles/globals.css`
2. **Add More Features**: Check backend controllers for examples
3. **Deploy**: See `DEPLOYMENT.md` for production setup
4. **Scale**: Add Redis cache, CDN, load balancing

---

## 📖 Documentation

- **Complete API Reference**: See `API.md`
- **Deployment Guide**: See `DEPLOYMENT.md`  
- **Main README**: See `README.md`

---

## 🆘 Need Help?

- Check console output for error messages
- Enable debug logging: Set `DEBUG=chillcast:*`
- Check browser DevTools (F12) for frontend errors
- Review MongoDB Atlas logs for database issues

---

## ✨ Tips

- Use VS Code for best development experience
- Install MongoDB Compass for easy database management
- Use Postman to test API endpoints
- Use Redux DevTools for state debugging

---

**Happy coding! 🎬**
