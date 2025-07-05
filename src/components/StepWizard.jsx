import React, { useState } from "react";
import { motion } from "framer-motion";

const steps = [
  { title: "Step 1", content: "Create your account and set up your details." },
  { title: "Step 2", content: "Verify your email address for security." },
  { title: "Step 3", content: "Start your journey with curated experiences." },
];

export default function Stepper() {
  const [current, setCurrent] = useState(1);

  const handleNext = () => {
    if (current < steps.length) setCurrent(current + 1);
  };

  const handleBack = () => {
    if (current > 1) setCurrent(current - 1);
  };

  return (
    <div className="flex flex-col justify-between h-full  p-6 rounded-xl ">
      {/* Stepper container */}
      <div className="flex flex-col items-start space-y-8">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start relative">
            <div className="flex flex-col items-center">
              {/* Brown dot */}
              {idx < current && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-5 h-5 rounded-full bg-[#8B4513] z-10"
                />
              )}

              {/* Vertical Line */}
              {idx < steps.length - 1 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: idx < current - 1 ? "80px" : "0px",
                    opacity: idx < current - 1 ? 1 : 0,
                  }}
                  transition={{ duration: 0.4 }}
                  className="w-0.5 bg-[#8B4513]"
                />
              )}
            </div>

            {/* Step Text */}
            {idx < current && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="ml-4"
              >
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                  {step.title}
                </h3>
                <p className="text-gray-700 mt-2">{step.content}</p>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Buttons under stepper */}
      <div className="flex gap-4 mt-10">
        <button
          onClick={handleBack}
          disabled={current === 1}
          className="border border-[#8B4513] text-[#8B4513] rounded-md px-6 py-3 text-base font-medium transition duration-200 hover:bg-[#8B4513] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={current === steps.length}
          className="bg-[#8B4513] text-white rounded-md px-6 py-3 text-base font-medium transition duration-200 hover:bg-[#5e3210] disabled:bg-[#8B4513]/50 disabled:cursor-not-allowed shadow-sm"
        >
          {current === steps.length ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}
