import React, { useState, useEffect } from 'react';
import "./Animated_card.css";
import { FaChevronRight } from 'react-icons/fa';
import { motion } from "framer-motion";
import NormalArrowButton from './ui/NormalArrowButton';

function Animated_card({ image, card_title }) {
    const [isHovered, setIsHovered] = useState(false);

    // Automatically enable hover for mobile screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 480) {
                setIsHovered(true);
            } else {
                setIsHovered(false);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize); // Listen for screen resize

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <motion.div
            className="animated-card !max-w-[250px] !w-[80%] !h-[350px]"
            onMouseEnter={() => window.innerWidth >= 480 && setIsHovered(true)}
            onMouseLeave={() => window.innerWidth >= 480 && setIsHovered(false)}
        >
            <motion.div className="card_imgcontainer ">
                <motion.img
                    src={image}
                    alt="card visual"
                    animate={{ scale: isHovered ? 1.7 : 1 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className='!h-[350px] !w-full !object-cover'
                />
                <motion.div
                    className="img_overlay "
                    animate={{ opacity: isHovered ? 0.5 : 0, scale: isHovered ? 1.7 : 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />
            </motion.div>

            <motion.div
                className="card_datacontainer"
                animate={{
                    top: isHovered ? "50%" : "85%",
                    opacity: 1
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
            >
                <div className="card_content_inner">
                    <div className="card_title">{card_title}</div>
                    <div className="card_arrow">
                        <NormalArrowButton icon={FaChevronRight} dir={-1} />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default Animated_card;
