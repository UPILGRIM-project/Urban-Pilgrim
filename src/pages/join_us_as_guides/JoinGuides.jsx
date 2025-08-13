import Footer from "../../components/footer";
import Steps from "../../components/Steps";
import Button from "../../components/ui/button";
import SEO from "../../components/SEO.jsx";

export default function JoinGuides() {
    
    const steps = [
      {
        title: "Submit Your Application",
        content: "Use the link at the bottom of this page to complete your application."
      },
      {
        title: "Profile Review (5–7 Days)",
        content: "Our team will carefully assess your experience and expertise."
      },
      {
        title: "Introductory Interaction",
        content: "If shortlisted, you'll be invited for a brief interview to align on values and offerings."
      },
      {
        title: "Onboarding & Launch (Within 5–7 Days)",
        content: "Once selected, we’ll guide you through a smooth onboarding process and get your profile ready for bookings."
      }
    ];

    return (
        <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
            <SEO 
              title="Become a Wellness Guide | Join Urban Pilgrim"
              description="Share your expertise as a wellness professional with Urban Pilgrim. Join our platform as a Pilgrim Guide and reach a global audience."
              keywords="become a wellness guide, join urban pilgrim, wellness instructor opportunities, yoga teacher platform, meditation guide"
              canonicalUrl="/join_us_as_guides"
              ogImage="/assets/joinus/joinus.png"
            />
            <div className="relative w-full mb-10">
                <img
                src="/retreats.svg"
                alt="Guides Header"
                className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
                />
                <div className="relative z-10 px-6 py-10 text-center">
                <h1 className="text-4xl font-bold mb-4">Urban Pilgrim Guide</h1>
                <p>Share Your Expertise with a Global Audience</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 md:py-10">
                <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
                Why Join Urban Pilgrim? <span className="bg-[#2F6288] mt-4 max-w-xs w-full h-1 block"></span>
                </h2>
                <div className="border-l-4 border-[#9C4F25] bg-[#FAF8F7] p-6 text-[#1A1A1A] space-y-4 mb-8">
                    <p>
                        At <span className="font-semibold">Urban Pilgrim</span>, we are building a curated ecosystem of wellness professionals rooted in Indian traditions.
                    </p>

                    <p>
                        We invite yoga instructors, meditation guides, mental wellness coaches, nutritionists, ritual practitioners, and holistic healers to join our platform as <span className="font-semibold">Pilgrim Guides.</span>
                    </p>

                    <p>
                        As a guide, you can focus on what you do best—
                        <span className="font-semibold">
                        helping others live healthier, more balanced lives
                        </span>
                        —while we handle the rest.
                    </p>

                    <p>
                        From marketing to client acquisition and bookings, our platform enables you to reach a <span className="font-semibold">global audience</span> without the stress of managing the business side of things.
                    </p>
                </div>
                <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
                Onboarding Process <span className="bg-[#2F6288] mt-4 max-w-xs w-full h-1 block"></span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div className="flex flex-col justify-between gap-4">
                        <Steps steps={steps} />
                        <Button btn_name={"Join Us As Urban Pilgrim Guide"} />
                    </div>
                    <img
                        src="/assets/joinus/joinus.png"
                        alt="Join Us"
                        className="lg:w-full w-auto object-cover object-top rounded-lg mb-10 md:mb-0 lg:max-h-[600px] max-h-[300px] aspect-auto"
                        style={{ boxShadow: "-20px 26px 25.7px rgba(0, 0, 0, 0.25)" }}
                    />
                </div>

            </div>
        </div>
    )
}
