import FilterBar from "../../components/pilgrim_guides/FilterBar";
import CategorySelector from "../../components/pilgrim_guides/CategorySelector";
import { MdKeyboardArrowDown } from "react-icons/md";
import SEO from "../../components/SEO.jsx";
import GuidesDemo from "../../components/pilgrim_guides/GuidesDemo";
import WhyChooseUs from "../../components/pilgrim_guides/WhyChooseUs";
import Testimonials from "../../components/Testimonials";

export default function Guides() {
  return (
    <>
    <SEO 
      title="Pilgrim Guides | Expert Wellness Instructors | Urban Pilgrim"
      description="Find experienced wellness guides and instructors for yoga, meditation, and holistic health practices. Connect with teachers who resonate with your path."
      keywords="wellness guides, yoga instructors, meditation teachers, wellness experts, holistic health practitioners, urban pilgrim"
      canonicalUrl="/pilgrim_guides"
      ogImage="/retreats.svg"
    />
    <div className="min-h-screen bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
      <div className="relative w-full mb-10">
        <img
          src="/retreats.svg"
          alt="Guides Header"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="relative z-10 px-6 py-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Pilgrim Guides</h1>
          <p>Find the teacher who resonates with your path</p>
          <WhyChooseUs />
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
      <GuidesDemo />
    </div>
    <Testimonials />
    </>
  );
}
