import { FaInfoCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function RecordedProgramCard({ image, category, title, days, videos, price }) {
    const navigate = useNavigate();
    const handleCardClick = () => {
        navigate(`/program/${title.trim().replace(/\s+/g, '-').toLowerCase()}/details`);
    };

    const isVideo = (url) => {
        if (!url) return false;
        const u = String(url).toLowerCase();
        return u.includes('.mp4') || u.includes('.webm') || u.includes('.ogg') || u.includes('.mov') || u.includes('video');
    };

    const resolveMediaFromField = (field) => {
        // field may be: string url, array of urls, or object with keys
        if (!field) return null;
        if (typeof field === 'string') return field;
        if (Array.isArray(field) && field.length > 0) return field[0];
        if (typeof field === 'object') {
            return field.video || field.media || field.url || field.src || field.image || null;
        }
        return null;
    };

    return (
        <div
            className="rounded-xl overflow-hidden shadow-md bg-white flex flex-col max-w-[300px] sm:max-w-xs"
            onClick={handleCardClick}
        >
            {(() => {
                const mainImg = resolveMediaFromField(image);
                if (isVideo(mainImg)) {
                    return (
                        <video
                            src={mainImg}
                            muted
                            loop
                            autoPlay
                            playsInline
                            controls
                            className="w-full aspect-[5/4] object-cover object-top"
                        />
                    );
                }
                else {
                    return (
                        <img
                            src={mainImg}
                            alt={title}
                            className="w-full aspect-[5/4] object-cover object-top"
                        />
                    ) 
                }
            })()}

            <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                <span className="inline-block bg-[#EAEFF3] text-[#3A6288] text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mb-2 w-fit">
                    {category}
                </span>

                <h3 className="font-semibold line-clamp-1 text-sm sm:text-md text-gray-800 mb-2 sm:mb-3 leading-snug">
                    {title}
                </h3>

                <div className="flex flex-col items-start text-xs sm:text-sm text-gray-600 gap-1 mb-3">
                    <div className="flex items-center gap-1">
                        <img src="/assets/sessions/calendar.svg" className="text-gray-500 w-4 h-4" />
                        <span>{days} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <img src="/assets/sessions/video.svg" className="text-gray-500 w-4 h-4" />
                        <span>{videos} videos</span>
                    </div>
                </div>

                <p className="text-[#2F6288] font-semibold mb-4 text-sm sm:text-base">
                    {price
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                        }).format(price)
                        : "Price not available"}
                </p>

                <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-[#2F6288] text-white text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-[#2F6288]/80">
                        <img src="/assets/sessions/cart.svg" className="text-sm h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Purchase
                    </button>
                    <button className="flex-1 border border-[#2F6288] text-[#2F6288] text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-50">
                        <FaInfoCircle className="text-xs sm:text-sm" />
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    );
}
