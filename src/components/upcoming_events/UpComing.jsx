import { motion } from 'framer-motion';
import EventCard from './EventCard';
import ViewAll from '../ui/button/ViewAll';
import SEO from '../SEO';
export default function UpComing() {
    const events = [
    {
        title: "The Return - A Sacred Immersion",
        image: "https://picsum.photos/400/300",
        tags: ["Yoga", "Meditation"],
        price: "9,999.00",
    },
    {
        title: "Inner Peace Retreat",
        image: "https://picsum.photos/400/300?random=1",
        tags: ["Breathwork", "Silence"],
        price: "12,500.00",
    },
    {
        title: "The Return - A Sacred Immersion",
        image: "https://picsum.photos/400/300",
        tags: ["Yoga", "Meditation"],
        price: "9,999.00",
    },
    {
        title: "Inner Peace Retreat",
        image: "https://picsum.photos/400/300?random=1",
        tags: ["Breathwork", "Silence"],
        price: "12,500.00",
    },
    {
        title: "The Return - A Sacred Immersion",
        image: "https://picsum.photos/400/300",
        tags: ["Yoga", "Meditation"],
        price: "9,999.00",
    },
    {
        title: "Inner Peace Retreat",
        image: "https://picsum.photos/400/300?random=1",
        tags: ["Breathwork", "Silence"],
        price: "12,500.00",
    },
    ];
    return (
        <div className="content4">
            <SEO 
                title="Upcoming Wellness Events | Urban Pilgrim"
                description="Find and book upcoming wellness events, workshops, and classes led by trusted Urban Pilgrim guides—happening near you and across soulful spaces"
                keywords="wellness events, workshops, yoga, meditation, breathwork, silence retreats, urban pilgrim"
                canonicalUrl="/upcoming_events"
                ogImage="/public/assets/eventbg.svg"
                ogType="website"
            />
            <div className="c4container">
                <motion.div className="c4top mb-4" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                    <div className="text-2xl md:text-3xl font-bold text-black"><strong>Upcoming Events</strong></div>
                    <div className="text-sm">Find and book upcoming wellness events, workshops, and classes led by trusted Urban Pilgrim guides—happening near you and across soulful spaces</div>
                </motion.div>
                <ViewAll link="/upcoming_events" />
                <div className="relative -mx-10 ">
                    <div className="flex py-4 pb-12 overflow-x-scroll overflow-y-hidden no-scrollbar whitespace-nowrap">
                        {events.map((event, index) => (
                            <div key={index} className="md:min-w-[448px] min-w-[300px] pl-10">
                                <EventCard data={event} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
  )
}
