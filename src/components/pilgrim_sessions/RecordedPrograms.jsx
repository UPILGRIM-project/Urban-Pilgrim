import RecordedProgramCard from "./RecordedProgramCard";

const programs = [
  {
    image: "/assets/sessions/discover_your_true_self.png",
    category: "Yoga",
    title: "Discover Your True Self...",
    days: "28 Days",
    videos: "12 Videos",
    price: "14,999.00",
  },
  {
    image: "/assets/sessions/menopausal_fitness.png",
    category: "Yoga",
    title: "Menopausal Fitness",
    days: "4 Days",
    videos: "12 Videos",
    price: "199.00",
  },
  {
    image: "/assets/sessions/yoga_foundations.png",
    category: "Yoga",
    title: "Yoga Foundations",
    days: "4 Days",
    videos: "12 Videos",
    price: "199.00",
  },
];


export default function RecordedPrograms() {
  return (
    <section className="px-6 py-12 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          Recorded Programs <span className="bg-[#2F6288] mt-4 max-w-xs h-1 block"></span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, index) => (
            <RecordedProgramCard key={index} {...program} />
          ))}
        </div>
      </div>
    </section>
  );
}
