import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export const saveOrUpdateRetreatData = async (uid, arrayName, newArray) => {
    if (!uid) throw new Error("User ID is required");

    // Handle arrays vs objects differently
    let dataToSave;
    if (Array.isArray(newArray)) {
        // For arrays, save as-is without adding createdAt to the array itself
        dataToSave = newArray;
    } else {
        // For objects, add createdAt timestamp if not present
        dataToSave = {
            ...newArray,
            createdAt: newArray.createdAt || new Date().toISOString()
        };
    }

    const docRef = doc(db, `pilgrim_retreat/${uid}/retreats/data`);

    try {
        // Try updating the document first
        await updateDoc(docRef, { [arrayName]: dataToSave });
        return "updated";
    } catch (error) {
        if (error.code === "not-found" || error.message.includes("No document to update")) {
            // If doc doesn't exist, create it
            await setDoc(docRef, { [arrayName]: dataToSave });
            return "created";
        } else {
            console.error("Error saving/updating retreat data:", error);
            throw error;
        }
    }
};

export const fetchRetreatData = async (uid) => {
    if (!uid) throw new Error("User ID is required");

    const retreatRef = doc(db, `pilgrim_retreat/${uid}/retreats/data`);
    const docSnap = await getDoc(retreatRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null; // no data yet
    }
};

export const deleteRetreatItem = async (uid, arrayName) => {
    if (!uid) throw new Error("User ID is required");
    if (arrayName === undefined || arrayName === null) throw new Error("Array name is required");

    try {
        const retreatRef = doc(db, `pilgrim_retreat/${uid}/retreats/data`);
        const docSnap = await getDoc(retreatRef);

        if (!docSnap.exists()) {
            throw new Error("No retreat data found for this user.");
        }

        const data = docSnap.data();

        // Convert numeric keys to sorted array
        const keys = Object.keys(data)
            .filter(k => !isNaN(Number(k))) // keep only numeric keys
            .map(Number)
            .sort((a, b) => a - b);

        // Remove the selected key
        delete data[arrayName];

        // Reindex: shift all higher keys down
        const updatedData = {};
        let newIndex = 1;
        keys.forEach(k => {
            if (k !== Number(arrayName)) {
                updatedData[newIndex] = data[k];
                newIndex++;
            }
        });

        // Save updated object
        await setDoc(retreatRef, updatedData);

        return "deleted and reindexed";
    } catch (error) {
        console.error("Error deleting retreat array:", error);
        throw error;
    }
};

/**
 * Save organizer data to the root organizers collection
 * Checks if organizer with email exists:
 * - If exists: pushes new program to programs array
 * - If not exists: creates new organizer with programs array
 * @param {Object} organizerData - Object containing email, number, and programData
 * @returns {Promise<string>} - Document ID of the organizer
 */
export const saveOrganizerData = async (organizerData) => {
    const { email, number, programData } = organizerData;
    
    if (!email || !number) {
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
                number: number, // Update phone number if changed
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
                email,
                number,
                programs: [programWithId],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving organizer data:", error);
        throw error;
    }
};

