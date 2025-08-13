import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const retreat = {
  days: [
    {
      day: "Day 1 – Arrival and immersion | Begin Within",
      activities: [
        {
          title: "Welcome Ritual",
          subpoints: [
            "Tilak ceremony",
            "Herbal tea",
            "A soulful welcome kit (journal, sage stick, intention tokens)"
          ]
        },
        {
          title: "Opening Circle",
          subpoints: [
            "Therapist-led circle with breathwork",
            "Journaling",
            "Singing bell ritual",
            "Shift from doing to being"
          ]
        },
        {
          title: "Satvik Lunch",
          subpoints: ["Wholesome, seasonal food with views of the Parvati River"]
        },
        {
          title: "Free Time / Personal Healing",
          subpoints: [
            "Unwind or book a private healing session with our pilgrim expert"
          ]
        },
        {
          title: "Guided Sound Meditation",
          subpoints: ["Immersive experience by the private river side"]
        },
        {
          title: "Nourishing Dinner with live Sufi music in the lawns",
          subpoints: [
            "Enjoy live music with nourishing meal",
            "Soulful conversation"
          ]
        }
      ]
    },
    {
      day: "Day 2 – Alignment & Awakening | Immerse in nature",
      activities: [
        {
          title: "Chakra yoga with gratitude journaling",
          subpoints: [
            "Align breath, body, and thought",
            "Energy center flow in the lap of nature"
          ]
        },
        { title: "Breakfast", subpoints: [] },
        {
          title: "Sacred Excursion to Manikaran incl dip in Hot Springs",
          subpoints: [
            "Visit Manikaran temple and Gurudwara",
            "Experience popular hot springs"
          ]
        },
        {
          title: "Soulful Explorations",
          subpoints: [
            "Visit a local village and learn about life at Kasol OR",
            "Trek through the mountains followed by lunch with locals"
          ]
        },
        {
          title: "Pool side sound healing",
          subpoints: ["Let vibrations soothe and center you"]
        },
        {
          title: "Personal healing or Ayurvedic Spa",
          subpoints: [
            "Rebalance through custom therapies",
            "Emotional release work"
          ]
        },
        {
          title: "Bonfire with Dinner Under the Stars",
          subpoints: ["Celebrate life with music and soulful conversations"]
        }
      ]
    },
    {
      day: "Day 3 – Expansion & Expression | Awakened presence",
      activities: [
        {
          title: "Heart opening yoga and journaling",
          subpoints: [
            "Dynamic, heart-opening sequence",
            "Blend breath, movement, and presence"
          ]
        },
        { title: "Breakfast", subpoints: [] },
        {
          title: "Nature walk",
          subpoints: [
            "Explore Himalayan forests with 240 varieties of exotic birds",
            "Spot rare Himalayan flying fox"
          ]
        },
        {
          title: "Visit Agri farms and Apple orchard",
          subpoints: [
            "Experience orchard operations",
            "Enjoy panoramic view of the Himalayas"
          ]
        },
        { title: "Picnic lunch at the orchard", subpoints: [] },
        {
          title: "Personal healing or Ayurvedic Spa",
          subpoints: [
            "Rebalance through custom therapies",
            "Emotional release work"
          ]
        },
        {
          title: "Mantra meditation",
          subpoints: [
            "Guided meditation through the seven chakras",
            "Release blockages and raise vibrations"
          ]
        },
        {
          title: "Dinner under the stars",
          subpoints: ["Enjoy the night with music and conversations"]
        }
      ]
    },
    {
      day: "Day 4 – Integration & Return | Closing the circle",
      activities: [
        {
          title: "Yoga and breathwork",
          subpoints: ["Anchor your experience with breath-led stillness"]
        },
        { title: "Breakfast", subpoints: [] },
        {
          title: "Closing Circle Ritual",
          subpoints: [
            "Breathe in the beauty of this retreat",
            "Exhale gratitude",
            "No fixing, no judging – just listening with presence",
            "Continue connection with inner peace"
          ]
        },
        {
          title: "Mantra of return",
          subpoints: ["“May we carry this light in our lives.”"]
        }
      ]
    }
  ]
};

export default function ProgramSchedule() {
  const steps = retreat.days;
  const [visibleDays, setVisibleDays] = useState(1);
  const [current, setCurrent] = useState(0);
  const [showActivities, setShowActivities] = useState(true);
  const [paused, setPaused] = useState(false);

  // Main sequence
  useEffect(() => {
    if (!paused) {
      const timer = setTimeout(() => {
        if (showActivities) {
          // Hide activities first
          setShowActivities(false);
        } else {
          if (current < steps.length - 1) {
            setCurrent((prev) => prev + 1);
            setVisibleDays((prev) => prev + 1);
            setShowActivities(true);
          }
        }
      }, showActivities ? 3000 : 800); // show activities
      return () => clearTimeout(timer);
    }
  }, [showActivities, current, paused, steps.length]);

  const toggleExpand = (idx) => {
    setPaused(true);
    if (current === idx && showActivities) {
      setShowActivities(false);
    } else {
      setCurrent(idx);
      setShowActivities(true);
    }
  };

  return (
    <motion.div
      className="flex flex-col justify-between h-full sm:p-6 py-6 rounded-xl"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="flex flex-col items-start">
        {steps.map((step, idx) => (
          <AnimatePresence key={idx}>
            {idx < visibleDays && (
              <motion.div
                className="flex items-start relative mb-0"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Timeline dots */}
                <div className="flex flex-col items-center h-full">
                  <motion.div
                    className={`w-8 h-8 rounded-full border-2 border-[#8B4513] absolute -left-1 -top-1 z-0 ${
                      idx === current ? "opacity-100" : "opacity-50"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className={`w-6 h-6 rounded-full ${
                      idx === current ? "bg-[#8B4513]" : ""
                    } z-10 relative`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 my-1 flex-1 bg-[#8B4513] opacity-50" />
                  )}
                </div>

                {/* Day titles */}
                <div className="ml-4">
                  <h3
                    onClick={() => toggleExpand(idx)}
                    className={`text-lg md:text-xl font-semibold cursor-pointer hover:underline ${
                      idx === current ? "text-[#8B4513]" : "text-gray-800"
                    }`}
                  >
                    {step.day}
                  </h3>

                  {/* Activities */}
                  <AnimatePresence>
                    {idx === current && showActivities && (
                      <motion.ul
                        className="list-disc ml-5 text-gray-700 my-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        {step.activities.map((act, i) => (
                          <li key={i}>
                            <strong>{act.title}:</strong>
                            {act.subpoints.length > 0 && (
                              <ul className="list-disc ml-5">
                                {act.subpoints.map((point, j) => (
                                  <li key={j}>{point}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </motion.div>
  );
}
