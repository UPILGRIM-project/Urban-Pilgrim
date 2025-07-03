import React from 'react'
import "./c3_container_data.css";
import { easeIn ,motion } from "framer-motion";
function c3_container_data({img,heading,content}) {
  return (
    <div>
      <motion.div className="c3parent"
      >
        <img src={img} alt="" />
        <div className="c3text">
            <div className="c3heading"><strong>{heading}</strong></div>
            <div className="c3content">{content}</div>
        </div>
      </motion.div>
    </div>
  )
}

export default c3_container_data
