import { useNavigate } from "react-router-dom";
import Button from "../ui/button";

export default function RetreatCard({ retreat }) {
    const navigate = useNavigate();
    const pilgrimRetreatCard = retreat?.pilgrimRetreatCard;

    const handleCardClick = (title) => {
        navigate(`/pilgrim_retreats/${title.trim().replace(/\s+/g, '-').toLowerCase()}`);
    };

    return (
        <div className="rounded-xl bg-white overflow-hidden w-full max-w-sm shadow-[-16px_16px_18px_rgba(0,0,0,0.25)] border-black/30 border" >
            {pilgrimRetreatCard?.thumbnailType && pilgrimRetreatCard?.thumbnailType.startsWith('video/') ? (
                <video
                    src={pilgrimRetreatCard?.image}
                    className="h-44 sm:h-52 w-full object-cover p-3 sm:p-4"
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            ) : (
                <img src={pilgrimRetreatCard?.image} alt={pilgrimRetreatCard?.title} className="h-44 sm:h-52 w-full object-cover p-3 sm:p-4" />
            )}
            
            <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-lg sm:text-xl leading-tight">{pilgrimRetreatCard?.title}</h3>
                <div className="text-xs sm:text-sm text-gray-600 flex flex-col items-start mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                        <img src="/assets/retreats/Location.svg" className="w-4 h-4 sm:w-5 sm:h-5 text-[#A0A3A2]" /> {pilgrimRetreatCard?.location}
                    </span>
                    <span className="flex items-center gap-1.5 sm:gap-2">
                        <img src="/assets/retreats/card_tick.svg" className="w-4 h-4 sm:w-5 sm:h-5 text-[#A0A3A2]" /> {pilgrimRetreatCard?.category || ""}
                    </span>
                </div>
                <div className="mt-3 sm:mt-4 flex items-center justify-between" onClick={() => handleCardClick(pilgrimRetreatCard?.title)}>
                    <span className="font-semibold text-[11px] sm:text-xs text-gray">From <span className="text-base sm:text-lg text-black">₹ {pilgrimRetreatCard?.price}</span></span>
                    <div className="scale-95 sm:scale-100 origin-right">
                        <Button btn_name="Book Now" />
                    </div>
                </div>
            </div>
        </div>
    );
}
