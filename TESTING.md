# Testing Guide - Chill Cast

## Pre-Testing Checklist

- [ ] Node.js 16+ installed
- [ ] MongoDB running (or MongoDB Atlas configured)
- [ ] Both client and server dependencies installed
- [ ] .env files configured for both client and server
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173

---

## 1. Authentication Testing

### Register New User
1. Go to http://localhost:5173
2. Click "Sign Up" button
3. Enter:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
4. Click "Create Account"
5. **Expected:** Should redirect to dashboard, token saved

### Login
1. Go to http://localhost:5173/login
2. Enter credentials from above
3. Click "Login"
4. **Expected:** Redirected to dashboard

### Guest Login
1. From login page, click "Continue as Guest"
2. **Expected:** Redirected to dashboard without authentication

### Token Persistence
1. Login and navigate around
2. Refresh page (F5)
3. **Expected:** Still logged in, session persists

---

## 2. Dashboard Testing

### View Dashboard
1. After login, verify you see:
   - [ ] Welcome header
   - [ ] Create Room button
   - [ ] Stats cards (0 initial values)
   - [ ] Recently Joined section

### Create Room
1. Click "Create Room" button
2. Fill in form:
   - Room Name: "Test Movie Night"
   - Privacy: Uncheck for public
3. Click "Create"
4. **Expected:** Room created, redirected to watch room

### Navigate Pages
Click on each sidebar item:
- [ ] Dashboard - Room list
- [ ] Friends - Friend management
- [ ] Challenges - Challenges & leaderboard
- [ ] Settings - Theme & preferences

---

## 3. Real-Time Chat Testing

### Send Message
1. In watch room, locate chat panel
2. Type message: "Hello everyone!"
3. Press Enter or click Send
4. **Expected:** Message appears in chat with timestamp

### Multiple Browser Test
1. Open http://localhost:5173 in Chrome
2. Open http://localhost:5173 in Firefox
3. Both login (use different accounts)
4. Both join same room
5. Send message from Chrome
6. **Expected:** Message appears instantly in Firefox

### Message Types
- [ ] Text message appears correctly
- [ ] Timestamps display
- [ ] Sender name displays
- [ ] User avatars show (if available)

---

## 4. Video Playback Testing

### Player Appearance
1. In watch room, verify:
   - [ ] YouTube embed displays
   - [ ] Play/pause button works
   - [ ] Progress bar visible
   - [ ] Duration shows

### Playback Controls
1. Click Play button
2. Click Pause button
3. Drag progress bar to different position
4. **Expected:** Controls reflect state

### Synchronized Playback (Multi-browser)
1. Open room in two browsers
2. Click Play in browser 1
3. **Expected:** Video shows playing in browser 2
4. Seek to 1:00 in browser 1
5. **Expected:** Browser 2 syncs to 1:00

---

## 5. Host Controls Testing

### Role-Based Control
1. User who created room = Host
2. Only host can control playback:
   - [ ] Host can play/pause
   - [ ] Other users see "Syncing..."
   - [ ] Changes apply to all participants

### Participant Join
1. From first browser (host), copy room ID
2. From second browser, navigate to room
3. **Expected:** Participant list updates with new user

---

## 6. Friends System Testing

### Friends Page
1. Navigate to Friends page
2. Verify sections:
   - [ ] Total Friends count (0 initially)
   - [ ] Online friends count
   - [ ] Pending requests
   - [ ] Search bar functional

### Add Friend
1. Click "Add Friend" button
2. Enter friend email or username
3. **Expected:** Request sent (or friend added immediately)

---

## 7. Challenges Testing

### View Challenges
1. Navigate to Challenges page
2. Verify display:
   - [ ] Challenge titles visible
   - [ ] Progress bars shown
   - [ ] Difficulty badges appear
   - [ ] Reward points display

### Leaderboard
1. Verify top section shows:
   - [ ] Rank (1, 2, 3...)
   - [ ] Player names
   - [ ] Points/scores
2. Verify personal rank at bottom
3. **Expected:** Ranked display shows

---

## 8. Settings Testing

### Display Settings
1. Navigate to Settings
2. Toggle "Dark Mode"
3. **Expected:** Theme immediately changes

### Notification Settings
1. Toggle various notification switches
2. **Expected:** Settings update correctly
3. Refresh page
4. **Expected:** Settings persist

### Language Selector
1. Select different language from dropdown
2. **Expected:** UI updates (if translations implemented)

---

## 9. Profile Testing

### View Profile
1. Navigate to Profile page
2. Verify sections:
   - [ ] User avatar/name
   - [ ] Stats (watch hours, rooms created, friends)
   - [ ] Achievements/badges
   - [ ] Logout button

### Stats Display
1. Verify stats are numeric:
   - [ ] Watch Hours: 0
   - [ ] Rooms Created: 1 (if created room)
   - [ ] Friends: 0+
   - [ ] Challenges: 0

### Logout
1. Click "Logout" button
2. **Expected:** Redirected to landing page, token cleared

---

## 10. API Endpoint Testing (with Postman)

### Authentication Endpoints

**Register:**
```
POST http://localhost:5000/api/auth/register
Body: {
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
Expected: 201, returns token & user
```

**Login:**
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "test@example.com",
  "password": "password123"
}
Expected: 200, returns token
```

**Get Current User:**
```
GET http://localhost:5000/api/auth/me
Header: Authorization: Bearer <token>
Expected: 200, returns user object
```

### Room Endpoints

**Create Room:**
```
POST http://localhost:5000/api/rooms
Header: Authorization: Bearer <token>
Body: {
  "name": "Test Room",
  "roomId": "unique-id",
  "isPrivate": false,
  "videoUrl": ""
}
Expected: 201, room created
```

**Get Room:**
```
GET http://localhost:5000/api/rooms/unique-id
Header: Authorization: Bearer <token>
Expected: 200, room details
```

**Join Room:**
```
POST http://localhost:5000/api/rooms/unique-id/join
Header: Authorization: Bearer <token>
Expected: 200, joined successfully
```

### Message Endpoints

**Send Message:**
```
POST http://localhost:5000/api/rooms/unique-id/messages
Header: Authorization: Bearer <token>
Body: {
  "content": "Hello!",
  "messageType": "text"
}
Expected: 201, message created
```

**Get Messages:**
```
GET http://localhost:5000/api/rooms/unique-id/messages?limit=50&skip=0
Header: Authorization: Bearer <token>
Expected: 200, array of messages
```

---

## 11. Socket.IO Event Testing

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for Socket.IO connection messages

### Connection Events
- [ ] Socket connects when entering room
- [ ] Socket emits "joinRoom" event
- [ ] Server confirms with "roomJoined"
- [ ] Other users get "userJoined" notification

### Message Events
1. Send chat message
2. In browser console, see:
   - [ ] "sendMessage" event emitted
   - [ ] "newMessage" event received
3. **Expected:** Flow shows in console

### Playback Events
1. Play/pause video
2. In console, verify:
   - [ ] "syncPlayback" event emitted
   - [ ] Change reflected in other browser

---

## 12. Error Handling Testing

### Invalid Credentials
1. Try login with wrong password
2. **Expected:** Error message displays

### Missing Fields
1. Try register without email
2. **Expected:** Validation error shows

### Non-Existent Room
1. Go to http://localhost:5173/room/invalid-id
2. **Expected:** Error or redirect

### Token Expiration
1. Manually delete authToken from localStorage
2. Try accessing protected route
3. **Expected:** Redirected to login

---

## 13. Performance Testing

### Page Load Time
1. Open DevTools Network tab
2. Refresh dashboard page
3. **Expected:** Main.js loads within 1s

### Message Latency
1. Send chat message from browser A
2. Measure time to see in browser B
3. **Expected:** <500ms (excellent)

### Video Sync Latency
1. Play video in browser A
2. Check exact time
3. Check video time in browser B
4. **Expected:** <1000ms sync time

---

## 14. Responsive Design Testing

### Test Breakpoints
1. Website on desktop - **Expected:** Full layout
2. Resize to tablet (768px) - **Expected:** Single column
3. Resize to mobile (375px) - **Expected:** Mobile optimized

### Mobile Features
- [ ] Sidebar collapses on mobile
- [ ] Chat is readable on small screen
- [ ] Video player adapts to screen size
- [ ] Buttons are touch-friendly

---

## 15. Accessibility Testing

### Keyboard Navigation
1. Press Tab repeatedly
2. **Expected:** All interactive elements accessible
3. Press Enter on buttons
4. **Expected:** Actions trigger

### Focus Indicators
1. Tab through form inputs
2. **Expected:** Focus outline visible

### Screen Reader
1. Use browser accessibility features
2. Form labels should be announced
3. Button purposes should be clear

---

## 16. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Edge (Latest)

---

## Logging Test Results

Create a test results file:

```markdown
# Test Results - [Date]

## Environment
- Node.js: [version]
- MongoDB: [local/atlas]
- Browser: [Chrome/Firefox/etc]

## Test Summary
- Passed: ✓
- Failed: ✗
- Issues: (list any)

## Detailed Results
[List each test with pass/fail]
```

---

## Common Issues & Solutions

### API Returns 401
- Check token in Authorization header
- Verify TOKEN is current (not expired)
- Ensure format: "Bearer <token>"

### Socket Connection Fails
- Check backend is running
- Verify VITE_SOCKET_URL in .env
- Check browser console for errors

### MongoDB Connection Error
- Verify mongod is running
- Check connection string in .env
- For Atlas, verify IP whitelist

### Styling Not Applied
- Verify Tailwind CSS is running
- Check terminal for build errors
- Clear browser cache (Ctrl+Shift+Delete)

---

## Test Automation (Optional)

### Frontend Tests
```bash
npm install --save-dev @testing-library/react cypress
npm run test
```

### API Tests
```bash
npm run test:api
```

---

## Performance Benchmarks

Record baseline:
- Page load time: ___ms
- Message latency: ___ms
- Video sync latency: ___ms
- Memory usage: ___MB

---

## Testing Checklist

Before deploying to production:

- [ ] All 16 API endpoints tested
- [ ] Real-time sync verified
- [ ] Error handling verified
- [ ] Responsive on all devices
- [ ] Accessibility tested
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

---

**Ready to test? Start with "1. Authentication Testing"**
