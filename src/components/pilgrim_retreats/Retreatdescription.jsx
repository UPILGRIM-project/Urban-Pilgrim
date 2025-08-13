import { FaCalendarAlt, FaUser, FaUsers, FaMapMarkerAlt } from "react-icons/fa";
import ImageGallery from "./ImageGallery";
import { TiTick } from "react-icons/ti";
import { FaSnowflake } from "react-icons/fa";
import Button from "../../components/ui/button";
import FeatureRetreat from "./FeatureRetreat";
import JourneySection from "./JourneySection";
import PilgrimGuide from "./Pilgrim_Guide";
import PersondetailsCard from "../../components/persondetails_card";
import { motion } from "framer-motion";
import Faqs from "../Faqs";
import ProgramSchedule from "./ProgramSchedule";

export default function Retreatdescription() {
  return (
    <>
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-b from-[#FAF4F0] to-white rounded-2xl shadow-lg grid gap-6 md:mt-[100px] mt-[80px] px-4">
      <div className="space-y-4">
        <h2 className="md:text-2xl font-bold text-xl">
          Rejuvenate in the Himalayas - Immerse in nature & local culture at Kasol (3N4D)
        </h2>
        <ImageGallery />
      </div>

      <div className="flex flex-col justify-between">
        <div className="space-y-4 text-gray-700">
          <div className="flex text-lg font-semibold text-black">
            From ₹ 74,999.00
          </div>

          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-[#C5703F]" />
            <span className="flex gap-6 text-sm">Bhubaneswar, Odisha <span className="flex items-center text-sm text-gray-500">
                <span className="flex justify-center items-center bg-green-500 rounded-full h-4 w-4 mr-1">
                    <TiTick className="text-white text-xs" />
                </span>
                Available
                </span>
            </span>

          </div>

          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#C5703F]" />
            <span className="text-sm">Date Options: 17th August 2025</span>
          </div>

          <div className="flex items-center gap-2">
            <FaUser className="text-[#C5703F]" />
            <span className="text-sm">Occupancy: Single</span>
          </div>

          <div className="flex items-center gap-2">
            <FaUsers className="text-[#C5703F]" />
            <span className="text-sm">No. of persons/session: 1</span>
          </div>
        </div>

        <div className="flex justify-end items-end w-full gap-4 mt-6">
            <Button btn_name={"Book Now"} />
        </div>
        <div className="flex flex-col" >
          <p className="text-lg font-semibold text-gray-800 mt-4">Program Schedule</p>
          <ProgramSchedule />
        </div>

        <div className="flex md:flex-row flex-col w-full mx-auto bg-white rounded-2xl shadow-md overflow-hidden mt-[100px]">
            {/* Left: Weather Info */}
            <div className="bg-[#396E94] text-white p-6 max-w-7xl w-full mx-auto flex flex-col justify-center md:rounded-l-2xl rounded-t-2xl md:rounded-tr-none">
                <FaSnowflake className="md:text-7xl text-4xl mb-4" />
                <h3 className="text-xl font-semibold">Bhubaneswar Weather Forecast</h3>
                <p className="mt-2 text-sm">
                14–17 August 2025 | Average: 28°C (82°F) | Mostly sunny with occasional showers
                </p>
            </div>

            {/* Right: Clothing List */}
            <div className="p-6 md:w-1/2 w-full">
                <h4 className="text-lg font-bold mb-6">Recommended Clothing</h4>
                <ul className="space-y-4 text-sm text-gray-800">
                {[
                    "Light, breathable yoga attire",
                    "Layered clothing for cooler evenings",
                    "Comfortable walking shoes",
                    "Rain jacket or poncho",
                    "Sun hat and sunglasses",
                ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                    <span className="relative flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#F5E4D1] opacity-100"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C16A00] m-auto"></span>
                    </span>

                    <span>{item}</span>
                    </li>
                ))}
                </ul>
            </div>
        </div>
        <FeatureRetreat />
        <JourneySection />
        <Faqs />
      </div>
    </div>
    <PilgrimGuide />
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl grid gap-6 px-4">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          You May Also Like
        </h2>

        <motion.div className="c5bottom" initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
            <PersondetailsCard image="/assets/Rohini_singh.png" title="Discover your true self - A 28 day program with Rohini Singh Sisodia" price="Rs.14,999.00" />
            <PersondetailsCard image="/assets/Anisha.png" title="Let's meditate for an hour - With Anisha" price="Rs.199.00" />
            <PersondetailsCard image="/assets/arati_prasad.png" title="Menopausal fitness - A 4 day regime curated by Aarti Prasad" price="Rs.4,000.00" />
        </motion.div>
    </div>
    </>
  );
}
