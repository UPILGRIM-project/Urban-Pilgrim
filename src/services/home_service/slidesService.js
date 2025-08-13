import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import store from "../../redux/store"; // Your redux store
import { setSlides } from "../../features/home_slices/slidesSlice"; // Your redux action

export const add_Or_Update_Slide = async (uid, updatedSlides) => {
    const slidesRef = doc(db, `homepage/${uid}/image_slider/slides`);

    await setDoc(slidesRef, { slides: updatedSlides });
    store.dispatch(setSlides(updatedSlides));
};

export const deleteSlideFromFirestore = async (uid, index) => {
    const slidesRef = doc(db, `homepage/${uid}/image_slider/slides`);
    const snapshot = await getDoc(slidesRef);

    if (snapshot.exists()) {
        const updatedSlides = [...(snapshot.data().slides || [])];
        updatedSlides.splice(index, 1);

        // Update in Firestore
        await setDoc(slidesRef, { slides: updatedSlides });

        // Update Redux state
        store.dispatch(setSlides(updatedSlides));
    }
};
