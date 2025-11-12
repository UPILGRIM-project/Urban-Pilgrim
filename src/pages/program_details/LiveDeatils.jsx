import { useState, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import ProgramSchedule from "../../components/pilgrim_retreats/ProgramSchedule";
import Faqs from "../../components/Faqs";
import PilgrimGuide from "../../components/pilgrim_retreats/Pilgrim_Guide";
import SEO from "../../components/SEO.jsx";
import PersondetailsCard from "../../components/persondetails_card";
import FeatureProgram from "../../components/pilgrim_sessions/FeatureProgram";
import ImageGallery from "../../components/pilgrim_retreats/ImageGallery.jsx";
import SubscriptionCard from "../../components/pilgrim_sessions/SubscriptionCard";
import ProgramSection from "../../components/pilgrim_sessions/ProgramSection";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../features/cartSlice.js";
import { showSuccess, showError } from "../../utils/toast.js";
import BundlesPopup from "../../components/pilgrim_retreats/BundlesPopup.jsx";
import { fetchAllEvents } from "../../utils/fetchEvents";
import LiveCalendarModal from "../../components/pilgrim_sessions/LiveCalendarModal";

export default function LiveDetails() {
  const params = useParams();
  const [programData, setProgramData] = useState(null);
  const sessionId = params.sessionId;
  const [persons, setPersons] = useState(1);
  const [showBundlesPopup, setShowBundlesPopup] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showAll, setShowAll] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [occupancyType, setOccupancyType] = useState("individual"); // individual | couple | group
  const [mode, setMode] = useState(null); // Offline | Online
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Auto-set mode based on availability if provided (mirror Guide)
  useEffect(() => {
    if (programData?.liveSessionCard?.subCategory) {
      const sub = programData.liveSessionCard.subCategory.toLowerCase();
      if (sub === "offline") setMode("Offline");
      else if (sub === "online") setMode("Online");
      else if (sub === "both") setMode("Offline"); // default
    }
  }, [programData]);

  // Use admin liveSlots (since One-Time Slots editor is removed)
  const slots = (programData?.liveSlots || []).filter((s) => !!s?.date);

  // Available types are determined ONLY by pricing provided in admin
  const otp = programData?.oneTimeSubscription || {};
  const availableTypes = [
    otp?.individualPrice || otp?.price ? "individual" : null,
    otp?.couplesPrice ? "couple" : null,
    otp?.groupPrice ? "group" : null,
  ].filter(Boolean);

  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(occupancyType)) {
      setOccupancyType(availableTypes[0]);
    }
  }, [programData, availableTypes.join(",")]);
  // Group slots by date to support multiple time ranges per date
  const groupedByDate = (slots || []).reduce((acc, s) => {
    if (!s?.date) return acc;
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate)
    .filter((d) => {
      // Only show upcoming dates using local YMD comparison
      const now = new Date();
      const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return (d || "") >= todayYmd;
    })
    .sort();
  const visibleDates = showAll ? sortedDates : sortedDates.slice(0, 2);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sessionId]);

  const Data = useSelector((state) => state.pilgrimLiveSession.LiveSession);
  const cartItems = useSelector((state) => state.cart.items || []);
  const userPrograms = useSelector((state) => state.userProgram);

  // Get events from Redux store
  const { allEvents } = useSelector((state) => state.allEvents);

  // ✅ Check if program already purchased
  const alreadyPurchased = userPrograms?.some(
    (program) => program?.title === programData?.liveSessionCard?.title,
  );

  function normalizeSlug(str) {
    return str
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // spaces → dashes
      .replace(/-+/g, "-"); // collapse multiple dashes
  }

  useEffect(() => {
    if (Data && sessionId) {
      const pg = Data.find(
        (program) =>
          normalizeSlug(program?.liveSessionCard?.title) ===
          normalizeSlug(sessionId),
      );
      setProgramData(pg || null);
    }
  }, [Data, sessionId]);

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

  const increment = () => setPersons((prev) => prev + 1);
  const decrement = () => setPersons((prev) => (prev > 1 ? prev - 1 : 1));

  const handleSubscriptionClick = () => {
    // Open calendar modal for slot selection for one-time live sessions
    setShowCalendar(true);
  };

  const handleFreeTrialClick = () => {
    // If there is a free trial asset on the program, open it; else show message
    const trial = programData?.freeTrialVideo || programData?.freeTrialLink;
    if (trial && typeof trial === "string") {
      window.open(trial, "_blank");
    } else {
      showError("Free trial is not available for this program");
    }
  };

  const handleViewPreviousBooking = () => {
    navigate("/userdashboard");
  };

  function formatDateWithSuffix(dateStr) {
    if (!dateStr) return "Not available";
    const date = new Date(dateStr);
    const day = date.getDate();

    const getSuffix = (d) => {
      if (d > 3 && d < 21) return "th";
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    const month = date.toLocaleString("en-US", { month: "short" });
    return `${day}${getSuffix(day)} ${month}`;
  }

  return (
    <>
      <SEO
        title={`${programData?.liveSessionCard?.title} | Urban Pilgrim`}
        description={programData?.liveSessionCard?.description}
        keywords={`${programData?.liveSessionCard?.instructor}, wellness program, ${programData?.liveSessionCard?.duration}, urban pilgrim, self-discovery, meditation, yoga`}
        canonicalUrl={`/program_details?id=${encodeURIComponent(
          programData?.liveSessionCard?.title
            ?.toLowerCase()
            ?.replace(/\s+/g, "-"),
        )}`}
        ogImage={programData?.liveSessionCard?.image}
        ogType="product"
      >
        {/* Additional structured data for programs/products */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: programData?.liveSessionCard?.title,
            description: programData?.liveSessionCard?.description,
            image: programData?.liveSessionCard?.image,
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: programData?.liveSessionCard?.price.replace(/,/g, ""),
              availability: "https://schema.org/InStock",
            },
            brand: {
              "@type": "Brand",
              name: "Urban Pilgrim",
            },
            instructor: {
              "@type": "Person",
              name: programData?.liveSessionCard?.instructor,
            },
          })}
        </script>
      </SEO>

      {/* Main content */}
      <div className="xl:max-w-7xl lg:max-w-4xl md:max-w-[700px] mx-auto p-6 grid gap-6 md:mt-[100px] mt-[80px] px-4">
        {/* image section */}
        <div className="space-y-4">
          <h2 className="md:text-2xl font-bold text-xl">
            {programData?.liveSessionCard?.title || "Retreat Title"}
          </h2>
          <ImageGallery
            images={programData?.oneTimeSubscription?.images || []}
            videos={programData?.oneTimeSubscription?.videos || []}
          />
        </div>

        {/* details subscription */}
        <div className="flex flex-col justify-between">
          {/* Program details */}
          <div className="space-y-4 text-gray-700">
            {/* Price */}
            <div className="flex text-lg font-semibold text-black">
              <span>
                From{" "}
                {programData?.liveSessionCard?.price
                  ? new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 2,
                    }).format(programData?.liveSessionCard?.price)
                  : "Price not available"}
              </span>
            </div>

            {/* Days */}
            <div className="flex items-center gap-2 text-sm text-[#787B7B] font-bold">
              <img
                src="/assets/program/package.svg"
                alt="package"
                className="h-4 w-4"
              />
              Packages:
              <span className="px-4 py-2 bg-white rounded-lg text-black font-semibold">
                {programData?.liveSessionCard?.days} days
              </span>
            </div>

            {/* Occupancy selection - show only available types based on pricing */}
            {(() => {
              const available = availableTypes;
              if (available.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#787B7B] font-bold">
                  <img
                    src="/assets/program/people.svg"
                    alt="people"
                    className="h-4 w-4"
                  />
                  <span className="mr-1">Type:</span>
                  <div className="flex items-center gap-2">
                    {available.includes("individual") && (
                      <button
                        onClick={() => setOccupancyType("individual")}
                        className={`px-3 py-1 rounded-full border ${occupancyType === "individual" ? "border-[#C5703F] bg-[#C5703F] text-white" : "border-gray-300 bg-white"}`}
                      >
                        Individual
                      </button>
                    )}
                    {available.includes("couple") && (
                      <button
                        onClick={() => setOccupancyType("couple")}
                        className={`px-3 py-1 rounded-full border ${occupancyType === "couple" ? "border-[#C5703F] bg-[#C5703F] text-white" : "border-gray-300 bg-white"}`}
                      >
                        Couple
                      </button>
                    )}
                    {available.includes("group") && (
                      <button
                        onClick={() => setOccupancyType("group")}
                        className={`px-3 py-1 rounded-full border ${occupancyType === "group" ? "border-[#C5703F] bg-[#C5703F] text-white" : "border-gray-300 bg-white"}`}
                      >
                        Group
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {programData?.liveSessionCard?.description && (
              <div
                className="text-sm text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: programData.liveSessionCard.description,
                }}
              />
            )}
          </div>

          {/* time slots (grouped by date) */}
          {sortedDates.length > 0 ? (
            <div className="text-[#787B7B] mt-5">
              <p>
                <span className="font-medium">Program starts - </span>
                <span>
                  {formatDateWithSuffix(sortedDates[0]) || "Not available"}
                </span>
              </p>

              <p>
                <span className="font-medium">Live sessions with </span>
                <span className="font-medium">
                  {programData?.organizer?.name}
                </span>{" "}
              </p>

              {visibleDates.map((dateKey, idx) => (
                <div key={dateKey} className="mb-3">
                  <p className="font-medium text-gray-800">
                    Date -{" "}
                    <span className="text-[#787B7B]">
                      {formatDateWithSuffix(dateKey)}
                    </span>
                  </p>
                  {(groupedByDate[dateKey] || []).map((slot, i) => (
                    <p key={`${dateKey}-${i}`} className="text-[#787B7B] ml-2">
                      Time -
                      <span>
                        {slot.startTime
                          ? new Date(
                              `1970-01-01T${slot.startTime}`,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Not available"}
                      </span>{" "}
                      -
                      <span>
                        {slot.endTime
                          ? new Date(
                              `1970-01-01T${slot.endTime}`,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Not available"}
                      </span>
                    </p>
                  ))}
                </div>
              ))}

              {sortedDates.length > 2 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-[#2F5D82] font-medium mt-2 hover:underline"
                >
                  {showAll ? "See Less" : "Show More"}
                </button>
              )}
            </div>
          ) : null}

          {/* Primary CTA: Book Now (full-width, blue, rounded) */}
          <button
            type="button"
            onClick={handleSubscriptionClick}
            className="w-full sm:w-[360px] px-5 py-3 mt-5 rounded-md bg-[#2F6288] text-white font-semibold hover:bg-[#244c6a] self-start"
          >
            Book Now
          </button>

          {/* Secondary CTA below Book Now */}
          <div className="mt-3 flex flex-col gap-3">
            {!alreadyPurchased ? (
              <button
                type="button"
                onClick={handleFreeTrialClick}
                className="w-full sm:w-[360px] px-5 py-3 rounded-md border-2 border-[#2F6288] text-[#2F6288] font-semibold hover:bg-[#f7fbff] text-sm self-start"
              >
                Get a Free Trial
              </button>
            ) : (
              <button
                type="button"
                onClick={handleViewPreviousBooking}
                className="w-full sm:w-[360px] px-5 py-3 rounded-md border-2 border-[#2F6288] text-[#2F6288] font-semibold hover:bg-[#f7fbff] text-sm self-start"
              >
                See your previous booking
              </button>
            )}
          </div>

          {programData?.programSchedule.length > 0 && (
            <div className="flex flex-col mt-5">
              <p className="text-lg font-semibold text-gray-800 mt-4">
                Program Schedule
              </p>
              <ProgramSchedule
                programSchedules={programData?.programSchedule}
              />
            </div>
          )}

          <ProgramSection
            program={programData?.aboutProgram}
            journey={programData?.keyHighlights}
          />

          {programData?.features.length > 0 && (
            <FeatureProgram features={programData?.features} />
          )}

          {programData?.faqs[0].title !== "" && (
            <Faqs faqs={programData?.faqs} />
          )}
        </div>
      </div>

      {programData?.guide[0] && <PilgrimGuide guides={programData?.guide[0]} />}

      {/* You may also like */}
      <div className="max-w-7xl mx-auto p-6  grid gap-6 px-4">
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
              .filter(
                ([id, data]) =>
                  (data?.type === "live-session" || data?.type === "live") &&
                  !!data?.upcomingSessionCard?.image,
              )
              .sort(() => Math.random() - 0.5)
              .slice(0, 3)
              .map(([id, data]) => (
                <PersondetailsCard
                  key={id}
                  image={
                    data?.upcomingSessionCard?.image ||
                    "/assets/default-event.png"
                  }
                  title={data?.upcomingSessionCard?.title || "Event"}
                  price={`${data?.upcomingSessionCard?.price || "0"}`}
                  type={"live-session"}
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

      {/* Calendar Modal for one-time live sessions */}
      <LiveCalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        sessionData={{
          guideCard: {
            title: programData?.liveSessionCard?.title,
            thumbnail: programData?.liveSessionCard?.thumbnail,
            gst: programData?.liveSessionCard?.gst || 0,
          },
          organizer: programData?.organizer,
          online: {
            oneTime: {
              price: (() => {
                const occ = (occupancyType || "").toLowerCase();
                const otp = programData?.oneTimeSubscription || {};
                if (occ.includes("individual"))
                  return Number(otp?.individualPrice || otp?.price || 0);
                if (occ.includes("couple") || occ.includes("twin"))
                  return Number(otp?.couplesPrice || otp?.price || 0);
                if (occ.includes("group"))
                  return Number(otp?.groupPrice || otp?.price || 0);
                return Number(otp?.price || 0);
              })(),
              slotBookings: (() => {
                // Convert slot bookedCount to slotBookings format expected by CalendarModal
                const bookings = {};
                (programData?.liveSlots || []).forEach((slot) => {
                  const key = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                  bookings[key] = slot.bookedCount || 0;
                });
                return bookings;
              })(),
              slotLocks: (() => {
                // Create slot locks based on first booking occupancy type
                const locks = {};
                (programData?.liveSlots || []).forEach((slot) => {
                  if (slot.bookedCount > 0 && slot.lockedForType) {
                    const key = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                    locks[key] = slot.lockedForType;
                  }
                });
                return locks;
              })(),
            },
          },
          offline: {
            oneTime: {
              price: (() => {
                const occ = (occupancyType || "").toLowerCase();
                const otp = programData?.oneTimeSubscription || {};
                if (occ.includes("individual"))
                  return Number(otp?.individualPrice || otp?.price || 0);
                if (occ.includes("couple") || occ.includes("twin"))
                  return Number(otp?.couplesPrice || otp?.price || 0);
                if (occ.includes("group"))
                  return Number(otp?.groupPrice || otp?.price || 0);
                return Number(otp?.price || 0);
              })(),
              slotBookings: (() => {
                const bookings = {};
                (programData?.liveSlots || []).forEach((slot) => {
                  const key = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                  bookings[key] = slot.bookedCount || 0;
                });
                return bookings;
              })(),
              slotLocks: (() => {
                const locks = {};
                (programData?.liveSlots || []).forEach((slot) => {
                  if (slot.bookedCount > 0 && slot.lockedForType) {
                    const key = `${slot.date}|${slot.startTime}|${slot.endTime}`;
                    locks[key] = slot.lockedForType;
                  }
                });
                return locks;
              })(),
            },
          },
        }}
        selectedPlan="oneTime"
        mode={mode || "Online"}
        availableSlots={programData?.liveSlots || []}
        personsPerBooking={1}
        occupancyType={occupancyType}
        capacityMax={(() => {
          const occ = (occupancyType || "").toLowerCase();
          if (occ.includes("group"))
            return Number(programData?.oneTimeSubscription?.groupMax || 0);
          if (occ.includes("couple")) return 2;
          return 1; // individual
        })()}
      />
    </>
  );
}
