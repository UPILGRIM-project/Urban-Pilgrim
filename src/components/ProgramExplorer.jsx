import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProgramCard from "./Animated_card";
import ArrowButton from "./ui/ArrowButton";

const programItems = [
    { card_title: "Curated experiences", image: "/assets/card-img1.png" },
    { card_title: "Online sessions", image: "/assets/onlinesession.png" },
    { card_title: "Wellness Programs", image: "/assets/Wellness_Programs.svg" },
    { card_title: "Wellness Guides", image: "/assets/Wellness_Guides.svg" },
];

export default function ProgramExplorer() {
    const [activeIndex, setActiveIndex] = useState(0);
    const sliderRef = useRef(null);
    const dotRefs = useRef([]);
    const totalSteps = programItems.length;

    const scrollToCard = (index) => {
        setActiveIndex(index);
        const cardWidth = 296;
        sliderRef.current.scrollTo({
            left: index * cardWidth,
            behavior: "smooth",
        });
    };

    const nextSlide = () => {
        const newIndex = (activeIndex + 1) % programItems.length;
        scrollToCard(newIndex);
    };

    const prevSlide = () => {
        const newIndex = (activeIndex - 1 + programItems.length) % programItems.length;
        scrollToCard(newIndex);
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
                        Explore our Programs
                    </h2>

                    <div className="flex gap-6 items-start">
                        {/* Vertical Line */}
                        <div className="flex flex-col mt-4 items-center bg-[#744C44]/30 h-[150px] w-[2px] rounded-lg">
                            {programItems.map((_, i) => (
                                <div
                                    key={i}
                                    ref={(el) => (dotRefs.current[i] = el)}
                                    className={`w-[2px] h-10 rounded-full transition-all duration-300  
                                        ${i === activeIndex ? "bg-[#4d3c2c] " : "" } 
                                        ${i === activeIndex && i === programItems.length - 1 ? " " : ""} `}
                                />
                            ))}
                        </div>

                        {/* Titles */}
                        <ul className="flex flex-col gap-4 text-base py-4">
                            {programItems.map((item, i) => (
                                <li
                                    key={i}
                                    onClick={() => scrollToCard(i)}
                                    className={`cursor-pointer transition-all duration-300 ${i === activeIndex
                                            ? "text-black font-semibold"
                                            : "text-gray-500"
                                        }`}
                                >
                                    {item.card_title}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Right Slider */}
            <div className="flex flex-col gap-3 bg-[#f9f3ef] items-center justify-center px-6 py-8 overflow-hidden w-full h-full">
                <div
                    ref={sliderRef}
                    className="flex gap-6 bg-none rounded-xl p-2 overflow-x-auto no-scrollbar scroll-smooth items-center"
                    style={{ scrollBehavior: "smooth" }}
                >
                    {programItems.map((item, i) => (
                        <ProgramCard
                            key={i}
                            image={item.image}
                            card_title={item.card_title}
                        />
                    ))}
                </div>

                {/* Arrows + Progress */}
                <div className="flex gap-3 items-center justify-end w-full ">
                    <ArrowButton onClick={prevSlide} icon={FaChevronLeft} dir={1} />
                    <div className="relative h-1 md:w-80 w-full bg-[#744C44]/30 rounded overflow-hidden">
                        <div
                            className="absolute top-0 h-1 bg-[#744C44] transition-all duration-300"
                            style={{
                                width: `${100 / totalSteps}%`,
                                left: `${(activeIndex / totalSteps) * 100}%`,
                            }}
                        />
                    </div>
                    <ArrowButton onClick={nextSlide} icon={FaChevronRight} dir={-1} />
                </div>

            </div>
        </motion.div>
    );
}
