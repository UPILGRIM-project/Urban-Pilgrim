import { FaWind, FaWater, FaFire } from "react-icons/fa";
import { FaCube } from "react-icons/fa6";

const features = [
  {
    icon: <FaWind className="text-[#C16A00] text-3xl" />,
    title: "Air",
    description: "Clarity & Self-Reflection",
  },
  {
    icon: <FaWater className="text-[#C16A00] text-3xl" />,
    title: "Water",
    description: "Emotional Healing & Intuition",
  },
  {
    icon: <FaFire className="text-[#C16A00] text-3xl" />,
    title: "Fire",
    description: "Emotional Healing & Intuition",
  },
  {
    icon: <FaCube className="text-[#C16A00] text-3xl" />,
    title: "Ice",
    description: "Stability & Manifestation",
  },
];

export default function FeatureProgram() {
  return (
    <div className="max-w-7xl mx-auto md:px-6 md:py-12 py-8">
      <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
        {features.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-md flex flex-col gap-4">
            <div>{item.icon}</div>
            <h3 className="text-[#004B6E] font-semibold">{item.title}</h3>
            <p className="text-gray-600 text-sm">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
