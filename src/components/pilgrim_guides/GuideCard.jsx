import { FaInfoCircle, FaMapMarkerAlt } from "react-icons/fa";
import { BsFillCameraVideoFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

export default function GuideCard({ image, thumbnailType, category, title, price }) {
    const navigate = useNavigate();
    const handleCardClick = (title) => {
        // Save scroll position before navigating
        sessionStorage.setItem('guidesScrollPosition', window.scrollY.toString());
        navigate(`/guide/${title.trim().replace(/\s+/g, '-').toLowerCase()}`);
    };
    return (
        <div className="rounded-xl overflow-hidden shadow-md bg-white flex flex-col max-w-[300px] sm:max-w-xs" onClick={() => handleCardClick(title)}>
            {thumbnailType && thumbnailType.startsWith('video/') ? (
                <video 
                    src={image} 
                    className="aspect-[5/4] w-full object-cover object-top"
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            ) : (
                <img src={image} alt={title} className="aspect-[5/4] w-full object-cover object-top" />
            )}

            <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                <span className="inline-block bg-[#EAEFF3] text-[#3A6288] text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mb-2 w-fit">
                    {category}
                </span>

                <h3 className="font-semibold line-clamp-2 text-sm sm:text-md text-gray-800 mb-2 leading-snug">
                    {title}
                </h3>

                <p className="text-[#2F6288] font-semibold mb-4 text-sm sm:text-base">Rs. {price}</p>

                <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-[#2F6288] text-white text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-[#2F6288]/80">
                        <BsFillCameraVideoFill className="text-xs sm:text-sm" />
                        Book Now
                    </button>
                    <button className="flex-1 border border-[#2F6288] text-[#2F6288] text-xs sm:text-sm py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-50">
                        <FaMapMarkerAlt className="text-xs sm:text-sm" />
                        Learn more
                    </button>
                </div>
            </div>
        </div>
    );
}
