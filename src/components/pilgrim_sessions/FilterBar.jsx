import { MdKeyboardArrowDown } from "react-icons/md";

export default function FilterBar() {
  return (
    <div className="flex flex-wrap gap-4  items-center space-x-4">
      <span className="text-lg font-semibold">Filter:</span>
      <button className="px-4 py-1 border-2 border-[#00000033] rounded-full text-sm flex items-center gap-2">
        <img src="/assets/retreats/rupee.svg" /> Price <MdKeyboardArrowDown />
      </button>
      <button className="px-4 py-1 border-2 border-[#00000033] rounded-full text-sm flex items-center gap-2">
        <img src="/assets/retreats/Availability.svg" /> Availability <MdKeyboardArrowDown />
      </button>
    </div>
  );
}
