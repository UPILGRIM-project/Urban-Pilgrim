import { useState } from "react";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ArrowButton from "./ui/ArrowButton";

const data = [
    {
        title: "How Yoga’s Ancient Science Rewires Your Brain for Peace",
        description:
            "Clinical studies now prove what yogis knew—specific pranayama techniques can lower cortisol by 37% in 21 days.",
        linkText: "Learn more",
    },
    {
        title: "The Power of Breath in Daily Stress Reduction",
        description:
            "Explore how daily breathwork transforms your nervous system and cultivates calm.",
        linkText: "Discover more",
    },
    {
        title: "Rebuild Focus with Yogic Discipline",
        description:
            "Unlock ancient yogic routines to train your brain to resist distractions naturally.",
        linkText: "Explore",
    },
    {
        title: "Align Body and Mind with Morning Yoga",
        description:
            "Simple morning sequences can improve your mood and focus throughout the day.",
        linkText: "Start Now",
    },
    {
        title: "Boost Sleep Quality Through Evening Practices",
        description:
            "Wind down your system with nightly flows proven to help your body recover deeper.",
        linkText: "Read more",
    },
];

export default function YogaCard() {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const total = data.length;

    const prevSlide = () => {
        setCurrent((prev) => (prev - 1 + total) % total);
    };

    const nextSlide = () => {
        setCurrent((prev) => (prev + 1) % total);
    };

    const card = data[current];

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[1200px] mx-auto p-4"
        >
            <div className="bg-white rounded-lg overflow-visible flex flex-col md:flex-row shadow-xl filter drop-shadow-[-46px_46px_27.5px_rgba(0,0,0,0.25)] md:max-w-full max-w-[300px] md:max-h-[480px]">
                {/* Image */}
                <div className="md:w-1/2 w-full">
                    <img
                        src="/assets/yoga.svg"
                        alt="Yoga"
                        className="w-full md:h-full h-50 object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                    />
                </div>

                {/* Content */}
                <div className="md:w-1/2 w-full p-6 flex md:flex-row flex-col justify-between items-center">
                    <div className="px-4">
                        <h2 className="text-sm sm:text-xl md:text-2xl font-semibold mb-4">{card.title}</h2>
                        <p className="text-xs text-gray-600 mb-6">{card.description}</p>
                        <a
                            href="#"
                            className="text-[#79534E] md:text-sm text-xs  font-semibold flex items-center gap-2"
                        >
                            {card.linkText}
                            <span className="border-b border-[#79534E] w-6"></span>
                        </a>
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
