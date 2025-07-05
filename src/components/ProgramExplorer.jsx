import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProgramCard from "./Animated_card";
import mandalaImg from "../assets/golden-mandala.png";

import cardimg1 from "../assets/card-img1.png";
import cardimg2 from "../assets/onlinesession.png";
import cardimg3 from "../assets/Wellness_Programs.svg";
import cardimg4 from "../assets/Wellness_Guides.svg";

const programItems = [
  { card_title: "Curated experiences", image: cardimg1 },
  { card_title: "Online sessions", image: cardimg2 },
  { card_title: "Wellness Programs", image: cardimg3 },
  { card_title: "Wellness Guides", image: cardimg4 },
  
];

export default function ProgramExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef(null);

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
    <div className="flex flex-col md:flex-row w-full min-h-screen bg-[#f4ede9]">
      {/* Left Panel */}
      <div className="relative p-8 flex flex-col justify-center items-center bg-white overflow-hidden w-full md:w-[45%] min-h-[300px] md:min-h-full">
        <motion.img
          src={mandalaImg}
          alt="Mandala"
          className="absolute inset-0 m-auto w-[85%] opacity-10"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        />

        <div className="z-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-black">
            Explore our Programs
          </h2>
          <ul className="mt-4 space-y-3 text-base">
            {programItems.map((item, i) => (
              <li
                key={i}
                onClick={() => scrollToCard(i)}
                className={`pl-3 cursor-pointer relative transition-all duration-300 ${
                  i === activeIndex ? "text-black font-semibold" : "text-gray-500"
                }`}
              >
                {i === activeIndex && (
                  <span className=" absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-[#4d3c2c] rounded" />
                )}
                {item.card_title}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Slider */}
      <div className="flex flex-col items-center justify-center px-6 py-8 overflow-hidden w-full md:w-[55%] min-h-[300px] md:min-h-full">
        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth items-center"
          style={{ scrollBehavior: "smooth" }}
        >
          {programItems.map((item, i) => (
            <ProgramCard key={i} image={item.image} card_title={item.card_title} />
          ))}
        </div>

        {/* Arrows */}
        <div className="flex gap-6 mt-6">
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
