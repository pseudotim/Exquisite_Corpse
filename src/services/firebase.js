// ── Firebase Initialization ───────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB_ETks5r9MqBR2xW0qXji485EBTq9T3P0",
  authDomain: "exquisite-corpse-4de4f.firebaseapp.com",
  databaseURL: "https://exquisite-corpse-4de4f-default-rtdb.firebaseio.com",
  projectId: "exquisite-corpse-4de4f",
  storageBucket: "exquisite-corpse-4de4f.firebasestorage.app",
  messagingSenderId: "82068580056",
  appId: "1:82068580056:web:fb34776448b41fdc2759ad",
  measurementId: "G-ZY5F0VXEKJ"
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
