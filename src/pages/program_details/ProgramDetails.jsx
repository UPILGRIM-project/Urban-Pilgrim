import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import ProgramSchedule from "../../components/pilgrim_retreats/ProgramSchedule";
import Faqs from "../../components/Faqs";
import PilgrimGuide from "../../components/pilgrim_retreats/Pilgrim_Guide";
import SEO from "../../components/SEO.jsx";
import PersondetailsCard from "../../components/persondetails_card";
import FeatureProgram from "../../components/pilgrim_sessions/FeatureProgram";
import ProgramImageGallery from "../../components/pilgrim_sessions/ProgramImageGallery";
import SubscriptionCard from "../../components/pilgrim_sessions/SubscriptionCard";
import ProgramSection from "../../components/pilgrim_sessions/ProgramSection";

export default function ProgramDetails() {
  const [persons, setPersons] = useState(1);
  const location = useLocation();
  const [programData, setProgramData] = useState({
    title: "Discover your true self - A 28 day soul search journey with Rohini Singh Sisodia",
    description: "Embark on a transformative 28-day journey with Rohini Singh Sisodia to discover your true self through meditation, yoga, and mindfulness practices.",
    price: "74,999.00",
    instructor: "Rohini Singh Sisodia",
    duration: "28 days",
    image: "/assets/Rohini_singh.png"
  });

  // In a real application, you would fetch the program details based on the URL parameter
  useEffect(() => {
    const programId = new URLSearchParams(location.search).get('id');
    
    // For now, we're using the hardcoded data above
  }, [location]);

  const increment = () => setPersons(prev => prev + 1);
  const decrement = () => setPersons(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <>
      <SEO 
        title={`${programData.title} | Urban Pilgrim`}
        description={programData.description}
        keywords={`${programData.instructor}, wellness program, ${programData.duration}, urban pilgrim, self-discovery, meditation, yoga`}
        canonicalUrl={`/program_details?id=${encodeURIComponent(programData.title.toLowerCase().replace(/\s+/g, '-'))}`}
        ogImage={programData.image}
        ogType="product"
      >
        {/* Additional structured data for programs/products */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": programData.title,
            "description": programData.description,
            "image": programData.image,
            "offers": {
              "@type": "Offer",
              "priceCurrency": "INR",
              "price": programData.price.replace(/,/g, ''),
              "availability": "https://schema.org/InStock"
            },
            "brand": {
              "@type": "Brand",
              "name": "Urban Pilgrim"
            },
            "instructor": {
              "@type": "Person",
              "name": programData.instructor
            }
          })}
        </script>
      </SEO>
      <div className="max-w-7xl mx-auto p-6 bg-gradient-to-b from-[#FAF4F0] to-white rounded-2xl shadow-lg grid gap-6 md:mt-[100px] mt-[80px] px-4">
        <div className="space-y-4">
          <h2 className="md:text-2xl font-bold text-xl">
            Discover your true self - A 28 day soul search journey with Rohini Singh Sisodia
          </h2>
          <ProgramImageGallery />
        </div>

        <div className="flex flex-col justify-between">
          <div className="space-y-4 text-gray-700">
            <div className="flex text-lg font-semibold text-black">
              From ₹ 74,999.00
            </div>

            <div className="flex items-center gap-2 text-sm text-[#787B7B] font-bold">
              <img src="/assets/program/package.svg" alt="package" className="h-4 w-4" />
              Packages:
              <span className="px-4 py-2 bg-white rounded-lg text-black font-semibold">28 days</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-[#787B7B] font-bold">
              <img src="/assets/program/people.svg" alt="package" className="h-4 w-4" />
              <span className="mr-1">No. of persons/session:</span>
              <span className="flex items-center gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white border-[#D69A75] border rounded-full">
                <button onClick={decrement} className="px-1 sm:px-2 text-base sm:text-lg font-bold" aria-label="Decrease persons">−</button>
                <span className="min-w-[20px] text-center">{persons}</span>
                <button onClick={increment} className="px-1 sm:px-2 text-base sm:text-lg font-bold" aria-label="Increase persons">+</button>
              </span>
            </div>
          </div>

          <SubscriptionCard />

          <div className="flex flex-col">
            <p className="text-lg font-semibold text-gray-800 mt-4">Program Schedule</p>
            <ProgramSchedule />
          </div>
          <ProgramSection />
          <FeatureProgram />
          <Faqs />
        </div>
      </div>

      <PilgrimGuide />
      <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl grid gap-6 px-4">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          You May Also Like
        </h2>

        <motion.div
          className="c5bottom"
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.1 }}
        >
          <PersondetailsCard
            image="/assets/Rohini_singh.png"
            title="Discover your true self - A 28 day program with Rohini Singh Sisodia"
            price="Rs.14,999.00"
          />
          <PersondetailsCard
            image="/assets/Anisha.png"
            title="Let's meditate for an hour - With Anisha"
            price="Rs.199.00"
          />
          <PersondetailsCard
            image="/assets/arati_prasad.png"
            title="Menopausal fitness - A 4 day regime curated by Aarti Prasad"
            price="Rs.4,000.00"
          />
        </motion.div>
      </div>
    </>
  );
}
