import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyAf1hl2QhUpcBGExjXv0S_5ban58kmcBKo",
    authDomain: "urban-pilgrim.firebaseapp.com",
    projectId: "urban-pilgrim",
    storageBucket: "urban-pilgrim.firebasestorage.app",
    messagingSenderId: "747989822476",
    appId: "1:747989822476:web:876d9c56022bad0c761229",
    measurementId: "G-2LVM11WFZ3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
