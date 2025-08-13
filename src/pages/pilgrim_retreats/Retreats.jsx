import FilterBar from "../../components/pilgrim_retreats/FilterBar";
import CategorySelector from "../../components/pilgrim_retreats/CategorySelector";
import RetreatList from "../../components/pilgrim_retreats/RetreatList";
import { MdKeyboardArrowDown } from "react-icons/md";
import Testimonials from "../../components/Testimonials";
import SEO from "../../components/SEO.jsx";

export default function Retreats() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
      <SEO 
        title="Pilgrim Retreats | Urban Pilgrim"
        description="Immerse yourself in authentic retreat experiences with Urban Pilgrim. Find yoga, meditation, and wellness retreats across India."
        keywords="wellness retreats, yoga retreat, meditation retreat, urban pilgrim retreats, holistic wellness getaways"
        canonicalUrl="/pilgrim_retreats"
        ogImage="/retreats.svg"
      />
      <div className="relative w-full mb-10">
        <img
          src="/retreats.svg"
          alt="Retreat Header"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="relative z-10 px-6 py-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Pilgrim Retreats</h1>
          <div className="flex justify-between items-center flex-wrap gap-4 my-8">
            <FilterBar />
            <div className="flex items-center gap-2">
              <span className="text-sm">Sort By:</span>
              <button className="px-4 py-1 text-black border-2 border-[#00000033] rounded-full text-sm flex items-center gap-2">
                <img src="/assets/retreats/bookmark.svg" /> Best Selling <MdKeyboardArrowDown />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute w-full -translate-y-1/3 px-4">
            <CategorySelector />
        </div> 
      </div>
      <RetreatList />
      <Testimonials />
    </div>
  );
}
