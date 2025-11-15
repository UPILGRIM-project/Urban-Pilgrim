// src/services/sectionOneService.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const fetchSectionFour = async (uid) => {
    const ref = doc(db, `homepage/${uid}/title_description/sectionFour`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { title: "", description: "", image: null };
};

export const saveSectionFour = async (uid, data) => {
    const docRef = doc(db, `homepage/${uid}/title_description/sectionFour`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        await updateDoc(docRef, { sectionFour: { features: data.features, image: data.image } });
    } else {
        await setDoc(docRef, { sectionFour: { features: data.features, image: data.image } });
    }
};
