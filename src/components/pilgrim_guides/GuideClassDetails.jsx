import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import GuideCard from "./GuideCard";
import SlotModal from "./SlotModal";

export default function GuideClassDetails() {
  const [mode, setMode] = useState("Offline");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <div className="px-4 py-10 mt-[100px] bg-gradient-to-r from-[#FAF4F0] to-white">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold">
          Yoga hour - by Manish Kumar (Bihar School of Yoga)
        </h1>
        <p className="text-2xl font-semibold text-gray-800 mt-2">
          From <span className="text-4xl">₹ 74,999.00</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-7xl mx-auto px-4 py-10">
        <div className="flex-shrink-0">
          <img
            src="https://images.unsplash.com/photo-1529070538774-1843cb3265df"
            alt="Instructor"
            className="rounded-xl h-full object-cover"
          />
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex items-center gap-4">
              <label className="font-medium">Select Mode:</label>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-4 py-2 border rounded-full border-[#D69A75] flex items-center gap-2 bg-white"
              >
                {mode} <FiChevronDown />
              </button>
              {dropdownOpen && (
                <div className="absolute mt-2 bg-white border rounded shadow w-full z-10">
                  {["Offline", "Online"].map((opt) => (
                    <div
                      key={opt}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                        mode === opt ? "bg-gray-100 font-semibold" : ""
                      }`}
                      onClick={() => {
                        setMode(opt);
                        setDropdownOpen(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-medium">No of persons/sessions:</label>
              <div className="flex items-center border-[#D69A75]  border rounded-full px-2">
                <button
                  className="px-2"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <span className="px-3">{quantity}</span>
                <button className="px-2" onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="grid max-w-sm gap-4">
            <div className="border border-[#4A6B57] p-4 rounded-xl space-y-2 bg-[#F6F7F6]">
              <p className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                <span>Monthly Subscription</span>
                <span className="text-[#E8A87C] ml-2 text-xs">Save 20%</span>
              </p>
              <p className="text-lg font-bold text-[#2F6288]">₹ 800.00</p>
              <ul className="text-sm list-disc list-inside text-gray-600">
                <li>1 session per month</li>
                <li>Priority scheduling</li>
                <li>Access to community</li>
              </ul>
            </div>

            <div className="border p-4 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                One Time Purchase
              </p>
              <p className="text-lg font-bold">₹ 1,000.00</p>
            </div>

            <button className="w-full bg-[#2F6288] text-white py-2 rounded hover:bg-[#2F6288]/90 transition" onClick={() => {
              if (mode === "Offline") setShowModal(true);
            }}>
              {mode === "Offline"
                ? "Book Now"
                : "Schedule Your Time"}
            </button>

            {mode === "Online" && (
              <button className="w-full border border-[#2F6288] text-[#2F6288] py-2 rounded hover:border-[#2F6288]/90 transition">
                Get Free Trial
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-gray-700 max-w-7xl mx-auto mt-10 px-4">
        <p>
          Manish has been imparting the knowledge of Yoga Vidya, as taught by the prestigious Bihar School of Yoga, Munger, since 2006. His association with the school is long-standing. His interests include playing musical instruments and travelling.
        </p>
        <br />
        <p>
          He has 17 years of experience as a Yoga coach and has undertaken yoga
          teaching programmes at Exaluscare, Convarys, Max Hospital, Silicopr,
          etc. Professionals have benefited from learning yoga as a lifestyle
          enabler and not just physical asanas. His interventions have benefitted
          employees who have chronic stress issues.
        </p>
      </div>

      {/* Yoga Vidya Skills */}
      <div className="max-w-7xl mx-auto mt-10 px-4">
        <h2 className="font-bold text-gray-800 mt-4">Yoga Vidya Skills</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
          <li>Shatkarmas - Jal Neti, Shankhprakshalana, Kunjal</li>
          <li>Surya Namaskar</li>
          <li>Asanas - Beginner & Intermediate Group</li>
          <li>Pranayama</li>
          <li>Pratyahara - Yoga Nidra, Antar Mouna, Ajapa Jap</li>
          <li>Dharana</li>
          <li>Bandha</li>
        </ul>
      </div>

      {/* Recommendations */}
      <div className="max-w-7xl mx-auto p-4">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          You May Also Like <span className="bg-[#2F6288] mt-4 w-xs h-1 block"></span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session, index) => (
            <GuideCard key={index} {...session} />
          ))}
        </div>
      </div>

      {showModal && <SlotModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
