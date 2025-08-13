import { motion } from "framer-motion";

export default function SubscriptionCard() {
  return (
    <div className="flex justify-start items-start py-4">
      <motion.div
        className="rounded-lg max-w-md w-full"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-bold mb-4">Subscription</h2>

        {/* Price Box */}
        <div className="border rounded-lg p-4 mb-5 bg-white">
          <p className="text-sm font-medium text-gray-700">One Time Purchase</p>
          <p className="text-2xl font-bold text-[#1F4B6E] mt-1">₹ 1,000.00</p>
          <p className="text-gray-400 text-sm mt-1">Total</p>
        </div>

        {/* Buttons */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full bg-[#2F5D82] text-white font-semibold py-3 rounded-md mb-3 hover:bg-[#244a67] transition-colors"
        >
          Book Now
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full border border-[#2F5D82] text-[#2F5D82] font-semibold py-3 rounded-md hover:bg-[#e6edf3] transition-colors"
        >
          Get a Free Trail
        </motion.button>
      </motion.div>
    </div>
  );
}
