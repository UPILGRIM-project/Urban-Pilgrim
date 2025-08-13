import { FaQuoteLeft } from "react-icons/fa";

const testimonials = [
  {
    quote: "Now patients find me on Google even before their family doctor refers them.",
    name: "Dr. Sneha Shah",
    title: "General Physician – Ahmedabad",
    image: "https://picsum.photos/50?random=1",
  },
  {
    quote: "This platform helped me reach more patients than ever before.",
    name: "Dr. Raj Mehta",
    title: "Cardiologist – Mumbai",
    image: "https://picsum.photos/50?random=2",
  },
  {
    quote: "My practice has grown significantly thanks to this service.",
    name: "Dr. Anjali Verma",
    title: "Dermatologist – Delhi",
    image: "https://picsum.photos/50?random=3",
  },
];

export default function Testimonials() {
  return (
    <div className="mx-auto p-6 bg-[#F0F5FA] py-10 overflow-hidden">
      <h2 className="text-4xl font-bold py-10">Testimonials</h2>

      <div className="flex gap-6 w-max animate-infinite-scroll">
        {[...testimonials, ...testimonials].map((t, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md py-6 w-80 flex-shrink-0">
            {/* Quotation Icon */}
            <div className="text-[#2F6288] text-3xl mb-3 px-4">
              <FaQuoteLeft />
            </div>
            {/* Quote */}
            <p className="text-gray-700 text-lg mb-6 px-4">{t.quote}</p>
            {/* Author Section */}
            <div className="flex items-center gap-3 border-t">
              <img
                src={t.image}
                alt={t.name}
                className="w-12 h-12 rounded-full object-cover m-4"
              />
              <div className="px-4">
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
