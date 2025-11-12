import FilterBar from "../../components/pilgrim_guides/FilterBar";
import CategorySelector from "../../components/pilgrim_guides/CategorySelector";
import { MdKeyboardArrowDown } from "react-icons/md";
import SEO from "../../components/SEO.jsx";
import GuidesDemo from "../../components/pilgrim_guides/GuidesDemo";
import WhyChooseUs from "../../components/pilgrim_guides/WhyChooseUs";
import Testimonials from "../../components/Testimonials";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { calculateBestSellingPrograms, getTopBestSellingPrograms } from "../../utils/bestSellingUtils";

export default function Guides() {
    const [filters, setFilters] = useState({
        category: '',
        mode: '',
        experience: '',
        price: '',
        availability: ''
    });
    const [bestSellingActive, setBestSellingActive] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    
    // Get guides data from Redux store
    const guidesData = useSelector(state => state.pilgrimGuides?.guides || []);

    useEffect(() => {
        // Check if we have a saved scroll position
        const savedScrollPosition = sessionStorage.getItem('guidesScrollPosition');
        
        if (savedScrollPosition) {
            // Restore scroll position after a small delay to ensure content is rendered
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScrollPosition, 10));
                // Clear the saved position
                sessionStorage.removeItem('guidesScrollPosition');
            }, 100);
        } else {
            // Only scroll to top if we're not returning from a guide details page
            window.scrollTo(0, 0);
        }
    }, []);

    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleCategoryChange = useCallback((category) => {
        setFilters(prev => ({ ...prev, category }));
    }, []);

    const toggleBestSelling = () => {
        setBestSellingActive(!bestSellingActive);
        setShowDropdown(!showDropdown);
    };
    
    // Calculate best selling guides
    const bestSellingGuides = useMemo(() => {
        if (!guidesData?.length) return [];
        const actual = Object.values(guidesData);        
        const guidesWithCounts = actual.map(guide => ({
            title: guide?.guideCard?.title || 'Unnamed Guide',
            type: 'Guide',
            purchaseCount: Array.isArray(guide?.purchasedUsers) ? guide.purchasedUsers.length : 0,
            category: guide?.guideCard?.category || 'General',
            experience: guide?.guideCard?.experience || 'N/A'
        }));
        
        return getTopBestSellingPrograms(calculateBestSellingPrograms(guidesWithCounts, 1), 5);
    }, [guidesData]);
    
    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <SEO
                title="Pilgrim Guides | Expert Wellness Instructors | Urban Pilgrim"
                description="Find experienced wellness guides and instructors for yoga, meditation, and holistic health practices. Connect with teachers who resonate with your path."
                keywords="wellness guides, yoga instructors, meditation teachers, wellness experts, holistic health practitioners, urban pilgrim"
                canonicalUrl="/pilgrim_guides"
                ogImage="/retreats.svg"
            />
            <div className="min-h-screen bg-gradient-to-b from-[#FAF4F0] to-white lg:mt-[100px] mt-[70px]">
                
                <div className="relative w-full mb-10">
                    <img
                        src="/retreats.svg"
                        alt="Guides Header"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                    <div className="relative z-10 px-4 sm:px-6 py-6 sm:py-10 text-center">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Pilgrim Guides</h1>
                        
                        <div className="flex justify-between items-center flex-wrap gap-3 sm:gap-4 my-6 sm:my-8">
                            <FilterBar onFiltersChange={handleFiltersChange} />
                        </div>
                    </div>

                    <div className="absolute w-full -translate-y-1/3 px-2 md:px-4 scale-100 origin-top">
                        <CategorySelector onCategoryChange={handleCategoryChange} />  
                    </div>
                </div>
                <GuidesDemo filters={filters} bestSellingActive={bestSellingActive} />

                <WhyChooseUs />

            </div>
            <Testimonials />
        </>
    );
}
