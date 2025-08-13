import { FiPlay, FiCalendar, FiClock } from "react-icons/fi";
import { BsFillCameraVideoFill } from "react-icons/bs";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SEO from "../../components/SEO.jsx";

const SessionSlots = () => {
  const navigate = useNavigate();
  const handleJoinNow = (title) => {
    navigate(`/session/${title.replace(/\s+/g, '-').toLowerCase()}/slots/description`);
    };
  const slots = [
    {
        id: 1,
        date: "17.06.2025",
        time: "2 PM - 3 PM",
        title: "Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
        image: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0", // placeholder image
    },
    {
        id: 2,
        date: "18.06.2025",
        time: "2 PM - 3 PM",
        title: "Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
        image: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0",
    },
    {
        id: 3,
        date: "18.06.2025",
        time: "4 PM - 5 PM",
        title: "Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
        image: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0",
    },
  ];
  return (
    <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
      <SEO 
        title="Live Session Slots | Meditation with Anisha | Urban Pilgrim"
        description="Book your spot for live meditation sessions with Anisha. View available dates and times for 'Let's meditate for an hour'."
        keywords="meditation slots, book meditation, live meditation, anisha meditation, urban pilgrim sessions"
        canonicalUrl="/session_slots"
        ogImage="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0"
      />
        <div className="relative w-full ">
            <img
            src="/retreats.svg"
            alt="Guides Header"
            className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
            />
            <div className="relative z-10 px-6 pt-10 pb-4 flex justify-between max-w-7xl mx-auto">
                <p className="text-3xl text-[#2F6288] font-bold">
                    Live - Let's meditate for an hour - With Anisha <span className="bg-[#2F6288] mt-4 w-1/3 min-w-20 h-1 block"></span>
                </p>
                <img src="/assets/slots/zoom.png" alt="Zoom Icon" className="w-48 h-full" />
            </div>
            <div className="bg-gradient-to-b from-white/10 via-white/60 to-[#FAF4F0] absolute -bottom-4 z-8 h-24 w-full"></div>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF4F0] to-white px-4 pb-4 max-w-7xl mx-auto z-10 relative">
            <h2 className="text-xl font-semibold mb-6 w-full">All Slots</h2>
            <div className="space-y-6 w-full">
                {slots.map((slot, index) => (
                <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col md:flex-row gap-4 p-4 border rounded-xl shadow w-full"
                >
                    <div className="relative w-full md:w-56 h-36 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                        src={slot.image}
                        alt="Slot Thumbnail"
                        className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">LIVE</span>
                    <span className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                        <FiPlay className="text-black w-4 h-4 ml-1" />
                        </div>
                    </span>
                    </div>

                    <div className="flex flex-col justify-between w-full">
                    <div>
                        <h3 className="text-base font-semibold mb-2">{slot.title}</h3>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                        <FiCalendar className="w-4 h-4 mr-2" /> Date: {slot.date}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                        <FiClock className="w-4 h-4 mr-2" /> Time: {slot.time}
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:self-end" onClick={() => handleJoinNow(slot.title)}>
                        <button className="bg-[#2F6288] text-white text-sm px-4 py-2 rounded-md hover:bg-[#2F6288]/90 transition flex gap-2 items-center">
                        <BsFillCameraVideoFill className="w-4 h-4" />Join Now
                        </button>
                    </div>
                    </div>
                </motion.div>
                ))}
            </div>
        </div>
    </div>
  )
}

export default SessionSlots