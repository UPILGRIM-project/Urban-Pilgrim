import { motion } from "framer-motion";
import { FaChevronRight } from "react-icons/fa";
import NormalArrowButton from "./ui/NormalArrowButton"; // adjust if needed
import { useEffect, useState } from "react";

const PersonDetailsSlider = ({ image, title, price }) => {

    const [isLargeScreen, setIsLargeScreen] = useState(false);

    useEffect(() => {
        const checkScreen = () => {
            setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint = 1024px
        };
        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    return (
        <motion.div
            className="relative w-full py-8"
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.2 }}
        >
            <div className="flex gap-6 pr-4 md:overflow-visible overflow-x-auto scroll-smooth scrollbar-hide" >
                <motion.div
                    className={`relative w-[280px] rounded-xl overflow-hidden flex-shrink-0 shadow-none lg:shadow-[ -46px_46px_27.5px_0px_rgba(0,0,0,0.25)]`}
                    style={{
                        boxShadow: isLargeScreen
                        ? "-46px 46px 27.5px 0px rgba(0, 0, 0, 0.25)"
                        : "none",
                    }}
                >
                    <div className={`h-[350px] overflow-hidden`}>
                        <motion.img
                            src={image}
                            alt="Pilgrim Experience/session"
                            className="object-cover w-full h-full"
                            whileHover={{ scale: 1.1,  }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>

                    <div className="absolute bottom-0 md:w-[90%] w-full md:right-0 bg-[#1B5678] text-white p-3">
                        <div className="text-sm font-semibold leading-snug line-clamp-2">{title}</div>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-sm">
                                <span className="text-[#C0B3B4]">From </span>
                                <strong>{price}</strong>
                            </p>
                            <NormalArrowButton
                                icon={FaChevronRight}
                                dir={-1}
                                className="size-8"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default PersonDetailsSlider;
