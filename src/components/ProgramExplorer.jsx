import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { motion } from "framer-motion";
import wellnessIcon from "../assets/Wellness_Guides.svg";
import Golden_mangadala from "../assets/golden-mandala.png";

const programItems = [
  {
    title: "Curated experiences",
    image: wellnessIcon
  },
  {
    title: "Online sessions",
    image: wellnessIcon
  },
  {
    title: "Wellness Programs",
    image: wellnessIcon
  },
  {
    title: "Wellness Guides",
    image: wellnessIcon
  },
  {
    title: "Pilgrim Bazaar",
    image: wellnessIcon
  }
];



export default function ProgramExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % programItems.length);
  };
  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + programItems.length) % programItems.length);
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f4ede9]">
      {/* Left Panel */}
      <div className="w-[45%] relative p-12 flex flex-col justify-center items-center bg-white">
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={Golden_mangadala} alt="mandala" className="w-[80%]" />
        </div>
        <div className="z-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-black">
            Explore our Programs
          </h2>
          <ul className="mt-4 space-y-3 text-sm md:text-base">
            {programItems.map((item, i) => (
              <li
                key={i}
                className={`pl-3 relative transition-all duration-300 ${
                  i === activeIndex ? "text-black font-semibold" : "text-gray-500"
                }`}
              >
                {i === activeIndex && (
                  <motion.span
                    layoutId="active-bullet"
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-[#4d3c2c] rounded"
                  />
                )}
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Slider */}
      <div className="w-[55%] relative flex items-center px-8 overflow-hidden">
        <div
          className="flex gap-6 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 296}px)` }}

        >
          {programItems.map((item, i) => (
            <motion.div
              key={i}
              className={`relative w-[280px] h-[400px] rounded-xl overflow-hidden shadow-lg group cursor-pointer transition-all duration-300 `}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-165"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition duration-500" />
              <motion.div
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-lg font-semibold group-hover:bottom-1/2 group-hover:translate-y-1/2 transition-all duration-500 flex items-center gap-2"
              >
                {item.title}
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center ml-2">
                  <FaChevronRight size={14} />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Arrows */}
        <div className="absolute bottom-8 right-1/2 translate-x-1/2 flex gap-6">
          <button
            onClick={prevSlide}
            className="w-10 h-10 rounded-full border border-gray-400 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={nextSlide}
            className="w-10 h-10 rounded-full border border-gray-400 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}