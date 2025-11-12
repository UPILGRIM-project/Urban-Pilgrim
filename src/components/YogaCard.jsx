import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ArrowButton from "./ui/ArrowButton";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useDispatch } from "react-redux";
import { setHighlight } from "../features/home_slices/highlightSlice";
import { useNavigate } from "react-router-dom";

export default function YogaCard() {
    const [current, setCurrent] = useState(0);
    const [highlightCard, setHighlightCard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const uid = "your-unique-id";
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const total = highlightCard.length;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/highlights/highlight`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const highlightData = snapshot.data();
                    setHighlightCard(highlightData?.highlight || []);
                    dispatch(setHighlight(highlightData?.highlight || []));
                } else {
                    console.log("No highlights found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching highlights from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dispatch]);

    const prevSlide = () => {
        setCurrent((prev) => (prev - 1 + total) % total);
    };

    const nextSlide = () => {
        setCurrent((prev) => (prev + 1) % total);
    };

    const currentHighlight = highlightCard[current];

    const slugify = (text) =>
        text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    if (isLoading) {
        return (
            <div className="max-w-[1200px] mx-auto p-4 flex justify-center items-center h-[480px]">
                <p className="text-gray-500">Loading highlights...</p>
            </div>
        );
    }

    if (highlightCard.length === 0) {
        return (
            <div className="max-w-[1200px] mx-auto p-4 flex justify-center items-center h-[480px]">
                <p className="text-gray-500">No highlights available</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[1200px] mx-auto p-4"
        >
            <div className="bg-white rounded-lg overflow-visible flex flex-col md:flex-row shadow-xl filter drop-shadow-[-46px_46px_27.5px_rgba(0,0,0,0.25)] md:max-w-full max-w-[300px] md:max-h-[570px]">
                {/* Image or Video */}
                <div className="md:w-1/2 w-full">
                    {(currentHighlight?.image?.includes('.mp4') || 
                        currentHighlight?.image?.includes('.mov') || 
                        currentHighlight?.image?.includes('.webm') || 
                        currentHighlight?.image?.includes('.avi') || 
                        currentHighlight?.image?.includes('.mkv')) ? (
                        <video
                            src={currentHighlight?.image}
                            className="w-full md:h-full h-[51%] object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                        <img
                            src={currentHighlight?.image || "/assets/yoga.svg"}
                            alt="Yoga"
                            className="w-full md:h-full h-[51%] object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                        />
                    )}
                </div>

                {/* Content */}
                <div className="md:w-1/2 w-full p-6 flex md:flex-row flex-col justify-between items-center">
                    <div className="px-4">
                        <h2 className="text-sm sm:text-xl md:text-2xl line-clamp-2 font-semibold mb-4">{currentHighlight?.title}</h2>
                        <p className="text-xs text-gray-600 mb-6 line-clamp-2">{currentHighlight?.description}</p>
                        <p
                            onClick={() =>
                                navigate(`/yoga/${slugify(currentHighlight?.title)}`, {
                                    state: {
                                        image: currentHighlight?.image,
                                        title: currentHighlight?.title,
                                        description: currentHighlight?.description
                                    }
                                })
                            }
                            className="text-[#79534E] md:text-sm text-xs cursor-pointer font-semibold flex items-center gap-2"
                        >
                            {currentHighlight?.linkText || "Learn more"}
                            <span className="border-b border-[#79534E] w-6"></span>
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex md:flex-col items-center justify-center gap-6 text-[#79534E]">
                        <ArrowButton onClick={prevSlide} icon={FaChevronLeft} dir={1} />
                        <span className="text-sm font-medium transform md:rotate-90 rotate-0">{`${current + 1} / ${total}`}</span>
                        <ArrowButton onClick={nextSlide} icon={FaChevronRight} dir={-1} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
