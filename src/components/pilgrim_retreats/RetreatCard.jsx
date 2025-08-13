import { useNavigate } from "react-router-dom";
import Button from "../ui/button";

export default function RetreatCard({ title, location, price, image }) {
  const navigate = useNavigate();
  const handleCardClick = (title) => {
    navigate(`/pilgrim_retreats/${title.replace(/\s+/g, '-').toLowerCase()}`);
    console.log(`Navigating to retreat: ${title}`);
    
  };
  return (
    <div className="rounded-xl bg-white overflow-hidden w-full max-w-sm shadow-[-16px_16px_18px_rgba(0,0,0,0.25)] border-black/30 border" onClick={()=>handleCardClick(title)}>
      <img src={image} alt={title} className="h-52 w-full object-cover p-4" />
      <div className="p-4">
        <h3 className="font-semibold text-xl leading-tight">{title}</h3>
        <div className="text-sm text-gray-600 flex flex-col items-start mt-2 space-y-2">
          <span className="flex items-center gap-2">
            <img src="/assets/retreats/Location.svg" className="text-[#A0A3A2]" /> {location}
          </span>
          <span className="flex items-center gap-2">
            <img src="/assets/retreats/card_tick.svg" className="text-[#A0A3A2]" /> Available
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-semibold text-xs text-gray">From <span className="text-lg text-black">₹ {price}</span></span>
          <Button btn_name="Book Now" />
        </div>
      </div>
    </div>
  );
}
