# API Documentation

## Base URL
```
Production: https://api.chillcast.com
Development: http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get Current User
**GET** `/auth/me`

Get authenticated user's information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://...",
  "bio": "Video enthusiast",
  "watchStats": {
    "totalHours": 42,
    "roomsCreated": 5,
    "currentStreak": 7
  }
}
```

### Logout
**POST** `/auth/logout`

Sign out user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## Room Endpoints

### Create Room
**POST** `/rooms`

Create a new watch party room.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Movie Night",
  "roomId": "unique-room-id",
  "isPrivate": false,
  "videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (201):**
```json
{
  "message": "Room created successfully",
  "room": {
    "_id": "507f1f77bcf86cd799439011",
    "roomId": "unique-room-id",
    "name": "Movie Night",
    "hostId": "507f1f77bcf86cd799439012",
    "participants": [
      {
        "userId": "507f1f77bcf86cd799439012",
        "joinedAt": "2024-02-10T10:30:00Z"
      }
    ],
    "isPrivate": false,
    "playbackState": {
      "isPlaying": false,
      "currentTime": 0,
      "duration": 0
    }
  }
}
```

### Get Room
**GET** `/rooms/:roomId`

Retrieve room details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "roomId": "unique-room-id",
  "name": "Movie Night",
  "hostId": { /* User object */ },
  "participants": [ /* Array of users */ ],
  "isPrivate": false,
  "isActive": true,
  "playbackState": {
    "isPlaying": false,
    "currentTime": 0,
    "duration": 120
  }
}
```

### Join Room
**POST** `/rooms/:roomId/join`

Join an existing room.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Joined room successfully",
  "room": { /* Room object */ }
}
```

### Leave Room
**POST** `/rooms/:roomId/leave`

Leave a room.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Left room successfully"
}
```

### Update Playback State
**PUT** `/rooms/:roomId/playback`

Sync video playback (host only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "isPlaying": true,
  "currentTime": 45.5,
  "duration": 120
}
```

**Response (200):**
```json
{
  "message": "Playback state updated",
  "playbackState": {
    "isPlaying": true,
    "currentTime": 45.5,
    "duration": 120,
    "lastSyncTime": "2024-02-10T10:35:12Z"
  }
}
```

---

## Message Endpoints

### Send Message
**POST** `/rooms/:roomId/messages`

Send a chat message in a room.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "This movie is amazing!",
  "messageType": "text"
}
```

**Response (201):**
```json
{
  "message": "Message sent",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "roomId": "507f1f77bcf86cd799439011",
    "senderId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "avatar": "https://..."
    },
    "content": "This movie is amazing!",
    "messageType": "text",
    "createdAt": "2024-02-10T10:40:00Z"
  }
}
```

### Get Messages
**GET** `/rooms/:roomId/messages?limit=50&skip=0`

Retrieve chat messages from a room.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (default: 50) - Max messages to return
- `skip` (default: 0) - Number of messages to skip for pagination

**Response (200):**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "roomId": "507f1f77bcf86cd799439011",
      "senderId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "avatar": "https://..."
      },
      "content": "This movie is amazing!",
      "createdAt": "2024-02-10T10:40:00Z"
    }
  ],
  "total": 120,
  "limit": 50,
  "skip": 0
}
```

### Delete Message
**DELETE** `/rooms/messages/:messageId`

Delete your own message.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Message deleted"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "status": 400,
    "message": "Invalid request data"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "status": 401,
    "message": "Invalid credentials"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "message": "You are not authorized to perform this action"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "status": 404,
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "status": 500,
    "message": "Internal server error"
  }
}
```

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **Public endpoints**: 100 requests per 15 minutes
- **Protected endpoints**: 300 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Pagination

List endpoints support pagination via query parameters:

```
GET /rooms?limit=20&skip=0
```

**Response:**
```json
{
  "data": [ /* array of items */ ],
  "total": 100,
  "limit": 20,
  "skip": 0
}
```
