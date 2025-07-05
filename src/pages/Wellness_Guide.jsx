import React from "react";

function Wellness_Guide() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Wellness_Guide</h1>
      <div className="content2">
        <motion.div
          className="c2left"
          initial={{ x: -500, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className="golden_mandala">
            <motion.img
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              src={golden_mandala}
              alt="noimg"
            />
          </div>
        </motion.div>
        <motion.div
          className="c2right"
          initial={{ x: -1000, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
        >
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
        </motion.div>
      </div>
    </div>
  );
}

export default Wellness_Guide;
