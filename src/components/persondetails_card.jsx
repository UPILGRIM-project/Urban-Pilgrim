import React from "react";
import yogaday_img from "../assets/card-img1.png";
import "./persondetails_card.css";
import Arrow from "./arrow.jsx";
import { easeIn, motion } from "framer-motion";
function persondetails_card({ image, title, price }) {
  return (
    <motion.div className="parrent"
   // remove if you want it every time on scroll
   
    >
      <motion.div
        className="imgdiv"
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        transition={{ duration: 0.5, ease: "easeOut" }}

        
      >
        <img src={image} alt="error" />
      </motion.div>
      <div className="data_container">
        <div className="data_details">
          <div className="ptitle">
            <strong>{title}</strong>
          </div>
          <div className="pricediv">
            <p>
              <span style={{color:"#C0B3B4"}}>From</span> <strong>{price}</strong>
            </p>
            <Arrow className="arrow" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default persondetails_card;
