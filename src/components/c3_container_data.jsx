import React from 'react'
import "./c3_container_data.css";
import { easeIn, motion } from "framer-motion";
function c3_container_data({img,heading,content}) {
  return (
    <div>
      <motion.div id="parent"
      >
        <img src={img} alt="" />
        <div id="text">
            <div id="heading"><strong>{heading}</strong></div>
            <div id="content">{content}</div>
        </div>
      </motion.div>
    </div>
  )
}

export default c3_container_data
