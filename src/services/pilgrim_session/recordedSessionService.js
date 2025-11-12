import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const saveOrUpdateRecordedSessionData = async (uid, arrayName, newArray) => {
    if (!uid) throw new Error("User ID is required");

    // Preserve arrays as arrays. Only add createdAt if it's an object payload.
    const valueToSave = Array.isArray(newArray)
        ? newArray
        : {
            ...newArray,
            createdAt: newArray?.createdAt || new Date().toISOString()
        };

    // Correct Firestore path
    const docRef = doc(db, "pilgrim_sessions", uid, "sessions", "recordedSession");

    try {
        await updateDoc(docRef, { [arrayName]: valueToSave });
        return "updated";
    } catch (error) {
        if (error.code === "not-found" || error.message.includes("No document to update")) {
            await setDoc(docRef, { [arrayName]: valueToSave });
            return "created";
        } else {
            console.error("Error saving/updating recorded sessions data:", error);
            throw error;
        }
    }
};

export const fetchRecordedSessionData = async (uid) => {
    if (!uid) throw new Error("User ID is required");

    const recordedSessionRef = doc(db, `pilgrim_sessions/${uid}/sessions/recordedSession`);
    const docSnap = await getDoc(recordedSessionRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null; // no data yet
    }
};

export const deleteRecordedSessionByIndex = async (uid, index) => {
    try {
        const sessionRef = doc(db, `pilgrim_sessions/${uid}/sessions/recordedSession`);
        const docSnap = await getDoc(sessionRef);

        if (!docSnap.exists()) {
            throw new Error("Recorded session document not found");
        }

        const data = docSnap.data() || {};
        // Support both array and object storage for slides
        const slidesArray = Array.isArray(data.slides)
            ? data.slides
            : Object.values(data.slides || {});

        if (!slidesArray.length) {
            throw new Error("No slides found in recorded session document");
        }

        // Filter out the slide at the given index
        const updatedSession = slidesArray.filter((_, i) => i !== index);

        // Update Firestore
        await updateDoc(sessionRef, { slides: updatedSession });

        return "deleted";
    } catch (error) {
        console.error("Error deleting recorded session by index:", error);
        throw error;
    }
};

