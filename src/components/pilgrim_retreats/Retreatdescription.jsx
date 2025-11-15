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
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useSelector, useDispatch } from "react-redux";
import { fetchAllEvents } from "../../utils/fetchEvents";
import EventCard from "../upcoming_events/EventCard";
import { MdPeopleAlt  } from "react-icons/md";
import WeatherSection from "./WeatherSection";
// Removed BundlesPopup in favor of direct add-to-cart
import { addToCart } from "../../features/cartSlice";
import { showSuccess } from "../../utils/toast";
import { getProgramButtonConfig } from "../../utils/userProgramUtils";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";

export default function Retreatdescription() {

    const { retreatName } = useParams();
    const formattedTitle = retreatName.replace(/-/g, " ");
    const [persons, setPersons] = useState(1);
    const [retreatData, setRetreatData] = useState(null);
    // Removed Bundles Popup state — direct add-to-cart flow
    const [selectedOccupancy, setSelectedOccupancy] = useState(null);
    const uid = "user-uid";
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0,0);
    },[retreatName])

    // Auto-select first occupancy when retreat data loads
    useEffect(() => {
        if (retreatData?.session?.occupancies && retreatData.session.occupancies.length > 0 && !selectedOccupancy) {
            setSelectedOccupancy(retreatData.session.occupancies[0]);
        }
    }, [retreatData, selectedOccupancy]);
    
    // Get user programs from Redux
    const userPrograms = useSelector((state) => state.userProgram);

    const increment = () => setPersons((prev) => prev + 1);
    const decrement = () => setPersons((prev) => (prev > 1 ? prev - 1 : 1));
    
    // Get button configuration based on user ownership
    const buttonConfig = getProgramButtonConfig(
        userPrograms, 
        retreatData?.pilgrimRetreatCard?.title, 
        'retreat'
    );
    const dispatch = useDispatch();
    
    // Get events from Redux store
    const { allEvents } = useSelector((state) => state.allEvents);

    const normalize = (str) =>
        str
            ?.toLowerCase()
            .trim()
            .replace(/[-\s]+/g, " "); 

    useEffect(() => {
        const fetchRetreat = async () => {
            try {
                const retreatRef = doc(db, `pilgrim_retreat/${uid}/retreats/data`);
                const snapshot = await getDoc(retreatRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();

                    const retreatsData = Object.keys(data)
                        .map((key) => ({
                            id: key,
                            ...data[key],
                        }));

                    const found = retreatsData.find(
                        (r) => normalize(r.pilgrimRetreatCard?.title) === normalize(formattedTitle)
                    );

                    setRetreatData(found || null);
                }
            } catch (error) {
                console.error("Error fetching retreat:", error);
            }
        };

        if (retreatName && uid) fetchRetreat();
    }, [retreatName, formattedTitle]);

    // Fetch all events if not already loaded
    useEffect(() => {
        const loadEvents = async () => {
            if (!allEvents || Object.keys(allEvents).length === 0) {
                try {
                    await fetchAllEvents(dispatch);
                } catch (error) {
                    console.error("Error fetching events:", error);
                }
            }
        };
        
        loadEvents();
    }, [dispatch, allEvents]);

    return (
        <>
            <div className="max-w-7xl mx-auto p-6 bg-gradient-to-b from-[#FAF4F0] to-white rounded-2xl shadow-lg grid gap-6 md:mt-[100px] mt-[80px] px-4">
                {/* image gallery */}
                <div className="space-y-4">
                    {retreatData?.pilgrimRetreatCard?.category && (
                        <h3 className="text-xs md:text-sm font-bold uppercase tracking-wide text-[#2F6288]">
                            {retreatData.pilgrimRetreatCard.category}
                        </h3>
                    )}
                    <h2 className="md:text-2xl font-bold text-xl">
                        {retreatData?.pilgrimRetreatCard?.title || "Retreat Title"}
                    </h2>
                    <ImageGallery images={retreatData?.oneTimePurchase?.images || []} videos={retreatData?.oneTimePurchase?.videos || []} />
                </div>
                    
                <div className="flex flex-col justify-between">
                    {/* descrition */}
                    <div className="space-y-4 text-gray-700">
                        {/* price */}
                        <div className="flex text-lg font-semibold text-black">
                            <p>
                                From {new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                    minimumFractionDigits: 2,
                                }).format(retreatData?.pilgrimRetreatCard?.price || 0)}
                            </p>
                        </div>

                        {/* location */}
                        <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-[#C5703F]" />
                            <span className="flex gap-6 text-sm">{retreatData?.pilgrimRetreatCard?.location || "Location"}</span>
                        </div>
                        
                        {/* date */}
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-[#C5703F]" />
                            {
                                retreatData?.session?.dateOptions && 
                                retreatData?.session?.dateOptions.map((option, index) => (
                                    <span key={index} className="text-sm">Date Options: {option.start} to {option.end}</span>
                                ))
                            }
                        </div>

                        {/* occupancy */}
                        {retreatData?.session?.occupancies && retreatData?.session?.occupancies.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {
                                    retreatData?.session?.occupancies[0].type === "Single" || retreatData?.session?.occupancies[0].type === "Twin" ? (
                                        <div className="flex items-center gap-2">
                                            <FaUser className="text-[#C5703F]" />
                                            <span className="text-sm font-medium">Select Occupancy:</span>
                                        </div>
                                    ) : ""
                                }
                                <div className="flex flex-wrap gap-2">
                                    {retreatData.session.occupancies.map((occupancy, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedOccupancy(occupancy)}
                                            className={`px-4 py-2 rounded-lg border transition-all duration-200 text-sm ${
                                                selectedOccupancy?.type === occupancy.type
                                                    ? "border-[#C5703F] bg-[#C5703F] text-white shadow-md"
                                                    : "border-gray-300 bg-white text-gray-700 hover:border-[#C5703F] hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="text-center">
                                                <p className="font-semibold">{occupancy.type}</p>
                                                {occupancy.price && (
                                                    <p className="text-xs opacity-90">
                                                        ₹{new Intl.NumberFormat("en-IN").format(occupancy.price)}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Days */}
                        <div className="flex items-center gap-2 text-sm">
                            <Package className="size-5 text-[#C5703F]" />
                            Number of days
                            <span className="text-sm rounded-lg text-gray-800 font-medium">
                                {retreatData?.pilgrimRetreatCard?.duration ?? 1} days
                            </span>
                        </div>

                        {/* No. of persons/session */}
                        <div className="flex flex-wrap items-center gap-2 text-sm ">
                            <MdPeopleAlt  className="size-5 text-[#C5703F]" />
                            <span className="mr-1">No. of persons:</span>

                            <span className="flex items-center gap-2 px-2 sm:px-4 py-1 bg-white border-[#D69A75] border rounded-full">
                                <button
                                    onClick={decrement}
                                    className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                    aria-label="Decrease persons"
                                >
                                    −
                                </button>
                                <span className="min-w-[20px] text-center">{persons}</span>
                                <button
                                    onClick={increment}
                                    className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                    aria-label="Increase persons"
                                >
                                    +
                                </button>
                            </span>
                        </div>
                    </div>
                    
                    {/* Dynamic Action button */}
                    <div className="flex justify-end items-end w-full gap-4 mt-6">
                        <Button 
                            btn_name={buttonConfig.text} 
                            onClick={() => {
                                if (buttonConfig.action === 'view') {
                                    // Navigate to user dashboard or program view
                                    navigate('/userdashboard');
                                    return;
                                }

                                // Directly add retreat to cart
                                if (!retreatData) return;

                                // Get price with better fallback logic
                                let rawPrice = 0;
                                if (selectedOccupancy?.price) {
                                    rawPrice = selectedOccupancy.price;
                                } else if (retreatData?.pilgrimRetreatCard?.price) {
                                    rawPrice = retreatData.pilgrimRetreatCard.price;
                                } else {
                                    rawPrice = 0;
                                }
                                
                                
                                // Convert to number more carefully
                                let numericPrice = 0;
                                if (rawPrice) {
                                    // Handle both string and number types
                                    const priceString = String(rawPrice).replace(/,/g, "").replace(/[^0-9.]/g, "");
                                    numericPrice = parseFloat(priceString) || 0;
                                }
                                
                                const derivedImage =
                                    retreatData?.oneTimePurchase?.images?.[0] ||
                                    retreatData?.oneTimeSubscription?.images?.[0] ||
                                    retreatData?.pilgrimRetreatCard?.image ||
                                    "/assets/retreats.svg";

                                const cartItem = {
                                    id: retreatData?.id || `${retreatData?.pilgrimRetreatCard?.title || 'retreat'}-${Date.now()}`,
                                    title: retreatData?.pilgrimRetreatCard?.title || "Retreat",
                                    price: numericPrice,
                                    gst: retreatData?.pilgrimRetreatCard?.gst || 0,
                                    image: derivedImage,
                                    type: "retreat",
                                    persons: persons || 1,
                                    duration: retreatData?.pilgrimRetreatCard?.duration ?? 1,
                                    location: retreatData?.pilgrimRetreatCard?.location,
                                    meetGuide: retreatData?.meetGuide || null,
                                };

                                dispatch(addToCart(cartItem));
                                showSuccess("Item added to cart");
                            }}
                            className={buttonConfig.className}
                        />
                    </div>

                    {/* Program Schedule */}
                    {
                        retreatData?.programSchedule && retreatData?.programSchedule.length > 0 &&
                            <div className="flex flex-col" >
                                <p className="text-lg font-semibold text-gray-800 mt-4">Program Schedule</p>
                                <ProgramSchedule programSchedules={retreatData?.programSchedule} />
                            </div>
                    }

                    <WeatherSection location={retreatData?.pilgrimRetreatCard?.location || "Delhi"} />

                    <FeatureRetreat features={retreatData?.features} />
                    <JourneySection 
                        journey={retreatData?.session} 
                        retreatDescription={retreatData?.retreatDescription}
                        location={retreatData?.pilgrimRetreatCard?.location}
                    />
                    <Faqs faqs={retreatData?.faqs} />
                </div>
            </div>

            <PilgrimGuide guides={retreatData?.meetGuide} />
            
            {/* you may also like */}
            <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl grid gap-6 px-4">
                <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
                    You May Also Like
                </h2>

                <motion.div 
                    className="md:grid flex flex-col mx-auto lg:mx-0 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                    initial={{ y: 100, opacity: 0 }} 
                    whileInView={{ y: 0, opacity: 1 }} 
                    transition={{ duration: 0.5, ease: "easeOut" }} 
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {allEvents && Object.keys(allEvents).length > 0 ? (
                        Object.entries(allEvents)
                            .filter(([, data]) => {
                                // Only show retreat programs that have an image
                                return (
                                    data?.type === 'retreat' && 
                                    (!!data?.pilgrimRetreatCard?.image || !!data?.upcomingSessionCard?.image)
                                );
                            })
                            .sort(() => Math.random() - 0.5)
                            .slice(0, 3)
                            .map(([id, data]) => (
                                <PersondetailsCard
                                    key={id}
                                    image={
                                        data?.pilgrimRetreatCard?.image || 
                                        data?.upcomingSessionCard?.image || 
                                        '/assets/default-event.png'
                                    }
                                    title={
                                        data?.pilgrimRetreatCard?.title || 
                                        data?.upcomingSessionCard?.title || 
                                        'Retreat'
                                    }
                                    price={`${data?.pilgrimRetreatCard?.price || data?.upcomingSessionCard?.price || '0'}`}
                                    type={'retreat'}
                                />
                            ))
                    ) : (
                        // Fallback to original cards if no events loaded
                        <>
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
                        </>
                    )}
                </motion.div>
            </div>

            {/* Bundles Popup removed - direct add-to-cart flow */}
        </>
    );
}


