import { useRef, useState, useEffect } from "react";
import "./Home.css";

import { useInView } from "react-intersection-observer";
import Footer from "../../components/footer/index.jsx";
import C3_container_data from "../../components/c3_container_data.jsx";
import Program_Explorer from "../../components/ProgramExplorer.jsx";
import PersondetailsCard from "../../components/persondetails_card.jsx";
import C8_container_data from "../../components/c8_container_data.jsx";
import { motion, useAnimation } from "framer-motion";
import StepWizard from "../../components/StepWizard.jsx";
import Highlights from "../../components/Highlights.jsx";
import HeroCarousel from "../../components/HeroCarousel.jsx";
import About from "../../components/about/About.jsx";
import UpComing from "../../components/upcoming_events/UpComing.jsx";
import ViewAll from "../../components/ui/button/ViewAll.jsx";

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
        threshold: 0.3,
        triggerOnce: true,
    });

    useEffect(() => {
        if (InView) {
            Controls.start("visible");
        }
    }, [InView, Controls]);

    return (
        <div className="hero-section no-scrollbar">
            <HeroCarousel />
            <About />
            <UpComing />

            {/* Explore our program */}
            <div className="content2">
                <div className="div">
                    <Program_Explorer />
                </div>
            </div>

            {/* content */}
            <div className="content3">
                <div className="c3container">
                    <motion.div className="c3img" initial={{ x: -100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                        <img src="/assets/people_running.svg" alt="" />
                    </motion.div>
                    <motion.div className="c3text_container" initial={{ x: 100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                        <motion.div className="datacontainer">
                            <div><C3_container_data imageCss="lg:max-h-[40px] lg:max-w-[30px] sm:max-h-[40px] sm:max-w-[30px] sm:mt-0 mt-1 max-h-[30px] max-w-[25px]" img="/assets/lotos_icon.svg" heading="Rooted in Indian Wisdom" content="Authentic, not commercialized wellness." /></div>
                            <div><C3_container_data imageCss="lg:max-h-[40px] lg:max-w-[30px] sm:max-h-[40px] sm:max-w-[30px] sm:mt-0 mt-1 max-h-[30px] max-w-[25px]" img="/assets/verification_icon.svg" heading="Expert-verified Programs" content="Only qualified, experienced professionals make it to our platform." /></div>
                            <div><C3_container_data imageCss="lg:max-h-[40px] lg:max-w-[25px] sm:max-h-[30px] sm:max-w-[25px] sm:mt-0 mt-1 max-h-[25px] max-w-[25px]" img="/assets/security_icon.svg" heading="Trusted, Global Community" content="Your wellness, globally curated and locally rooted." /></div>
                            <div><C3_container_data imageCss="lg:max-h-[40px] lg:max-w-[25px] sm:max-h-[30px] sm:max-w-[25px] sm:mt-0 mt-1 max-h-[25px] max-w-[25px]" img="/assets/writting_icon.svg" heading="Transparent Listings & Reviews" content="Read real reviews. Choose what resonates. No surprises." /></div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Book your Pilgrim Experience */}
            <div className="content5">
                <div className="c5container">
                    <motion.div className="c5top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>Book your Pilgrim Experience</strong></div>
                        <div className="c5description">Step into a transformative journey with our curated Pilgrim Experiences...</div>
                    </motion.div>
                    <ViewAll link="/pilgrim_retreats" />
                    <motion.div className="c5bottom lg:!overflow-visible " initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <PersondetailsCard image="/assets/appleimg.png" title="Reboot & Rejuvenate on the Ganges (4 day retreat)" price="Rs.56,997.00" />
                        <PersondetailsCard image="/assets/yogapeople.png" title="Reboot & Rejuvenate on the Ganges (4 day retreat)" price="Rs.56,997.00" />
                    </motion.div>
                </div>
            </div>

            {/* Find your Pilgrim Session */}
            <div className="content5 ">
                <div className="c5container">
                    <motion.div className="c5top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>Find your Pilgrim Session</strong></div>
                        <div className="c5description">Find clarity, balance, and strength with Pilgrim Sessions...</div>
                    </motion.div>
                    <ViewAll link="/pilgrim_sessions" />
                    <motion.div className="c5bottom lg:!overflow-visible" initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <PersondetailsCard image="/assets/Rohini_singh.png" title="Discover your true self - A 28 day program with Rohini Singh Sisodia" price="Rs.14,999.00" />
                        <PersondetailsCard image="/assets/Anisha.png" title="Let's meditate for an hour - With Anisha" price="Rs.199.00" />
                        <PersondetailsCard image="/assets/arati_prasad.png" title="Menopausal fitness - A 4 day regime curated by Aarti Prasad" price="Rs.4,000.00" />
                    </motion.div>
                </div>
            </div>

            {/* Find your Guides */}
            <div className="content6">
                <div className="meditateimg ">
                    <img src="/assets/meditationimg.png" alt="error" />
                </div>
                <div className="c6container">
                    <div className="imgover-content">
                        <motion.div className="c6top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.05 }}>
                            <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>Find your Guides</strong></div>
                            <div className="c6description" style={{ color: "#4F4F4F" }}>Begin your wellness journey with trusted guides...</div>
                        </motion.div>
                        <ViewAll link="/pilgrim_guides" />
                        <div className="c6bottom lg:!gap-20 lg:!overflow-visible overflow-hidden">
                            <motion.div initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                                <PersondetailsCard image="/assets/yogaday-img.png" title="Yoga hour - by Manjunath" price="Rs.1000.00" />
                            </motion.div>
                            <motion.div initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                                <PersondetailsCard image="/assets/manish_kumar.png" title="Yoga hour - by Manish Kumar (Bihar School of Yoga)" price="Rs.800.00" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yoga */}
            <Highlights />

            <div className="content8">
                <C8_container_data />
            </div>
        </div>
    );
}

export default Home;
