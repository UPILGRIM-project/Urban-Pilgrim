import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function EventCard({ data }) {
    const navigate = useNavigate();

    // Check if the media is a video file
    const isVideo = (url) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    return (
        <motion.div
            className="w-full rounded-2xl overflow-hidden lg:shadow-[-21px_21px_25.7px_0_rgba(0,0,0,0.25)] 
            bg-gradient-to-b from-[#FDF6F2] to-[#FCEFE6]"
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.1 }}
        >
            {isVideo(data.image) ? (
                <video
                    src={data.image}
                    className="w-full sm:h-60 h-48 aspect-square object-cover rounded-t-xl"
                    autoPlay
                    muted
                    preload="metadata"
                >
                    Your browser does not support the video tag.
                </video>
            ) : (
                <img
                    src={data.image}
                    alt={data.title}
                    className="w-full sm:h-60 h-48 aspect-square object-fill rounded-t-xl"
                />
            )}

            <div className="space-y-2 sm:p-4 p-2 bg-[url('/assets/eventbg.svg')] bg-cover bg-bottom rounded-b-2xl">
                <div className="flex gap-2 flex-wrap">
                    {data.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="bg-[#F6E5D8] text-[#A27056] sm:text-sm text-xs font-medium sm:px-3 px-2 sm:py-1 py-0.5 mb-2 rounded-full"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <h3
                    onClick={() => {
                        const slug = data.title.toLowerCase().replace(/\s+/g, "-");
                        const eventId = data.id;
                        
                        // Navigate based on event ID prefix
                        if (eventId.startsWith('retreat-')) {
                            navigate(`/pilgrim_retreats/${slug}`);
                        } else if (eventId.startsWith('guide-')) {
                            navigate(`/guide/${slug}`);
                        } else if (eventId.startsWith('live-')) {
                            navigate(`/session/${slug}/details`);
                        } else if (eventId.startsWith('recorded-')) {
                            navigate(`/program/${slug}/details`);
                        } else {
                            navigate(`/workshop/${slug}/details`);
                        }
                    }}
                    className="md:text-lg sm:text-base text-xs cursor-pointer font-semibold text-[#1A1A1A] leading-tight"
                >
                    {data.title}
                </h3>

                <p className="text-gray-500 sm:text-sm text-xs">
                    From{" "}
                    <span className="text-black font-semibold">Rs. {data.price}</span>
                </p>
            </div>
        </motion.div>
    );
}
