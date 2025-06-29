import React from "react";
import homepage_img from "../assets/home_page_img.png";
import homepage_overlay_img from "../assets/overlay_img.png";
import "./Home.css";
import { motion, useAnimation } from "framer-motion";

function Home() {
  return (
    <div class="hero-section">
      <img src={homepage_img} alt="Banner" />

      <motion.div class="overlap-box">
        <motion.div
          className="textbox1"
          initial={{ x: -100 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          animate={{ x: 0 }}
          transition={{ duration: 2 }}
        >
          <motion.h3>A journey for the modern seeker</motion.h3>
        </motion.div>

        <motion.img
          src={homepage_overlay_img}
          alt="failled to load"
          initial={{ y: 100 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          animate={{ y: 0 }}
          transition={{ duration: 2 }}
        />
        <motion.p
          initial={{ y: 100 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 2.5 }}
          animate={{ y: 0 }}
        >
          We live in a world that celebrates hustle—but forgets healing. Every
          scroll, every deadline, every city noise pulls us outward. Yet
          somewhere inside, a quieter voice longs to be heard.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Home;
