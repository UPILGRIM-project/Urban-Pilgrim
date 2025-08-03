import { motion } from 'framer-motion';
import EventCard from './EventCard';
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
    ];
    return (
        <div className="content4">
            <div className="c4container">
                <motion.div className="c4top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                    <div className="c4title"><strong>Upcoming Events</strong></div>
                    <div className="text-sm">Find and book upcoming wellness events, workshops, and classes led by trusted Urban Pilgrim guides—happening near you and across soulful spaces</div>
                </motion.div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4 md:px-5 px-2.5">
                    {events.map((event, index) => (
                        <EventCard key={index} data={event} />
                    ))}
                </div>
            </div>
        </div>
  )
}
