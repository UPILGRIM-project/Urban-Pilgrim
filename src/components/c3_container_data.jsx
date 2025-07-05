import React from "react";
import { motion } from "framer-motion";

function C3ContainerData({ img, heading, content }) {
  return (
    <div>
      <motion.div
        className="relative inline-flex items-center gap-5 p-5 max-h-[20%] w-auto"
      >
        <img
          src={img}
          alt=""
          className="max-h-[50px] max-w-[40px] object-contain"
        />

        <div className="flex flex-col flex-nowrap text-white">
          <div className="text-base font-bold">
            <strong>{heading}</strong>
          </div>
          <div className="text-[15px] leading-none">{content}</div>
        </div>
      </motion.div>
    </div>
  );
}

export default C3ContainerData;
