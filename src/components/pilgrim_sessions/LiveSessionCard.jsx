import { FaInfoCircle } from "react-icons/fa";
import { BsFillCameraVideoFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

export default function LiveSessionCard({ image, category, title, price }) {
  const navigate = useNavigate();
  const handleCardClick = () => {
    navigate(`/session/${title.replace(/\s+/g, '-').toLowerCase()}/slots`);
  };
  return (
    <div className="rounded-xl overflow-hidden shadow-md bg-white flex flex-col max-w-xs" onClick={handleCardClick}>
      <img src={image} alt={title} className="w-full aspect-[5/4] object-cover object-top" />

      <div className="p-4 flex flex-col justify-between flex-1">
        <span className="inline-block bg-[#EAEFF3] text-[#3A6288] text-xs font-semibold px-3 py-1 rounded-full mb-2 w-fit">
          {category}
        </span>

        <h3 className="font-semibold text-md text-gray-800 mb-2 leading-snug">
          {title}
        </h3>

        <p className="text-[#2F6288] font-semibold mb-4">Rs. {price}</p>

        <div className="flex gap-2 mt-auto">
          <button className="flex-1 bg-[#2F6288] text-white text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-[#2F6288]/80">
            <BsFillCameraVideoFill className="text-sm" />
            Book Now
          </button>
          <button className="flex-1 border border-[#2F6288] text-[#2F6288] text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-50">
            <FaInfoCircle className="text-sm" />
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
