import { useEffect, useState, useMemo } from "react";
import RecordedProgramCard from "./RecordedProgramCard";
import { useDispatch } from "react-redux";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { setRecordedSessions } from "../../features/pilgrim_session/recordedSessionSlice";

export default function RecordedPrograms({ filters = {}, bestSellingActive = false }) {

    const [recordedProgramData, setRecordedProgramData] = useState(null);
    const dispatch = useDispatch();

    useEffect(() => {
        const ref = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/recordedSession`);
        const unsubscribe = onSnapshot(ref, (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data() || {};
            const slides = Array.isArray(data.slides) ? data.slides : Object.values(data.slides || {});
            setRecordedProgramData(slides || null);
            dispatch(setRecordedSessions(slides || []));
        }, (error) => {
            console.error("Error subscribing to recorded programs:", error);
        });

        return () => unsubscribe();
    }, [dispatch]);

    const programs = recordedProgramData && recordedProgramData.length > 0 && recordedProgramData?.map((program) => ({
        image: program?.recordedProgramCard?.thumbnail,
        category: program?.recordedProgramCard?.category,
        title: program?.recordedProgramCard?.title,
        days: program?.recordedProgramCard?.days,
        videos: program?.recordedProgramCard?.videos,
        price: program?.recordedProgramCard?.price,
        features: program?.recordedProgramCard?.features,
        duration: program?.recordedProgramCard?.duration,
        mode: program?.recordedProgramCard?.subCategory,
        purchaseCount: Array.isArray(program?.purchasedUsers) ? program.purchasedUsers.length : 0,
    }));

    // Filter and sort programs based on applied filters
    const filteredPrograms = useMemo(() => {
        if (!programs?.length) return [];

        let filtered = programs.filter(program => {
            // Category filter
            if (filters.category && program?.category) {
                if (program.category.toLowerCase() !== filters.category.toLowerCase()) {
                    return false;
                }
            }


            // Type filter (only show if type is 'recorded' or no type filter)
            if (filters.type && filters.type.toLowerCase() !== 'recorded') {
                return false;
            }

            // Mode filter (check subCategory field)
            if (filters.mode && program?.mode) {
                if (program.mode.toLowerCase() !== filters.mode.toLowerCase()) {
                    return false;
                }
            }

            // Price filter
            if (filters.price && program?.price) {
                const price = parseFloat(program.price);
                
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
            if (filters.duration && program?.duration) {
                if (!program.duration.toLowerCase().includes(filters.duration.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });

        // Filter and sort by best selling if active
        if (bestSellingActive) {
            // Only show items with purchases
            filtered = filtered.filter(program => program.purchaseCount > 0);
            // Sort by highest purchase count
            filtered = filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        }

        return filtered;
        
    }, [programs, filters, bestSellingActive]);

    return (
        <section className="px-6 py-6 text-gray-900">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl sm:text-3xl text-[#2F6288] font-bold mb-6">
                    Recorded Programs <span className="bg-[#2F6288] mt-4 max-w-[200px] h-1 block"></span>
                </h2>

                <div className="text-sm text-gray-600 sm:pb-5">
                    Showing {filteredPrograms.length} of {(programs?.length || 0)} programs
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-3 place-items-center sm:place-items-stretch sm:px-0 px-4">
                    {filteredPrograms && filteredPrograms.map((program, index) => (
                        <RecordedProgramCard key={index} {...program} />
                    ))}
                </div>
            </div>
        </section>
    );
}
