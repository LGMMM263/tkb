// config.js
// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // <<< Đảm bảo dòng này đúng

const firebaseConfig = { 
    apiKey: "AIzaSyDt0pyCqJfa67knnOq1ihUMcqJaeYTQbXQ",
    authDomain: "check-tkb.firebaseapp.com",
    projectId: "check-tkb",
    storageBucket: "check-tkb.firebasestorage.app",
    messagingSenderId: "183727078698",
    appId: "1:183727078698:web:32f915adfe2de4a549b253",
    measurementId: "G-WNLXW51J95"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app); // <<< Đảm bảo dòng này được chạy và gán đúng
export const auth = getAuth(app);