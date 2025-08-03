import { motion } from "framer-motion";
import YogaCard from "./YogaCard";
function Highlights() {
    return (
        <div className="content5 ">
            <div className="c5container">
                <motion.div
                    className="c5top"
                    initial={{ x: -200, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true, amount: 0.1 }}
                >
                    <div className="text-2xl md:text-3xl font-bold text-left text-black">
                        <strong>Highlights</strong>
                    </div>
                </motion.div>
                <motion.div
                    className="c7bottom"
                    initial={{ y: 100, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true, amount: 0.1 }}
                >
                    <YogaCard />

                </motion.div>
            </div>
        </div>
    )
}

export default Highlights