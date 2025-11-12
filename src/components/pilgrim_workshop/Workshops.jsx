import { useDispatch, useSelector } from "react-redux";
import WorkshopCard from "./WorkshopCard";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Workshops({ filters = {}, bestSellingActive = false }) {
    const dispatch = useDispatch();
    const [workshopsData, setWorkshopsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkshops = async () => {
            try {
                setLoading(true);
                const workshopsCollection = collection(db, 'workshops');
                const workshopsSnapshot = await getDocs(workshopsCollection);
                const workshopsList = workshopsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setWorkshopsData(workshopsList);
            } catch (error) {
                console.error('Error fetching workshops:', error);
                setWorkshopsData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkshops();
    }, []);

    // Transform workshop data to match the card format
    const workshops = workshopsData?.map((workshop, index) => ({
        id: workshop.id || index,
        image: workshop.thumbnail,
        category: 'Workshop',
        title: workshop.title,
        price: workshop.price,
        description: workshop.description,
        minPerson: workshop.minPerson,
        maxPerson: workshop.maxPerson,
        extraPersonPrice: workshop.extraPersonPrice,
        variants: workshop.variants,
        images: workshop.images,
        videos: workshop.videos,
        guide: workshop.guide,
        sessionDescription: workshop.sessionDescription,
        sessionTopics: workshop.sessionTopics,
        purchaseCount: Array.isArray(workshop?.purchasedUsers) ? workshop.purchasedUsers.length : 0,
    }));

    // Filter and sort workshops based on applied filters
    const filteredWorkshops = useMemo(() => {
        if (!workshops?.length) return [];

        let filtered = workshops.filter(workshop => {
            // Category filter
            if (filters.category && workshop?.category) {
                if (workshop.category.toLowerCase() !== filters.category.toLowerCase()) {
                    return false;
                }
            }

            // Type filter (only show if type is 'workshop' or no type filter)
            if (filters.type && filters.type.toLowerCase() !== 'workshop') {
                return false;
            }

            // Price filter
            if (filters.price && workshop?.price) {
                const price = parseFloat(workshop.price);
                
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

            return true;
        });

        // Filter and sort by best selling if active
        if (bestSellingActive) {
            // Only show items with purchases
            filtered = filtered.filter(workshop => workshop.purchaseCount > 0);
            // Sort by highest purchase count
            filtered = filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        }

        return filtered;
        
    }, [workshops, filters, bestSellingActive]);

    if (loading) {
        return (
            <section className="px-6 py-6 text-gray-900">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl text-[#2F6288] font-bold mb-6">
                        Workshops <span className="bg-[#2F6288] mt-2 w-20 h-1 block"></span>
                    </h2>
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="px-6 py-6 text-gray-900">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl sm:text-3xl text-[#2F6288] font-bold mb-6">
                    Workshops <span className="bg-[#2F6288] mt-2 w-20 h-1 block"></span>
                </h2>
                <div className="text-sm text-gray-600 sm:pb-5">
                    Showing {filteredWorkshops.length} of {(workshops?.length || 0)} workshops
                </div>

                {filteredWorkshops.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No workshops found</h3>
                        <p className="text-gray-600">Try adjusting your filters or check back later for new workshops.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-3 place-items-center sm:place-items-stretch sm:px-0 px-4">
                        {filteredWorkshops.map((workshop, index) => (
                            <WorkshopCard key={workshop.id || index} {...workshop} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
