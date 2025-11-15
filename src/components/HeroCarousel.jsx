import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import NormalArrowButton from "./ui/NormalArrowButton";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSelector } from "react-redux";

export default function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [images, setImages] = useState([]);

    const nextSlide = () => setCurrent((prev) => (prev + 1) % images.length);
    const prevSlide = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

    const user = useSelector((state) => state.auth.user);
    const uid = "your-unique-id";

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/image_slider/slides`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    for (const slide of data.slides) {
                        const image = slide.image;
                        if (image) {
                            setImages((prev) => [...prev, image]);
                        }
                    }
                } else {
                    console.log("No slides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching images from Firestore:", error);
            }
        };

        fetchImages();
    }, [uid]);

    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    return (
        <div className="md:w-[95vw] md:mx-auto w-screen mx-auto md:rounded-3xl lg:h-[75vh] sm:h-[50vh] h-[40vh] 
        relative overflow-hidden bg-black flex items-center justify-center lg:mt-[90px] mt-16">
            <AnimatePresence mode="wait">
                <motion.img
                    key={current}
                    src={images[current]}
                    alt={`Slide ${current + 1}`}
                    className="absolute w-full h-full object-cover object-center"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.8, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                />
            </AnimatePresence>

            {/* Overlay with Text */}
            <div className="absolute inset-0 bg-black/30">
                <div className="flex items-center justify-start h-full">
                    <div className="text-white text-3xl xl:text-6xl md:text-5xl max-w-6xl font-semibold md:px-10 px-4">
                        <motion.div
                            className="banner-heading"
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: [1, 1, 1], scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, ease: "easeOut", times: [0, 0.5, 1] }}
                        >
                            Urban Wellness Rooted in Indian Wisdom
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Arrows + Slide Count */}
            <div className="absolute left-4 md:left-auto md:right-10 md:bottom-12 bottom-2 md:top-1/2 md:-translate-y-1/2 flex md:flex-col items-center gap-6 text-white z-10">
                <NormalArrowButton onClick={prevSlide} icon={FaChevronLeft} dir={1} />
                <span className="text-sm font-medium">{`${current + 1} / ${images.length}`}</span>
                <NormalArrowButton onClick={nextSlide} icon={FaChevronRight} dir={-1} />
            </div>

            {/* Sync Animation (bottom-left circle) */}
            <motion.div
                className="absolute hidden md:block bottom-4 left-16 w-8 h-8 border-2 border-white rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <motion.div
                    className="absolute -top-1/2 left-1/2 transform -translate-x-1/2 bg-white w-[1px] h-4"
                    initial={{ height: 0, opacity: 1 }}
                    animate={{ height: "100%", opacity: [1, 1, 0] }}
                    transition={{
                        duration: 1,
                        times: [0, 0.8, 1],
                        repeat: Infinity,
                        repeatDelay: 2,
                    }}
                />

                <motion.span
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 0], opacity: [0.8, 0.5, 0] }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1.2,
                        ease: "easeInOut"
                    }}
                />
            </motion.div>
        </div>
    );
}
