import React, { useRef, useState, useEffect } from "react";
import homepage_img from "../assets/home_page_img.png";
import homepage_overlay_img from "../assets/overlay_img.png";
import golden_mandala from "../assets/golden-mandala.png";
import "./Home.css";

import cardimg1 from "../assets/card-img1.png";
import cardimg2 from "../assets/onlinesession.png";
import cardimg3 from "../assets/Wellness_Programs.svg";
import cardimg4 from "../assets/Wellness_Guides.svg";
import yogaday from "../assets/yogaday-img.png";
import Footer from "../components/footer";
import C3_container_data from "../components/c3_container_data.jsx";
import Animated_card from "../components/Animated_card.jsx";

import Appleimg from "../assets/appleimg.png";
import yogapeople from "../assets/yogapeople.png";
import Meditation from "../assets/meditationimg.jpg";
import arati_prasad from "../assets/arati_prasad.png";
import rohini_singh from "../assets/Rohini_singh.png";
import Manish_kumar from "../assets/manish_kumar.png";
import lotus_icon from "../assets/lotos_icon.svg";
import verification_icon from "../assets/verification_icon.svg";
import security_icon from "../assets/security_icon.svg";
import writting_icon from "../assets/writting_icon.svg";
import people_runnimg from "../assets/people_running.svg";
import Anisha from "../assets/Anisha.png";
import PersondetailsCard from "../components/persondetails_card";
import C8_container_data from "../components/c8_container_data.jsx";
import house from "../assets/house_img.png";
import { easeIn, motion, useAnimation } from "framer-motion";
function Home() {
  const wrapperRef = useRef(null);
  const [lineHeight, setLineHeight] = useState(0);

  const cardContainerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const controls = useAnimation();
  const scrollAmount = 300;

  const handleCardScroll = (dir) => {
    if (cardContainerRef.current) {
      const container = cardContainerRef.current;
      const newScroll =
        dir === "left"
          ? container.scrollLeft - scrollAmount
          : container.scrollLeft + scrollAmount;
      container.scrollTo({ left: newScroll, behavior: "smooth" });

      const maxScroll = container.scrollWidth - container.clientWidth;
      const newProgress = (newScroll / maxScroll) * 100;
      setProgress(newProgress);
    }
  };

  useEffect(() => {
    const container = cardContainerRef.current;
    if (!container) return;

    const updateProgress = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const newProgress = (container.scrollLeft / maxScroll) * 100;
      setProgress(newProgress);
    };

    container.addEventListener("scroll", updateProgress);
    return () => container.removeEventListener("scroll", updateProgress);
  }, []);

  const handleScroll = () => {
    const el = wrapperRef.current;
    const scrollRatio = el.scrollLeft / (el.scrollWidth - el.clientWidth);
    setLineHeight(scrollRatio * 300);
  };

  return (
    <div className="hero-section">
      <img className="topbannerimg" src={homepage_img} alt="Banner" />

      <motion.div className="overlap-box">
        <div className="overlap-container">
          <motion.div
            className="textbox1"
            initial={{ x: -200, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }} // remove if you want it every time on scroll
          >
            A journey for the modern seeker
          </motion.div>

          <motion.img
            src={homepage_overlay_img}
            alt="failed to load"
            initial={{ y: 200, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }} // remove if you want it every time on scroly
          />

          <motion.p
            className="overlaypara"
            animate={{
              y: [200, 0],
              transition: { duration: 0.5 },
            }}
          >
            We live in a world that celebrates hustle—but forgets healing. Every
            scroll, every deadline, every city noise pulls us outward. Yet
            somewhere inside, a quieter voice longs to be heard.
          </motion.p>
        </div>
        <div className="rightbox">
          <motion.div
            className="flow"
            initial={{ x: 700, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <motion.div
              className="divheading"
              initial={{ x: 0 }}
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
          </motion.div>
        </div>
      </motion.div>
      <div className="content2">
        <motion.div className="c2left">
          <div className="golden_mandala">
            <motion.img
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              src={golden_mandala}
              alt="noimg"
            />
          </div>
         
        </motion.div>
        <div className="c2right">
          <motion.div
            className="c2Cards"
            ref={cardContainerRef}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* cards */}
            <Animated_card image={cardimg1} card_title="Curated experiences" />
            <Animated_card image={cardimg2} card_title="Online sessions" />
            <Animated_card image={cardimg3} card_title="Wellness Programs" />
            <Animated_card image={cardimg4} card_title="Wellness Guides" />
          </motion.div>

          <div className="c2Navigation">
            <motion.button
              className="nav-btn"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => handleCardScroll("left")}
            >
              ‹
            </motion.button>

            <div className="progress-bar">
              <motion.div
                className="progress"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>

            <motion.button
              className="nav-btn"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => handleCardScroll("right")}
            >
              ›
            </motion.button>
          </div>
        </div>
      </div>

      <div className="content3">
        <motion.div
          className="c3img"
          initial={{ x: -500, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <img src={people_runnimg} alt="" />
        </motion.div>
        <div className="c3text_container">
          <motion.div
            className="datacontainer"
            initial={{ x: 500, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div>
              <C3_container_data
                img={lotus_icon}
                heading={"Rooted in Indian Wisdom"}
                content={"Authentic, not commercialized wellness."}
              />
            </div>
            <div>
              <C3_container_data
                img={verification_icon}
                heading={"Expert-verified Programs"}
                content={
                  "Only qualified, experienced professionals make it to our platform."
                }
              />
            </div>
            <div>
              <C3_container_data
                img={security_icon}
                heading={"Trusted, Global Community"}
                content={"Your wellness, globally curated and locally rooted."}
              />
            </div>
            <div>
              <C3_container_data
                img={writting_icon}
                heading={"Transparent Listings & Reviews"}
                content={
                  "Read real reviews. Choose what resonates. No surprises."
                }
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="content4">
        <motion.div
          className="c4top"
          initial={{ x: -200, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }} // remove if you want it every time on scroll
        >
          <div className="c4title">
            <strong>Book your Pilgrim Experience</strong>
          </div>
          <div className="c4description">
            Step into a transformative journey with our curated Pilgrim
            Experiences—designed to help you reconnect with your mind, body, and
            spirit. These impactful retreats blend Indian wellness traditions
            like yoga, meditation, and Ayurveda with modern practices, offering
            rejuvenation through nature immersions, culinary explorations, and
            spiritual experiences rooted in India’s rich heritage.
          </div>
        </motion.div>
        <div className="c4bottom">
          <div className="c4left">
            <div className="carddiv">
              <PersondetailsCard
                className="details"
                image={Appleimg}
                title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                price={"Rs.56,997.00"}
              />
            </div>
          </div>
          <div className="c4right">
            <div className="carddiv">
              <PersondetailsCard
                className="details"
                image={yogapeople}
                title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                price={"Rs.56,997.00"}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="content5">
        <motion.div
          className="c5top"
          initial={{ x: -200, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className="c5title">
            <strong>Find your Pilgrim Session</strong>
          </div>
          <div className="c5description">
            Find clarity, balance, and strength with Pilgrim Sessions—guided
            group experiences led by trusted Urban Pilgrim experts. Whether it’s
            yoga, meditation, stress relief, nutrition, or spiritual rituals,
            our handpicked guides offer sessions rooted in Indian wisdom and
            tailored for modern living. Each one is a step toward holistic
            well-being—accessible, enriching, and made for you.
          </div>
        </motion.div>
        <div className="c5bottom">
          <div className="details">
            <PersondetailsCard
              className="details"
              image={rohini_singh}
              title={
                "Discover your true self - A 28 day program with Rohini Singh Sisodia"
              }
              price={"Rs.14,999.00"}
            />
          </div>
          <div className="details">
            <PersondetailsCard
              className="details"
              image={Anisha}
              title={"Let's meditate for an hour - With Anisha"}
              price={"Rs.199.00"}
            />
          </div>
          <div className="details">
            <PersondetailsCard
              className="details"
              image={arati_prasad}
              title={
                "Menopausal fitness - A 4 day regime curated by Aarti Prasad"
              }
              price={"Rs.4,000.00"}
            />
          </div>
        </div>
      </div>

      <div className="content6">
        <div className="meditateimg">
          <img src={Meditation} alt="error" />
        </div>
        <div className="imgover-content">
          <motion.div
            className="c6top"
            initial={{ x: -200, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }} // remove if you want it every time on scroll
          >
            <div className="c6title">
              <strong>Find your Guides</strong>
            </div>
            <div className="c6description" style={{ color: "#4F4F4F" }}>
              Begin your wellness journey with trusted guides rooted in Indian
              traditions and modern well-being. Discover, connect, and book
              sessions with experts who truly align with your path.
            </div>
          </motion.div>
          <div className="c6bottom">
            <div className="c6details">
              <PersondetailsCard
                className="c6details"
                image={yogaday}
                title={"Yoga hour - by Manjunath"}
                price={"Rs.1000.00"}
              />
            </div>
            <div className="c6details">
              <PersondetailsCard
                className="c6details"
                image={Manish_kumar}
                title={"Yoga hour - by Manish Kumar (Bihar School of Yoga)"}
                price={"Rs.800.00"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="content7">
        <motion.div
          className="c7top"
          initial={{ x: -200, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }} // remove if you want it every time on scroll
        >
          <div className="c7title">
            <strong>Find your wellness program</strong>
          </div>
          <div className="c7description">
            Discover transformative wellness retreats from around the world,
            curated in one place. From yoga and meditation to fitness and
            spiritual growth—all inspired by Indian wisdom—Urban Pilgrim helps
            you explore, compare, and book programs that align with your
            wellness goals. Trusted listings and favourable terms make your
            journey to rejuvenation easy and accessible.
          </div>
        </motion.div>
        <div className="c7bottom">
          <div className="c7left">
            <div className="carddiv">
              <PersondetailsCard
                className="details"
                image={house}
                title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                price={"Rs.50,000.00"}
              />
            </div>
          </div>
          <div className="c7right">
            <div className="carddiv">
              <PersondetailsCard
                className="details"
                image={yogapeople}
                title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                price={"Rs.56,997.00"}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="content8">
        <C8_container_data />
      </div>
      <Footer />
    </div>
  );
}

export default Home;
