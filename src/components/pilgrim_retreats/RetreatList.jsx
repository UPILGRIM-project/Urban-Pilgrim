import RetreatCard from "./RetreatCard";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useDispatch } from "react-redux";
import { setRetreatData } from "../../features/pilgrim_retreat/pilgrimRetreatSlice"

export default function RetreatList({ filters = {}, bestSellingActive = false }) {
    const [retreats, setRetreats] = useState([]);
    const uid = "user-uid";
    const dispatch = useDispatch();

    useEffect(() => {
        if (!uid) return;
        const ref = doc(db, `pilgrim_retreat/${uid}/retreats/data`);
        const unsubscribe = onSnapshot(ref, (snapshot) => {
            if (!snapshot.exists()) {
                setRetreats([]);
                dispatch(setRetreatData([]));
                return;
            }
            const data = snapshot.data() || {};
            const retreatsData = Object.keys(data)
                .sort((a, b) => Number(a) - Number(b))
                .map((key) => ({
                    id: key,
                    ...data[key],
                    purchaseCount: Array.isArray(data[key]?.purchasedUsers) ? data[key].purchasedUsers.length : 0,
                }));
            setRetreats(retreatsData || []);
            dispatch(setRetreatData(retreatsData || []));
        }, (error) => {
            console.error("Error subscribing to retreats:", error);
        });

        return () => unsubscribe();
    }, [uid, dispatch]);

    // Filter and sort retreats based on applied filters
    const filteredRetreats = useMemo(() => {
        if (!retreats.length) return [];

        let filtered = retreats.filter(retreat => {
            // Category filter
            if (filters.category && retreat?.pilgrimRetreatCard?.category) {
                if (retreat.pilgrimRetreatCard.category.toLowerCase() !== filters.category.toLowerCase()) {
                    return false;
                }
            }

            // Features filter
            if (filters.features && retreat?.features) {
                const hasMatchingFeature = retreat.features.some(feature => {
                    if (typeof feature === 'string') {
                        return feature.toLowerCase().includes(filters.features.toLowerCase());
                    }
                    if (feature?.title) {
                        return feature.title.toLowerCase().includes(filters.features.toLowerCase());
                    }
                    return false;
                });
                if (!hasMatchingFeature) return false;
            }

            // Location filter
            if (filters.location && retreat?.location) {
                if (filters.location === 'Others') {
                    // For "Others", check if location doesn't match any of the specific locations
                    const specificLocations = ['Chandigarh', 'Rishikesh', 'Kangra', 'Varanasi'];
                    const matchesSpecificLocation = specificLocations.some(location => 
                        retreat.location.toLowerCase().includes(location.toLowerCase())
                    );
                    if (matchesSpecificLocation) return false;
                } else {
                    // For specific locations, check if retreat location includes the filter
                    if (!retreat.location.toLowerCase().includes(filters.location.toLowerCase())) {
                        return false;
                    }
                }
            }

            // Price filter
            if (filters.price && retreat?.pilgrimRetreatCard?.price) {
                const price = parseFloat(retreat.pilgrimRetreatCard.price);
                
                switch (filters.price) {
                    case 'Under ₹10,000':
                        if (price >= 10000) return false;
                        break;
                    case '₹10,000-₹25,000':
                        if (price < 10000 || price > 25000) return false;
                        break;
                    case '₹25,000-₹50,000':
                        if (price < 25000 || price > 50000) return false;
                        break;
                    case '₹50,000+':
                        if (price < 50000) return false;
                        break;
                }
            }

            return true;
        });

        // Filter and sort by best selling if active
        if (bestSellingActive) {
            // Only show items with purchases
            filtered = filtered.filter(retreat => retreat.purchaseCount > 0);
            // Sort by highest purchase count
            filtered = filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        }

        return filtered;

    }, [retreats, filters, bestSellingActive]);

    return (
        <div className="space-y-4 md:mt-0 mt-16">
            {filteredRetreats.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No retreats found matching your filters.</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filter criteria.</p>
                </div>
            ) : (
                <>
                    <div className="text-sm text-gray-600 px-6 sm:pt-5">
                        Showing {filteredRetreats.length} of {retreats.length} retreats
                    </div>
                    <div className="md:px-10 px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRetreats.map((retreat) => (
                            <RetreatCard key={retreat.id} retreat={retreat} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );

}
