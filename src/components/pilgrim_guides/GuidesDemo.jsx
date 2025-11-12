import { useDispatch } from "react-redux";
import GuideCard from "./GuideCard";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { setGuides } from "../../features/pilgrim_guide/pilgrimGuideSlice"

export default function GuidesDemo({ filters = {}, bestSellingActive = false }) {

    const [guideData, setGuideData] = useState(null);
    const dispatch = useDispatch();

    useEffect(() => {
        const ref = doc(db, `pilgrim_guides/pilgrim_guides/guides/data`);
        const unsubscribe = onSnapshot(ref, (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data() || {};
            const slides = Array.isArray(data.slides) ? data.slides : Object.values(data.slides || {});
            setGuideData(slides || null);
            dispatch(setGuides(slides || []));
        }, (error) => {
            console.error("Error subscribing to guides:", error);
        });

        return () => unsubscribe();
    }, [dispatch]);

    const guides = guideData?.map((program) => ({
        image: program?.guideCard?.thumbnail,
        thumbnailType: program?.guideCard?.thumbnailType,
        category: program?.guideCard?.category,
        title: program?.guideCard?.title,
        price: program?.guideCard?.price,
        mode: program?.guideCard?.subCategory,
        experience: program?.guideCard?.experience,
        availability: program?.guideCard?.availability,
        purchaseCount: Array.isArray(program?.purchasedUsers) ? program.purchasedUsers.length : 0,
    }));

    // Filter and sort guides based on applied filters
    const filteredGuides = useMemo(() => {
        if (!guides?.length) return [];

        let filtered = guides.filter(guide => {
            // Category filter
            if (filters.category && guide?.category) {
                if (guide.category.toLowerCase() !== filters.category.toLowerCase()) {
                    return false;
                }
            }

            // Mode filter
            if (filters.mode && guide?.mode) {
                if (guide.mode.toLowerCase() !== filters.mode.toLowerCase()) {
                    return false;
                }
            }

            // Price filter
            if (filters.price && guide?.price) {
                const price = parseFloat(guide.price);
                
                switch (filters.price) {
                    case 'Under ₹1,000/hr':
                        if (price >= 1000) return false;
                        break;
                    case '₹1,000-₹2,500/hr':
                        if (price < 1000 || price > 2500) return false;
                        break;
                    case '₹2,500-₹5,000/hr':
                        if (price < 2500 || price > 5000) return false;
                        break;
                    case '₹5,000+/hr':
                        if (price < 5000) return false;
                        break;
                }
            }

            // Availability filter
            if (filters.availability && guide?.availability) {
                if (!guide.availability.toLowerCase().includes(filters.availability.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });

        // Filter and sort by best selling if active
        if (bestSellingActive) {
            // Only show items with purchases
            filtered = filtered.filter(guide => guide.purchaseCount > 0);
            // Sort by highest purchase count
            filtered = filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        }

        return filtered;
        
    }, [guides, filters, bestSellingActive]);

    // Removed window.scrollTo here to avoid interfering with scroll restoration
    // The parent Guides component handles scroll position management

    return (
        <section className="px-4 sm:px-6 pt-8 sm:py-8 text-gray-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-sm text-gray-600 sm:pt-5">
                    Showing {filteredGuides.length} of {(guides?.length || 0)} guides
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-3 place-items-center sm:place-items-stretch">
                    {filteredGuides && filteredGuides.map((guide, index) => (
                        <GuideCard key={index} {...guide} />
                    ))}
                </div>
            </div>
        </section>
    );
}
