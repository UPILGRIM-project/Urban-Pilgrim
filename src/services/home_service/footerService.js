import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const fetchFooter = async (uid) => {
    const ref = doc(db, `homepage/${uid}/footer/links`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { heading: "", description: "", links: [] };
};

export const saveFooterLinks = async (uid, data) => {
    const docRef = doc(db, `homepage/${uid}/footer/links`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        await updateDoc(docRef, { footer: { heading: data?.heading, description: data?.description, links: data?.links } });
    } else {
        await setDoc(docRef, { footer: { heading: data?.heading, description: data?.description, links: data?.links } });
    }
};

export const deleteFooterLink = async (uid, index) => {
    const docRef = doc(db, `homepage/${uid}/footer/links`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data();
        const updatedLinks = data?.footer?.links.filter((_, i) => i !== index);
        await updateDoc(docRef, { footer: { heading: data?.footer?.heading, description: data?.footer?.description, links: updatedLinks } });
    }
};
