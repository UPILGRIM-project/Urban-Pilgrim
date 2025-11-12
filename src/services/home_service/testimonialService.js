import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const fetchTestimonials = async (uid) => {
    const ref = doc(db, `homepage/${uid}/testimonials/testimonial`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { testimonial: [] };
};

export const saveTestimonials = async (uid, data) => {
    const docRef = doc(db, `homepage/${uid}/testimonials/testimonial`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        await updateDoc(docRef, { testimonial: data });
    } else {
        await setDoc(docRef, { testimonial: data });
    }
};

export const deleteTestimonial = async (uid, index) => {
    const docRef = doc(db, `homepage/${uid}/testimonials/testimonial`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data();
        const updatedTestimonials = data?.testimonial.filter((_, i) => i !== index);
        await updateDoc(docRef, { testimonial: updatedTestimonials });
    }
};
