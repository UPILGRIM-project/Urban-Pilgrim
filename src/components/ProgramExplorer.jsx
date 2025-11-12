
import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProgramCard from "./Animated_card";
import ArrowButton from "./ui/ArrowButton";

export default function ProgramExplorer() {
    const [activeIndex, setActiveIndex] = useState(0);
    const sliderRef = useRef(null);
    const dotRefs = useRef([]);
    const [programItems, setProgramItems] = useState([]);
    const [scrollProgress, setScrollProgress] = useState(0);
    const totalSteps = programItems?.programs?.length || 0;

    const uid = "your-unique-id";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/title_description/sectionThree`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setProgramItems(data.sectionThree || []);
                } else {
                    console.log("No slides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching images from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    const scrollToCard = (index) => {
        setActiveIndex(index);
        const cardWidth = 296;
        sliderRef.current.scrollTo({
            left: index * cardWidth,
            behavior: "smooth",
        });
    };

    const nextSlide = () => {
        const newIndex = (activeIndex + 1) % totalSteps;
        scrollToCard(newIndex);
    };

    const prevSlide = () => {
        const newIndex = (activeIndex - 1 + totalSteps) % totalSteps;
        scrollToCard(newIndex);
    };

    // Handle scroll progress tracking
    const handleScroll = () => {
        if (sliderRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
            setScrollProgress(progress);
            
            // Update active index based on scroll position
            const cardWidth = 296;
            const newIndex = Math.round(scrollLeft / cardWidth);
            if (newIndex !== activeIndex && newIndex >= 0 && newIndex < totalSteps) {
                setActiveIndex(newIndex);
            }
        }
    };

    // Handle progress bar click to scroll to position
    const handleProgressBarClick = (e) => {
        if (sliderRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressBarWidth = rect.width;
            const clickProgress = (clickX / progressBarWidth) * 100;
            
            const { scrollWidth, clientWidth } = sliderRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const targetScrollLeft = (clickProgress / 100) * maxScroll;
            
            sliderRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    return (
        <motion.div
            className="md:grid md:grid-cols-2 flex flex-col w-full bg-[#f4ede9]"
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
        >
            {/* Left Panel */}
            <div className="relative p-8 flex flex-col justify-center items-center bg-white overflow-hidden w-full h-full ">
                <motion.img
                    src="/assets/golden-mandala.svg"
                    alt="Mandala"
                    className="absolute top-1/2 left-1/2 w-[400px] max-w-[85%] -translate-x-1/2 -translate-y-1/2"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />

                <div className="z-10 space-y-6 w-full max-w-md">
                    <h2 className="text-2xl md:text-3xl font-bold text-center text-black">
                        {programItems?.title}
                    </h2>

                    <div className="flex gap-6 items-start">
                        {/* Vertical Line */}
                        <div className="flex flex-col mt-4 items-center bg-[#744C44]/30 h-[150px] w-[2px] rounded-lg">
                            {programItems?.programs && programItems?.programs.map((_, i) => (
                                <div
                                    key={i}
                                    ref={(el) => (dotRefs.current[i] = el)}
                                    className={`w-[2px] h-10 rounded-full transition-all duration-300  
                                        ${i === activeIndex ? "bg-[#4d3c2c] " : ""} 
                                        ${i === activeIndex && i === programItems.length - 1 ? " " : ""} `}
                                />
                            ))}
                        </div>

                        {/* Titles */}
                        <ul className="flex flex-col gap-4 text-base py-4">
                            {programItems?.programs && programItems.programs.map((item, i) => (
                                <li
                                    key={i}
                                    onClick={() => scrollToCard(i)}
                                    className={`cursor-pointer transition-all duration-300 ${i === activeIndex
                                        ? "text-black font-semibold"
                                        : "text-gray-500"
                                        }`}
                                >
                                    {item?.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Right Slider */}
            <div className="relative gap-3 bg-[#f9f3ef] items-center justify-center px-6 py-8 overflow-hidden xl:w-[90%] w-full h-full">
                <div
                    ref={sliderRef}
                    className="flex gap-6 bg-none rounded-xl p-2 overflow-x-auto no-scrollbar scroll-smooth items-center"
                    style={{ scrollBehavior: "smooth" }}
                    onScroll={handleScroll}
                >
                    {programItems?.programs && programItems?.programs.map((item, i) => (
                        <ProgramCard
                            key={i}
                            image={item?.image}
                            card_title={item?.title}
                        />
                    ))}
                </div>

                {/* Horizontal Progress Bar - Bottom Center */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 sm:hidden mb-3 z-10">
                    <div 
                        className="w-24 h-1.5 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                        onClick={handleProgressBarClick}
                    >
                        <div 
                            className="h-full bg-[#744C44] rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${scrollProgress}%` }}
                        />
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
