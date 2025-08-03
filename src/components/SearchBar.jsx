import { motion } from "framer-motion";
import { IoSearch, IoClose } from "react-icons/io5";

const recentSearches = [
  "Yoga hour", "Manjunath", "Online group yoga session",
  "yoga", "Iyengar Yoga", "Yoga Workshop with Navita",
  "Manish Kumar", "Meditation hour", "Reflect & Reboot",
];

export default function SearchBar({ onClose }) {
  return (
    <motion.div
      className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-2xl">
        <IoClose />
      </button>  
      <div className="relative w-full max-w-3xl p-6">
        {/* Search bar */}
        <div className="flex items-center border border-black/30 rounded-lg overflow-hidden shadow-sm mb-6">
          <input
            type="text"
            placeholder="Search for titles, descriptions, or tags..."
            className="w-full px-4 py-2 text-lg outline-none bg-transparent"
          />
          <div className="p-2">
            <IoSearch className="text-2xl" />
          </div>
        </div>

        {/* Recent Searches */}
        <div className="border border-black/30 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-gray-800 text-lg">
              Recent Searches
            </span>
            <button className="text-sm text-gray-800">Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item, idx) => (
              <button
                key={idx}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-full text-sm text-gray-700 whitespace-nowrap"
              >
                {item}
                <IoSearch className="text-xs" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
