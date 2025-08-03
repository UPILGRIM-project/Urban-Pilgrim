import Steps from "../../components/Steps";
import Button from "../../components/ui/button";

export default function JoinAdvisors() {
    
    const steps = [
    {
        title: "Submit Your Application",
        content: "Use the link at the bottom of this page to complete your application."
    },
    {
        title: "Profile Review (5–7 Days)",
        content: "Our team will assess your professional experience, domain expertise, and your ability to deliver well-structured, purposeful journeys aligned with Urban Pilgrim’s ethos."
    },
    {
        title: "Concept Presentation",
        content: "Shortlisted applicants will be invited for a discussion to walk us through your retreat or experience idea, past work, and alignment with our brand vision."
    },
    {
        title: "Onboarding & Launch (Within 5–7 Days)",
        content: "If selected, we’ll guide you through onboarding, finalize the retreat details, and list your experience for bookings on the platform—with full support from our team."
    }
    ];


    return (
        <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
            <div className="relative w-full mb-10">
                <img
                src="/retreats.svg"
                alt="Guides Header"
                className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
                />
                <div className="relative z-10 px-6 py-10 text-center">
                <h1 className="text-4xl font-bold mb-4">Join Us as Trip Curators</h1>
                <p>Craft Journeys That Heal, Inspire & Transform</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 md:py-10">
                <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
                Why Join Urban Pilgrim? <span className="bg-[#2F6288] mt-4 max-w-xs w-full h-1 block"></span>
                </h2>
                <div className="border-l-4 border-[#9C4F25] bg-[#FAF8F7] p-6 text-[#1A1A1A] space-y-4 mb-8">
                    <p>
                        Are you passionate about designing experiences that go beyond tourism—journeys that nurture the soul, celebrate heritage, and awaken inner balance? <span className="font-semibold">Urban Pilgrim</span> invites experienced wellness professionals, workshop leaders, and cultural practitioners to collaborate with us as <span className="font-semibold">Trip Curators.</span>
                    </p>

                    <p>
                        We’re looking for individuals with a deep understanding of <span className="font-semibold">wellness, spirituality, fitness, heritage, or Indian culture</span>—who have led <span className="font-semibold">outstation retreats, short-format programs, or immersive workshops.</span> Whether it’s a three-day Himalayan meditation retreat, a movement-and-mantra weekend by the sea, or a guided temple trail infused with storytelling and rituals—if your experience is rooted in authenticity and intention, we want to hear from you.
                    </p>

                    <p>
                        At Urban Pilgrim, we support curators with access to a growing platform, logistical expertise, marketing support, and a conscious community seeking depth over distraction.
                    </p>

                    <p className="font-semibold">
                        Design journeys that transform.
                    </p>

                    <p className="font-semibold">
                        Collaborate with us to create something truly meaningful.
                    </p>
                </div>

                <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
                Onboarding Process <span className="bg-[#2F6288] mt-4 max-w-xs w-full h-1 block"></span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch md:max-h-[600px]">
                    <div className="flex flex-col justify-between max-h-[600px]">
                        <Steps steps={steps} />
                        <Button btn_name={"Join Us As Trip Curators"} />
                    </div>
                    <img
                        src="/assets/joinus/joinusadv.png"
                        alt="Join Us"
                        className="w-full max-h-[600px] object-cover object-top rounded-lg mb-10 md:mb-0"
                        style={{ boxShadow: "-20px 26px 25.7px rgba(0, 0, 0, 0.25)" }}
                    />
                </div>

            </div>
        </div>
    )
}
