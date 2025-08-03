import LiveSessionCard from "./LiveSessionCard";

const sessions = [
  {
    image: "/assets/Anisha.png",
    category: "Yoga",
    title: "Let's Meditate For An Hour - With Anisha",
    price: "199.00",
  },
  {
    image: "/assets/arati_prasad.png",
    category: "Meditation",
    title: "Menopausal Fitness – A 4 Day Regime Curated By Aarti Prasad",
    price: "4,000.00",
  },
  {
    image: "/assets/Anisha.png",
    category: "Yoga",
    title:
      "Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
    price: "14,999.00",
  },
];

export default function LiveSessions() {
  return (
    <section className="px-6 py-12 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          Live Sessions <span className="bg-[#2F6288] mt-4 max-w-xs h-1 block"></span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session, index) => (
            <LiveSessionCard key={index} {...session} />
          ))}
        </div>
      </div>
    </section>
  );
}
