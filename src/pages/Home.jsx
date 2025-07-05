import React, { useRef, useState, useEffect } from "react";
import homepage_img from "../assets/home_page_img.png";
import homepage_overlay_img from "../assets/overlay_img.png";
import golden_mandala from "../assets/golden-mandala.png";
import "./Home.css";

import { useInView } from "react-intersection-observer";

import cardimg1 from "../assets/card-img1.png";
import cardimg2 from "../assets/onlinesession.png";
import cardimg3 from "../assets/Wellness_Programs.svg";
import cardimg4 from "../assets/Wellness_Guides.svg";
import yogaday from "../assets/yogaday-img.png";
import Footer from "../components/footer";
import C3_container_data from "../components/c3_container_data.jsx";
import Animated_card from "../components/Animated_card.jsx";
import Program from "../components/ProgramExplorer.jsx";

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
import StepWizard from "../components/StepWizard.jsx";
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

  const Controls = useAnimation();
  const [Ref, InView] = useInView({
    threshold: 0.3, // Adjust sensitivity if needed
    triggerOnce: true, // fire only once
  });

  useEffect(() => {
    if (InView) {
      Controls.start("visible");
    }
  }, [InView, Controls]);

  return (
    <div className="hero-section">
      <div className="topbannerimg">
         <img src={homepage_img} alt="Banner" />
      </div>
     

      <motion.div className="overlap-box">
        <div className="overlap-container">
          <motion.div
            className="textbox1"
            initial={{ x: -200, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
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
              transition: { duration: 1 },
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
              transition={{ repeat: Infinity, duration: 10, ease: "easeOut" }}
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
 <div className="div"><Program/></div>
      </div>
     

      <div className="content3">
        <div className="c3container">
          <motion.div
            className="c3img"
            initial={{ x: -500, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <img src={people_runnimg} alt="" />
          </motion.div>
          <motion.div
            className="c3text_container"
            initial={{ x: 500, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <motion.div className="datacontainer">
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
                  content={
                    "Your wellness, globally curated and locally rooted."
                  }
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
          </motion.div>
        </div>
      </div>

      <div className="content4">
        <div className="c4container">
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
              Experiences—designed to help you reconnect with your mind, body,
              and spirit. These impactful retreats blend Indian wellness
              traditions like yoga, meditation, and Ayurveda with modern
              practices, offering rejuvenation through nature immersions,
              culinary explorations, and spiritual experiences rooted in India’s
              rich heritage.
            </div>
          </motion.div>
          <motion.div className="c4bottom">
            <div className="c4left">
              <motion.div className="carddiv"
               initial={{ x: -400, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true,amount: 0.1 }} 
              
              >
                <PersondetailsCard
                  className="details"
                  image={Appleimg}
                  title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                  price={"Rs.56,997.00"}
                />
              </motion.div>
            </div>
            <div className="c4right">
              <motion.div className="carddiv"
              
               initial={{ x: 400, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true,amount: 0.1 }}
              >
                <PersondetailsCard
                  className="details"
                  image={yogapeople}
                  title={"Reboot & Rejuvenate on the Ganges (4 day retreat)"}
                  price={"Rs.56,997.00"}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
        <div className="content5">
          <div className="c5container">
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
                group experiences led by trusted Urban Pilgrim experts. Whether
                it’s yoga, meditation, stress relief, nutrition, or spiritual
                rituals, our handpicked guides offer sessions rooted in Indian
                wisdom and tailored for modern living. Each one is a step toward
                holistic well-being—accessible, enriching, and made for you.
              </div>
            </motion.div>
            <motion.div
              className="c5bottom"
              initial={{ y: 400, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
            >
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
            </motion.div>
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
            viewport={{ once: true, amount: 0.05 }} // remove if you want it every time on scroll
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
            <motion.div className="c6details"
             initial={{ y: 400, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <PersondetailsCard
                className="c6details"
                image={yogaday}
                title={"Yoga hour - by Manjunath"}
                price={"Rs.1000.00"}
                
              />
            </motion.div>
            <motion.div className="c6details"
             initial={{ y: 400, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <PersondetailsCard
                className="c6details"
                image={Manish_kumar}
                title={"Yoga hour - by Manish Kumar (Bihar School of Yoga)"}
                price={"Rs.800.00"}
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="content7">
        <div className="c7container">
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
             <StepWizard/>
            </div>
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
