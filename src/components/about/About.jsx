import { motion } from "framer-motion";
import './About.css';
export default function About() {
    return (
        <motion.div className="content1">
            <div className="overlap-container ">
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
                    src="/assets/overlay_img.png"
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
                    transition={{ duration: 0.75, ease: "easeOut" }}
                    viewport={{ once: true }}
                >
                    <motion.div
                        className="divheading"
                        initial={{ x: "100%" }}
                        animate={{ x: "-100%" }}
                        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    >
                        Explore, Heal, Transform Explore, Heal, Transform
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

    );
}     