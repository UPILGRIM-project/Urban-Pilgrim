import React, { useState } from 'react';
import "./Animated_card.css";
import Arrow from "./arrow.jsx";
import { motion } from "framer-motion";

function Animated_card({ image, card_title }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      className="animated-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="card_imgcontainer"
      >
        <motion.img 
          src={image} 
          alt="card visual" 
          animate={{ scale: isHovered ? 1.7 : 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
        <motion.div 
          className="img_overlay"
          animate={{ opacity: isHovered ? 0.5 : 0 }}
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
            <Arrow forceHovered={isHovered} />
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Animated_card;
