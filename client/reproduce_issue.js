import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, setPersistence, inMemoryPersistence } from 'firebase/auth';
import axios from 'axios';

const firebaseConfig = {
    apiKey: "AIzaSyBxZpAga3HXnlVl7lRROqfq4k17C0znBto",
    authDomain: "chillcast-1-prod.firebaseapp.com",
    projectId: "chillcast-1-prod",
    storageBucket: "chillcast-1-prod.firebasestorage.app",
    messagingSenderId: "682615494092",
    appId: "1:682615494092:web:f020d5833b85983ce0f969",
    databaseURL: "https://chillcast-1-prod-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use in-memory persistence for Node.js environment
// (Pass through execution)
async function runCallback() {
    try {
        console.log("Setting persistence...");
        await setPersistence(auth, inMemoryPersistence);

        const email = `test-${Date.now()}@example.com`;
        const password = 'password123';
        const name = 'DebugUser';

        console.log(`Attempting to register user: ${email}`);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Firebase Auth successful. UID:", user.uid);

        const token = await user.getIdToken();
        console.log("Got ID token");

        // 1. Register on Backend
        const authUrl = "http://localhost:5000/api/auth/register";
        console.log("Syncing user to backend:", authUrl);
        await axios.post(authUrl, {
            uid: user.uid,
            email: user.email,
            name: name,
            avatar: ''
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("User registered on backend.");

        // 2. Create Room
        const roomUrl = "http://localhost:5000/api/rooms";
        console.log("Creating room at:", roomUrl);

        const response = await axios.post(roomUrl, {
            name: "Debug Room",
            type: "public"
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Room created successfully!");
        console.log("Room ID:", response.data.roomId);
        console.log("Full response:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error("Error encountered!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.code) {
            console.error("Firebase Error Code:", error.code);
            console.error("Message:", error.message);
        } else {
            console.error(error.message);
            console.error(error.stack);
        }
    }
}

runCallback();
