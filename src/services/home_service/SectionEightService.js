// src/services/sectionOneService.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const fetchSectionEight = async (uid) => {
    const ref = doc(db, `homepage/${uid}/title_description/sectionEight`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { title: "", description: "", image: null };
};

export const saveSectionEight = async (uid, data) => {
    const docRef = doc(db, `homepage/${uid}/title_description/sectionEight`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        await updateDoc(docRef, { sectionEight: data });
    } else {
        await setDoc(docRef, { sectionEight: data });
    }
};
