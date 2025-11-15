import { useEffect, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import EventCard from "./EventCard";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useParams } from "react-router-dom";
// import GuideCard from "../pilgrim_guides/GuideCard";
import SlotModal from "../pilgrim_guides/SlotModal";
import ProgramSchedule from "../pilgrim_retreats/ProgramSchedule";
import Faqs from "../Faqs";
import PilgrimGuide from "../pilgrim_retreats/Pilgrim_Guide";
import PersondetailsCard from "../../components/persondetails_card";
import { motion } from "framer-motion"

export default function EventDetails() {
    const [mode, setMode] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const { eventName } = useParams();
    const formattedTitle = eventName.replace(/-/g, " ");
    const [eventData, setEventData] = useState(null);
    const uid = "user-uid";

    // helper to normalize strings for comparison
    const normalize = (str) =>
        str
            ?.toLowerCase()
            .trim()
            .replace(/[-\s]+/g, " "); // collapse dashes & spaces into single space

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                // First, get the events collection to find the auto-generated document ID
                const eventsRef = collection(db, `upcomingEvents/${uid}/events`);
                const eventsSnapshot = await getDocs(eventsRef);
                
                if (!eventsSnapshot.empty) {
                    // Get the first document (assuming there's only one data document)
                    const eventDoc = eventsSnapshot.docs[0];
                    const data = eventDoc.data();

                    // Based on the Firestore structure, look for the event in upcomingSessionCard
                    if (data.upcomingSessionCard) {
                        // Check if the title matches
                        if (normalize(data.upcomingSessionCard.title) === normalize(formattedTitle)) {
                            setEventData(data);
                        } else {
                            // If no direct match, set the entire document as eventData
                            setEventData(data);
                        }
                    } else {
                        setEventData(data);
                    }
                }
            } catch (error) {
                console.error("Error fetching event:", error);
            }
        };

        fetchEvent();
    }, [formattedTitle]);

    useEffect(() => {
        window.scrollTo(0,0);
    },[eventName])

    return (
        <>
            <div className="px-4 py-10 mt-[100px] bg-gradient-to-r from-[#FAF4F0] to-white">
                {/* title and price */}
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-4xl font-bold">
                        {eventData?.upcomingSessionCard?.title || "Loading..."}
                    </h1>
                    <p className="text-2xl font-semibold text-gray-800 mt-2">
                        From <span className="text-3xl">{eventData?.upcomingSessionCard?.price &&
                            `₹ ${Number(eventData.upcomingSessionCard.price).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                        </span>
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-7xl mx-auto px-4 py-10">
                    {/* Image */}
                    <div className="flex-shrink-0">
                        <img
                            src={eventData?.upcomingSessionCard?.image || "https://images.unsplash.com/photo-1529070538774-1843cb3265df"}
                            alt="Instructor"
                            className="rounded-xl h-full object-cover"
                        />
                    </div>

                    {/* Subscription and mode */}
                    <div className="flex-1 space-y-6">
                        {/* mode */}
                        <div className="flex flex-wrap gap-4">
                            {/* Show dropdown only if subcategory is BOTH */}
                            {eventData?.upcomingSessionCard?.subCategory?.toLowerCase() === "both" && (
                                <div className="relative flex items-center gap-4">
                                    <label className="font-medium">Select Mode:</label>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="px-4 py-2 border rounded-full border-[#D69A75] flex items-center gap-2 bg-white"
                                    >
                                        {mode || "Choose Mode"} <FiChevronDown />
                                    </button>
                                    {dropdownOpen && (
                                        <div className="absolute mt-2 bg-white border rounded shadow w-full z-10">
                                            {["Offline", "Online"].map((opt) => (
                                                <div
                                                    key={opt}
                                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${mode === opt ? "bg-gray-100 font-semibold" : ""
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
                            )}

                            {
                                eventData?.upcomingSessionCard?.subCategory && eventData?.upcomingSessionCard?.subCategory !== "both" && (
                                    <div className="flex items-center border-[#D69A75] border rounded-full px-2 font-medium">{eventData.upcomingSessionCard.subCategory}</div>
                                )
                            }

                            {/* Quantity */}
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="font-medium">No of persons/sessions:</label>
                                <div className="flex items-center border-[#D69A75] border rounded-full px-2">
                                    <button
                                        className="p-2"
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    >
                                        -
                                    </button>
                                    <span className="px-3">{quantity}</span>
                                    <button
                                        className="px-2"
                                        onClick={() => setQuantity((q) => q + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Box (static for now) */}
                        <div className="grid max-w-sm gap-4">
                            {/* Monthly Subscription */}
                            {eventData?.monthlySubscription && (
                                <div
                                    onClick={() => setSelectedPlan("monthly")}
                                    className={`cursor-pointer border p-4 rounded-xl space-y-2 transition 
                                            ${selectedPlan === "monthly"
                                            ? "border-[#2F6288] bg-blue-50 shadow-md"
                                            : "border-gray-300 bg-white"}`
                                    }
                                >
                                    <p className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                                        <span>Monthly Subscription</span>
                                        <span className="text-[#E8A87C] ml-2 text-xs">Save {eventData?.monthlySubscription?.discount}%</span>
                                    </p>
                                    <p className="text-lg font-bold text-[#2F6288]">
                                        {eventData?.monthlySubscription?.price &&
                                            `₹ ${Number(eventData.monthlySubscription.price).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}`}
                                    </p>
                                    <ul className="text-sm list-disc list-inside text-gray-600">
                                        {eventData?.monthlySubscription?.description
                                            ?.split("\n")
                                            .map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                    </ul>
                                </div>
                            )}

                            {/* One Time Purchase */}
                            {eventData?.oneTimePurchase && (
                                <div
                                    onClick={() => setSelectedPlan("oneTime")}
                                    className={`cursor-pointer border p-4 rounded-xl space-y-2 transition 
                                            ${selectedPlan === "oneTime"
                                            ? "border-[#2F6288] bg-blue-50 shadow-md"
                                            : "border-gray-300 bg-white"}`}
                                >
                                    <p className="text-sm font-semibold text-gray-700">
                                        One Time Purchase
                                    </p>
                                    <p className="text-lg font-bold">
                                        {eventData?.oneTimePurchase?.price &&
                                            `₹ ${Number(eventData.oneTimePurchase.price).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}`}
                                    </p>
                                </div>
                            )}

                            {/* Buttons */}
                            {mode === "Offline" && (
                                <button
                                    className="w-full bg-[#2F6288] text-white py-2 rounded hover:bg-[#2F6288]/90 transition"
                                    onClick={() => setShowModal(true)}
                                >
                                    Book Now
                                </button>
                            )}

                            {/* {mode === "Online" && ( */}
                                <>
                                    <button className="w-full bg-[#2F6288] text-white py-2 rounded hover:bg-[#2F6288]/90 transition">
                                        Schedule Your Time
                                    </button>
                                    <button className="w-full border border-[#2F6288] text-[#2F6288] py-2 rounded hover:border-[#2F6288]/90 transition">
                                        Get Free Trial
                                    </button>
                                </>
                            {/* )}  */}
                        </div>
                    </div>
                </div>

                {/* Program Schedule */}
                {eventData?.programSchedule && (
                    <div className="max-w-7xl mx-auto mt-10 px-4">
                        <h2 className="font-bold text-gray-800 mt-4 capitalize">Program Schedule</h2>
                        <div className="mt-4">
                            <ProgramSchedule programSchedules={eventData.programSchedule} />
                        </div>
                    </div>
                )}

                {/* FAQs */}
                {eventData?.faqs && Array.isArray(eventData.faqs) && eventData.faqs.length > 0 && (
                    <div className="max-w-7xl mx-auto mt-10 px-4">
                        <h2 className="font-bold text-gray-800 mt-4">FAQs</h2>
                        <div className="mt-4">
                            <Faqs faqs={eventData.faqs} />
                        </div>
                    </div>
                )}

                {/* Description */}
                {eventData?.eventDescription && Array.isArray(eventData.eventDescription) && eventData.eventDescription.length > 0 && (
                    <div className="text-sm text-gray-700 max-w-7xl mx-auto mt-10 px-4">
                        <div className="space-y-4">
                            {eventData.eventDescription.map((point, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-800 mb-2">{point.title}</h3>
                                    {point.subpoints && Array.isArray(point.subpoints) && point.subpoints.length > 0 && (
                                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                                            {point.subpoints.map((subpoint, subIndex) => (
                                                <li key={subIndex}>{subpoint}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showModal && <SlotModal onClose={() => setShowModal(false)} />}
            </div>

            <PilgrimGuide guides={eventData?.meetGuide} />

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