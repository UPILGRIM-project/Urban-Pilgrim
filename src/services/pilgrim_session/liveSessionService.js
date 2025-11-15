import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export const saveOrUpdateLiveSessionData = async (uid, arrayName, newArray) => {
    if (!uid) throw new Error("User ID is required");

    // Add createdAt timestamp to each item in the array if not present
    const dataWithTimestamp = newArray.map(item => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
    }));

    // Correct Firestore path
    const docRef = doc(db, "pilgrim_sessions", uid, "sessions", "liveSession");

    try {
        await updateDoc(docRef, { [arrayName]: dataWithTimestamp });
        return "updated";
    } catch (error) {
        if (error.code === "not-found" || error.message.includes("No document to update")) {
            await setDoc(docRef, { [arrayName]: dataWithTimestamp });
            return "created";
        } else {
            console.error("Error saving/updating live sessions data:", error);
            throw error;
        }
    }
};

export const fetchLiveSessionData = async (uid) => {
    if (!uid) throw new Error("User ID is required");

    const liveSessionRef = doc(db, `pilgrim_sessions/${uid}/sessions/liveSession`);
    const docSnap = await getDoc(liveSessionRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null; // no data yet
    }
};

export const deleteLiveSessionByIndex = async (uid, index) => {
    try {
        const guideRef = doc(db, `pilgrim_sessions/${uid}/sessions/liveSession`);
        const docSnap = await getDoc(guideRef);
    
        if (!docSnap.exists()) {
            throw new Error("Live session document not found");
        }
    
        const data = docSnap.data();
    
        // 🔹 Convert slides into an array, regardless of whether it's stored as object or array
        const slidesArray = Array.isArray(data.slides)
            ? data.slides
            : Object.values(data.slides || {});
    
        if (!slidesArray.length) {
            throw new Error("No slides found in live session document");
        }
    
        // 🔹 Remove the slide at given index
        const updatedSession = slidesArray.filter((_, i) => i !== index);
    
        // 🔹 Update Firestore as an array (cleaner going forward)
        await updateDoc(guideRef, { slides: updatedSession });

        return "deleted";
    } catch (error) {
        console.error("Error deleting live session by index:", error);
        throw error;
    }
};

/**
 * Save organizer data to the root organizers collection for live sessions
 * Checks if organizer with email exists:
 * - If exists: pushes new program to programs array
 * - If not exists: creates new organizer with programs array
 * @param {Object} organizerData - Object containing name, email, phone, address, and programData
 * @returns {Promise<string>} - Document ID of the organizer
 */
export const saveLiveSessionOrganizerData = async (organizerData) => {
    const { name, email, phone, address, programData } = organizerData;
    
    if (!email || !phone) {
        throw new Error("Email and phone number are required for organizer");
    }

    try {
        const organizersRef = collection(db, "organizers");
        
        // Check if organizer with this email already exists
        const q = query(organizersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Organizer exists - update by pushing to programs array using arrayUnion (atomic operation)
            const existingDoc = querySnapshot.docs[0];
            
            // Add unique identifier to program to prevent exact duplicates
            const programWithId = {
                ...programData,
                programId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                addedAt: new Date().toISOString()
            };
            
            await updateDoc(doc(db, "organizers", existingDoc.id), {
                programs: arrayUnion(programWithId), // Atomic operation - no race condition
                name: name, // Update name if changed
                phone: phone, // Update phone number if changed
                address: address, // Update address if changed
                updatedAt: new Date().toISOString()
            });
            
            return existingDoc.id;
        } else {
            // Organizer doesn't exist - create new with programs array
            const programWithId = {
                ...programData,
                programId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                addedAt: new Date().toISOString()
            };
            
            const docRef = await addDoc(organizersRef, {
                name,
                email,
                phone,
                address,
                programs: [programWithId],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving live session organizer data:", error);
        throw error;
    }
};

