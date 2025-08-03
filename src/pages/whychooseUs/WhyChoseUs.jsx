import FeatureSection from "../../components/whyus/FeatureSection";

export default function WhyUs() {
  return (
    <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
        <div className="relative w-full">
            <img
            src="/retreats.svg"
            alt="Guides Header"
            className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
            />
            <div className="relative z-10 px-6 py-10 text-center">
            <h1 className="text-4xl font-bold mb-4">Why choose us ?</h1>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 md:py-10">
            <FeatureSection />
        </div>
    </div>
  )
}
