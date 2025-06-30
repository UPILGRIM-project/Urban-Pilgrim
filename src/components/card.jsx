import React, { useState } from "react";
import "./card.css";
import { motion } from "framer-motion";

function Card({ image, content }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="parrent"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
     whileHover={{
    boxShadow: "0px 16px 32px rgba(0, 0, 0, 0.5)"
  }}
  transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="imgdiv">
        <motion.img
          className="image"
          initial={{ scale: 1 }}
          whileHover={{ scale: 2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          src={image}
          alt="error"
        />
      </div>

      <motion.div
        className="datacontainer"
        animate={
          isHovered
            ? {
                top: "50%",
                left: "50%",
                bottom: "auto",
                x: "-50%",
                y: "-50%",
              }
            : {
                bottom: 10,
                left: 10,
                top: "auto",
                x: 0,
                y: 0,
              }
        }
        transition={{ duration: 0.5, ease: "linear" }}
      >
        <div className="imgcontent">{content}</div>
        <div className="circlewitharrow">
          <div className="circle">&gt;</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Card;
