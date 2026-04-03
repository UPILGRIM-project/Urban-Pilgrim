import { useDispatch } from "react-redux";
import LiveSessionCard from "./LiveSessionCard";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { setLiveSessions } from "../../features/pilgrim_session/liveSessionsSlice";

export default function LiveSessions({ filters = {}, bestSellingActive = false }) {

    const [liveSessionData, setLiveSessionData] = useState(null);
    const dispatch = useDispatch();

    useEffect(() => {
        const ref = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/liveSession`);
        const unsubscribe = onSnapshot(ref, (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data() || {};
            const slides = Array.isArray(data.slides) ? data.slides : Object.values(data.slides || {});
            const visibleSlides = (slides || []).filter((program) => program?.active !== false);
            setLiveSessionData(visibleSlides || null);
            dispatch(setLiveSessions(visibleSlides || []));
        }, (error) => {
            console.error("Error subscribing to live sessions:", error);
        });

        return () => unsubscribe();
    }, [dispatch]);

    const sessions = liveSessionData?.map((program) => ({
        image: program?.liveSessionCard?.thumbnail,
        category: program?.liveSessionCard?.category,
        title: program?.liveSessionCard?.title,
        days: program?.liveSessionCard?.days,
        videos: program?.liveSessionCard?.videos,
        price: program?.liveSessionCard?.price,
        features: program?.liveSessionCard?.features,
        duration: program?.liveSessionCard?.duration,
        mode: program?.liveSessionCard?.subCategory,
        purchaseCount: Array.isArray(program?.purchasedUsers) ? program.purchasedUsers.length : 0,
    }));

    // Filter and sort sessions based on applied filters
    const filteredSessions = useMemo(() => {
        if (!sessions?.length) return [];

        let filtered = sessions.filter(session => {
            // Category filter
            if (filters.category && session?.category) {
                if (session.category.toLowerCase() !== filters.category.toLowerCase()) {
                    return false;
                }
            }

            // Type filter (only show if type is 'live' or no type filter)
            if (filters.type && filters.type.toLowerCase() !== 'live') {
                return false;
            }

            // Mode filter (check subCategory field)
            if (filters.mode && session?.mode) {
                if (session.mode.toLowerCase() !== filters.mode.toLowerCase()) {
                    return false;
                }
            }

            // Price filter
            if (filters.price && session?.price) {
                const price = parseFloat(session.price);
                
                switch (filters.price) {
                    case 'Under ₹1,000':
                        if (price >= 1000) return false;
                        break;
                    case '₹1,000-₹2,500':
                        if (price < 1000 || price > 2500) return false;
                        break;
                    case '₹2,500-₹5,000':
                        if (price < 2500 || price > 5000) return false;
                        break;
                    case '₹5,000+':
                        if (price < 5000) return false;
                        break;
                }
            }

            // Duration filter
            if (filters.duration && session?.duration) {
                if (!session.duration.toLowerCase().includes(filters.duration.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });

        // Filter and sort by best selling if active
        if (bestSellingActive) {
            // Only show items with purchases
            filtered = filtered.filter(session => session.purchaseCount > 0);
            // Sort by highest purchase count
            filtered = filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        }

        return filtered;
        
    }, [sessions, filters, bestSellingActive]);

    return(
        <section className="px-6 py-6 text-gray-900">
            <div className="max-w-7xl mx-auto">
                <h2 className=" text-2xl sm:text-3xl text-[#2F6288] font-bold mb-6">
                    Live Sessions <span className="bg-[#2F6288] mt-2 w-20 h-1 block"></span>
                </h2>
                <div className="text-sm text-gray-600 sm:pb-5">
                    Showing {filteredSessions.length} of {(sessions?.length || 0)} sessions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-3 place-items-center sm:place-items-stretch sm:px-0 px-4">
                    {filteredSessions && filteredSessions.map((session, index) => (
                        <LiveSessionCard key={index} {...session} />
                    ))}
                </div>
            </div>
        </section>
    );
}
