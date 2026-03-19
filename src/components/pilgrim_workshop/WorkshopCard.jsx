import { FaInfoCircle, FaUsers } from "react-icons/fa";
// import { MdWorkshop } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../../utils/metaPixel";

export default function WorkshopCard({ 
    id, 
    image, 
    category, 
    title, 
    price, 
    minPerson, 
    maxPerson, 
    extraPersonPrice,
    variants 
}) {
    const navigate = useNavigate();
    
    const handleCardClick = () => {
        navigate(`/workshop/${title.trim().replace(/\s+/g, '-').toLowerCase()}/details`);
    };

    const handleViewDetails = (e) => {
        e.stopPropagation();
        navigate(`/workshop/${title.trim().replace(/\s+/g, '-').toLowerCase()}/details`);
    };

    const handleBookNow = (e) => {
        e.stopPropagation();
        trackEvent("Lead", { 
            button: "Book Now",
            program: title 
        });
        // Add to cart or direct booking logic
        navigate(`/workshop/${title.trim().replace(/\s+/g, '-').toLowerCase()}/details`);
    };


    // Helper function to determine media type
    const getMediaType = (url) => {
        if (!url) return 'image';
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video') ? 'video' : 'image';
    };

    const mediaType = getMediaType(image);
    const mediaSrc = image || '/assets/workshop-placeholder.jpg';

    return (
        <div 
            className="rounded-xl overflow-hidden shadow-md bg-white flex flex-col max-w-[300px] sm:max-w-xs cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={handleCardClick}
        >
            {/* Workshop Media */}
            <div className="relative">
                {mediaType === 'video' ? (
                    <video
                        src={mediaSrc}
                        className="w-full aspect-[5/4] object-cover object-top"
                        muted
                        loop
                        autoPlay
                        playsInline
                    />
                ) : (
                    <img 
                        src={mediaSrc} 
                        alt={title} 
                        className="w-full aspect-[5/4] object-cover object-top" 
                    />
                )}
                
                {/* Price Badge */}
                <div className="absolute top-3 right-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-full text-xs font-bold">
                        ₹{Number(price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Variants Badge */}
                {variants && variants.length > 1 && (
                    <div className="absolute top-3 left-3">
                        <span className="bg-[#2F6288] text-white px-2 py-1 rounded-full text-xs font-semibold">
                            {variants.length} Options
                        </span>
                    </div>
                )}
            </div>

            <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                {/* Category */}
                <span className="inline-block bg-[#EAEFF3] text-[#3A6288] text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mb-2 w-fit">
                    {category}
                </span>

                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-md text-gray-800 mb-2 leading-snug line-clamp-2">
                    {title || 'Untitled Workshop'}
                </h3>

                {/* Participants Info */}
                <div className="flex items-center gap-2 mb-2">
                    <FaUsers className="text-gray-500 text-xs" />
                    <span className="text-xs text-gray-600">
                        {minPerson || 1}-{maxPerson || '∞'} participants
                    </span>
                </div>

                {/* Price */}
                <p className="text-[#2F6288] font-semibold mb-4 text-sm sm:text-base">
                    ₹{Number(price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto">
                    <button 
                        onClick={handleBookNow}
                        className="flex-1 bg-[#2F6288] text-white text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-[#2F6288]/80 transition-colors"
                    >
                        {/* <MdWorkshop className="text-xs sm:text-sm" /> */}
                        Book Now
                    </button>
                    <button 
                        onClick={handleViewDetails}
                        className="flex-1 border border-[#2F6288] text-[#2F6288] text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors"
                    >
                        <FaInfoCircle className="text-xs sm:text-sm" />
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
}
