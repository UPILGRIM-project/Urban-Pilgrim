import { motion } from "framer-motion";
import Button from "../../components/ui/button";

export default function WhoAreWe() {
  return (
    <>
    <div className="mt-[100px] relative w-full">
      <img
        src="/assets/whyus/whowe.png"
        alt="Who Are We Header"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20 bg-white/60 min-h-[400px]">
        <motion.div
          className="max-w-xl text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-bold mb-4">Who Are We?</h1>
          <p className="mb-6 text-gray-700">
            Urban Pilgrim is a modern-day sanctuary for those seeking balance, healing, and purpose in an increasingly fast-paced world.
          </p>
          <Button btn_name={"Explore"} />
        </motion.div>
      </div>
    </div>
    <div className="max-w-4xl mx-auto text-center px-6 py-12">
      <p className="text-gray-800 text-lg leading-relaxed mb-6">
        Rooted in the timeless wisdom of Indian traditions, we are a curated platform that brings together holistic wellness, spiritual
        practices, mindful travel, and cultural immersion—all under one roof.
      </p>
      <p className="text-gray-800 text-lg leading-relaxed">
        We believe that wellness is not a trend—it’s a way of living. At Urban Pilgrim, our mission is to help individuals reconnect with
        themselves through authentic experiences that blend 
        <span className="font-semibold"> ancient Indian practices </span> 
        with 
        <span className="font-semibold"> modern well-being needs</span>. Whether it’s a guided yoga session, a spiritual ritual, a therapeutic
        retreat, or a curated cultural getaway—everything we offer is crafted to 
        <span className="font-semibold"> awaken the soul, restore balance, and inspire transformation.</span>
      </p>
    </div>
    <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          Our Founder <span className="bg-[#2F6288] mt-4 w-12 h-1 block"></span>
        </h2>
    </div>
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center px-4">
        <div className="relative">
          <img
            src="/assets/joinus/joinusadv.png"
            alt="Founder"
            className="rounded-lg shadow-md relative z-10 max-h-[400px] w-full object-cover"
          />
          <div className="absolute -bottom-3 -right-3 w-full h-full border-2 border-yellow-500 rounded-lg -z-0"></div>
        </div>

        
        <div>
          <p className="text-gray-700 mb-4">
            Urban Pilgrim is the vision of <strong>Manu Indrayan</strong>, a seasoned entrepreneur and wellness advocate with over 25 years
            of experience in building purposeful consumer ventures. With a background in engineering (BITS Pilani) and business (IIM
            Bangalore), Manu’s journey has evolved from leading successful fashion and retail brands to now nurturing soulful,
            impact-driven ventures.
          </p>
          <p className="text-gray-700 mb-6">
            Through Urban Pilgrim, he seeks to bridge India’s deep spiritual and wellness traditions with the aspirations of a global,
            modern audience—creating a platform that helps people live better, more connected lives.
          </p>
          <Button btn_name="Explore Our Programs" />
        </div>
      </div>
    <div className="mt-20 bg-[#F8F5F3] p-10 rounded-lg text-center max-w-7xl mx-auto md:mb-10 mb-0">
        <h3 className="text-xl font-bold text-[#2F6288] mb-3">
            The Urban Pilgrim Promise
        </h3>
        <p className="text-gray-700 mb-4">
            In a world overflowing with information and noise, we bring you authenticity, simplicity, and purpose.
        </p>
        <p className="text-gray-700 font-semibold">
            Because your journey to wellness deserves more than a quick fix—it deserves meaning. <br />
            <span className="text-[#C5703F]">
            Urban Wellness. Rooted in Indian Wisdom.
            </span>
        </p>
    </div>
    </>
  );
}
