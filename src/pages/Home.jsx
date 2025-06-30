import React from "react";
import homepage_img from "../assets/home_page_img.png";
import homepage_overlay_img from "../assets/overlay_img.png";
import golden_mandala from "../assets/golden-mandala.png";
import "./Home.css";
import Card from "../components/card.jsx";
import cardimg1 from "../assets/card-img1.png";
import cardimg2 from "../assets/onlinesession.png";

import { easeIn, motion } from "framer-motion";

function Home() {
  return (
    <div className="hero-section">
      <img src={homepage_img} alt="Banner" />

      <motion.div className="overlap-box">
        <div className="overlap-container">
          <motion.div
            className="textbox1"
            animate={{
              x: [-200, 0],
              transition: { duration: 0.8 },
            }}
          >
            A journey for the modern seeker
          </motion.div>

          <motion.img
            src={homepage_overlay_img}
            alt="failed to load"
            animate={{
              y: [200, 0],
              transition: { duration: 0.8 },
            }}
          />

          <motion.p
            className="overlaypara"
            animate={{
              y: [200, 0],
              transition: { duration: 0.8 },
            }}
          >
            We live in a world that celebrates hustle—but forgets healing. Every
            scroll, every deadline, every city noise pulls us outward. Yet
            somewhere inside, a quieter voice longs to be heard.
          </motion.p>
        </div>
        <div className="rightbox">
          <motion.div
            className="divheading"
            initial={{ x: 1000 }}
            animate={{ x: -700 }}
            transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          >
            Explore, Heal, Transform
          </motion.div>

          <div className="about-container">
            <div className="about-heading">
              It asks: <strong>What about me ?</strong>
            </div>
            <div className="aboutme-text">
              <strong> Urban Pilgrim</strong> is a sanctuary built for that
              voice. A platform where you don’t just find wellness—you find
              yourself.<br></br>Rooted in India’s timeless wisdom and designed
              for today’s overstimulated lives, we offer you a{" "}
              <strong>guided path to holistic well-being.</strong>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="content2">
        <motion.div className="position">
          <div className="golden_mandala">
            <motion.img
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              src={golden_mandala}
              alt="noimg"
            />
          </div>
        </motion.div>
        <div className="position-content">
          <div className="cardwrapper">
            <Card image={cardimg1} content={"Curated experiences"}/>
            <Card image={cardimg2} content={"Online sessions"}/>
          </div>
        </div>
      </div>

      <div className="demo">
        <h2>hehehe</h2>
      </div>
    </div>
  );
}

export default Home;
