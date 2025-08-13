import { FaHome, FaLeaf, FaMountain, FaUtensils, FaPrayingHands, FaHeart } from "react-icons/fa";

const features = [
  {
    icon: <FaHome className="text-[#C16A00] text-3xl" />,
    title: "Where You'll Stay",
    description: "Luxury eco-cottages with mountain views, designed for comfort and tranquility. Each space blends traditional architecture with modern amenities.",
  },
  {
    icon: <FaLeaf className="text-[#C16A00] text-3xl" />,
    title: "Wellness & Healing",
    description: "Core wellness programs and healing practices offered during the retreat",
  },
  {
    icon: <FaMountain className="text-[#C16A00] text-3xl" />,
    title: "Nature & Exploration",
    description: "Outdoor experiences, cultural visits, nature immersion",
  },
  {
    icon: <FaUtensils className="text-[#C16A00] text-3xl" />,
    title: "Nourish & Nurture",
    description: "Meals and food philosophy during the retreat",
  },
  {
    icon: <FaPrayingHands className="text-[#C16A00] text-3xl" />,
    title: "Ritual & Reflection",
    description: "Spiritual, cultural, or personal growth practices included",
  },
  {
    icon: <FaHeart className="text-[#C16A00] text-3xl" />,
    title: "Soulful Moments",
    description: "Fun, bonding and celebratory elements to enhance connection and joy",
  },
];

export default function FeatureRetreat() {
  return (
    <div className="max-w-7xl mx-auto md:px-6 md:py-12 py-8">
      <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
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
