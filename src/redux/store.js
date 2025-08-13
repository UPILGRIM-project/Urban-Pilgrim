import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
// import sessionReducer from "../features/sessionSlice";
// import bookingReducer from "../features/bookingSlice";
import slidesReducer from "../features/home_slices/slidesSlice";
import sectionOneReducer from "../features/home_slices/sectionOneSlice";

const store = configureStore({
    reducer: {
        auth: authReducer,
        // sessions: sessionReducer,
        sectionOne: sectionOneReducer,
        // booking: bookingReducer,
        slides: slidesReducer
    },
});

export default store;