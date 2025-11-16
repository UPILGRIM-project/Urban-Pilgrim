import { useRef, useState, useEffect } from "react";
import "./Home.css";

import { useInView } from "react-intersection-observer";
import Footer from "../../components/footer/index.jsx";
import C3_container_data from "../../components/c3_container_data.jsx";
import SEO from "../../components/SEO.jsx";
import Program_Explorer from "../../components/ProgramExplorer.jsx";
import PersondetailsCard from "../../components/persondetails_card.jsx";
import C8_container_data from "../../components/c8_container_data.jsx";
import { motion, useAnimation } from "framer-motion";
import StepWizard from "../../components/StepWizard.jsx";
import Highlights from "../../components/Highlights.jsx";
import HeroCarousel from "../../components/HeroCarousel.jsx";
import About from "../../components/about/About.jsx";
import UpComing from "../../components/upcoming_events/UpComing.jsx";
import ViewAll from "../../components/ui/button/ViewAll.jsx";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase.js";
import { ChevronDown } from "lucide-react";
import OptimizedImage from '../../components/ui/OptimizedImage';

function Home() {
    // const wrapperRef = useRef(null);
    // const [lineHeight, setLineHeight] = useState(0);
    const [contentFeatures, setContentFeatures] = useState(null);
    const [contentImage, setContentImage] = useState(null);
    const [Experience, setExperience] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [guides, setGuides] = useState(null);
    const [selectedGuideCategory, setSelectedGuideCategory] = useState('all');
    
    // Scroll progress states
    const [guidesScrollProgress, setGuidesScrollProgress] = useState(0);
    const [retreatsScrollProgress, setRetreatsScrollProgress] = useState(0);
    const [sessionsScrollProgress, setSessionsScrollProgress] = useState(0);
    
    // Refs for scroll containers
    const guidesScrollRef = useRef(null);
    const retreatsScrollRef = useRef(null);
    const sessionsScrollRef = useRef(null);
    const [showGuideCategoryDropdown, setShowGuideCategoryDropdown] = useState(false);
    const [guideCategories, setGuideCategories] = useState(['all']);
    const [selectedRetreatCategory, setSelectedRetreatCategory] = useState('all');
    const [showRetreatCategoryDropdown, setShowRetreatCategoryDropdown] = useState(false);
    const [retreatCategories, setRetreatCategories] = useState(['all']);
    const [selectedSessionCategory, setSelectedSessionCategory] = useState('all');
    const [showSessionCategoryDropdown, setShowSessionCategoryDropdown] = useState(false);
    const [sessionCategories, setSessionCategories] = useState(['all']);

    const cardContainerRef = useRef(null);
    const [progress, setProgress] = useState(0);
    // const controls = useAnimation();
    // const scrollAmount = 300;

    const uid = "your-unique-id";

    // content image
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/title_description/sectionFour`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setContentFeatures(data?.sectionFour?.features || []);
                    setContentImage(data?.sectionFour?.image || null);
                } else {
                    console.log("No slides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching images from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    // experiences/retreat
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/title_description/sectionFive`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setExperience(data?.sectionFive || {});
                } else {
                    console.log("No experiences found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching experiences from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    const [experienceData, setExperienceData] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `pilgrim_retreat/user-uid/retreats/data`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();

                    const retreatsData = Object.keys(data)
                        .map((key) => ({
                            id: key,
                            ...data[key],
                        }));

                    setExperienceData(retreatsData || null);
                    
                    // Extract unique categories for retreat filter
                    const categories = ['all', ...new Set(retreatsData.map(retreat => retreat?.pilgrimRetreatCard?.category).filter(Boolean))];
                    setRetreatCategories(categories);
                } else {
                    console.log("No slides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching images from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    // sessions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/title_description/sectionSix`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSessions(data?.sectionSix || {});
                } else {
                    console.log("No sessions found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching sessions from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    const [sessionData, setSessionData] = useState(null);
    const [recordedSessionData, setRecordedSessionData] = useState(null);
    const [workshopData, setWorkshopData] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch live sessions
                const liveSessionRef = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/liveSession`);
                const liveSnapshot = await getDoc(liveSessionRef);

                if (liveSnapshot.exists()) {
                    const liveData = liveSnapshot.data();
                    const actual = Object.values(liveData.slides);
                    setSessionData(actual || []);
                } else {
                    console.log("No live session slides found in Firestore");
                }

                // Fetch recorded sessions
                const recordedSessionRef = doc(db, `pilgrim_sessions/pilgrim_sessions/sessions/recordedSession`);
                const recordedSnapshot = await getDoc(recordedSessionRef);

                if (recordedSnapshot.exists()) {
                    const recordedData = recordedSnapshot.data();
                    const actual = Object.values(recordedData.slides);
                    setRecordedSessionData(actual || []);
                } else {
                    console.log("No recorded session slides found in Firestore");
                }

                // Fetch workshops
                const workshopsCollectionRef = collection(db, 'workshops');
                const workshopsSnapshot = await getDocs(workshopsCollectionRef);
                
                if (!workshopsSnapshot.empty) {
                    const workshopsArray = workshopsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setWorkshopData(workshopsArray || []);
                } else {
                    console.log("No workshops found in Firestore");
                }

                // Extract unique categories for session filter
                const liveCategories = liveSnapshot.exists() ? Object.values(liveSnapshot.data().slides).map(session => session?.liveSessionCard?.category).filter(Boolean) : [];
                const recordedCategories = recordedSnapshot.exists() ? Object.values(recordedSnapshot.data().slides).map(session => session?.recordedProgramCard?.category).filter(Boolean) : [];
                const workshopCategories = workshopsSnapshot.empty ? [] : workshopsSnapshot.docs.map(doc => doc.data()?.category).filter(Boolean);
                const allSessionCategories = [...liveCategories, ...recordedCategories, ...workshopCategories];
                const categories = ['all', ...new Set(allSessionCategories)];
                setSessionCategories(categories);
            } catch (error) {
                console.error("Error fetching session data from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    // guides
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `homepage/${uid}/title_description/sectionSeven`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setGuides(data?.sectionSeven || {});
                } else {
                    console.log("No guides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching guides from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    const [guideData, setGuideData] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const slidesRef = doc(db, `pilgrim_guides/pilgrim_guides/guides/data`);
                const snapshot = await getDoc(slidesRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const actual = Object.values(data.slides);
                    setGuideData(actual || []);
                    
                    // Extract unique categories for filter
                    const categories = ['all', ...new Set(actual.map(guide => guide?.guideCard?.category).filter(Boolean))];
                    setGuideCategories(categories);
                } else {
                    console.log("No slides found in Firestore");
                }
            } catch (error) {
                console.error("Error fetching images from Firestore:", error);
            }
        };

        fetchData();
    }, []);

    // Filter guides based on selected category
    const filteredGuides = guideData ? Object.values(guideData).filter(guide => {
        if (selectedGuideCategory === 'all') return true;
        return guide?.guideCard?.category === selectedGuideCategory;
    }) : [];
    
    const guideArray = filteredGuides;

    // Filter retreats based on selected category
    const filteredRetreats = experienceData ? experienceData.filter(retreat => {
        if (selectedRetreatCategory === 'all') return true;
        return retreat?.pilgrimRetreatCard?.category === selectedRetreatCategory;
    }) : [];
    
    const retreatArray = filteredRetreats;

    // Filter sessions based on selected category
    const filteredLiveSessions = sessionData ? sessionData.filter(session => {
        if (selectedSessionCategory === 'all') return true;
        return session?.liveSessionCard?.category === selectedSessionCategory;
    }) : [];

    const filteredRecordedSessions = recordedSessionData ? recordedSessionData.filter(session => {
        if (selectedSessionCategory === 'all') return true;
        return session?.recordedProgramCard?.category === selectedSessionCategory;
    }) : [];

    // Filter workshops based on selected category
    const filteredWorkshops = workshopData ? workshopData.filter(workshop => {
        if (selectedSessionCategory === 'all') return true;
        return workshop?.category === selectedSessionCategory;
    }) : [];

    // Scroll handling functions
    const handleGuidesScroll = () => {
        if (guidesScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = guidesScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
            setGuidesScrollProgress(progress);
        }
    };

    const handleRetreatsScroll = () => {
        if (retreatsScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = retreatsScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
            setRetreatsScrollProgress(progress);
        }
    };

    const handleSessionsScroll = () => {
        if (sessionsScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = sessionsScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
            setSessionsScrollProgress(progress);
        }
    };

    // Progress bar click handlers
    const handleGuidesProgressClick = (e) => {
        if (guidesScrollRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressBarWidth = rect.width;
            const clickProgress = (clickX / progressBarWidth) * 100;
            
            const { scrollWidth, clientWidth } = guidesScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const targetScrollLeft = (clickProgress / 100) * maxScroll;
            
            guidesScrollRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    const handleRetreatsProgressClick = (e) => {
        if (retreatsScrollRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressBarWidth = rect.width;
            const clickProgress = (clickX / progressBarWidth) * 100;
            
            const { scrollWidth, clientWidth } = retreatsScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const targetScrollLeft = (clickProgress / 100) * maxScroll;
            
            retreatsScrollRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    const handleSessionsProgressClick = (e) => {
        if (sessionsScrollRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressBarWidth = rect.width;
            const clickProgress = (clickX / progressBarWidth) * 100;
            
            const { scrollWidth, clientWidth } = sessionsScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const targetScrollLeft = (clickProgress / 100) * maxScroll;
            
            sessionsScrollRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    const sessionArray = [...filteredLiveSessions, ...filteredRecordedSessions];

    // const handleCardScroll = (dir) => {
    //     if (cardContainerRef.current) {
    //         const container = cardContainerRef.current;
    //         const newScroll =
    //             dir === "left"
    //                 ? container.scrollLeft - scrollAmount
    //                 : container.scrollLeft + scrollAmount;
    //         container.scrollTo({ left: newScroll, behavior: "smooth" });

    //         const maxScroll = container.scrollWidth - container.clientWidth;
    //         const newProgress = (newScroll / maxScroll) * 100;
    //         setProgress(newProgress);
    //     }
    // };

    useEffect(() => {
        const container = cardContainerRef.current;
        if (!container) return;

        const updateProgress = () => {
            const maxScroll = container.scrollWidth - container.clientWidth;
            const newProgress = (container.scrollLeft / maxScroll) * 100;
            setProgress(newProgress);
        };

        container.addEventListener("scroll", updateProgress);
        return () => container.removeEventListener("scroll", updateProgress);
    }, []);

    // const handleScroll = () => {
    //     const el = wrapperRef.current;
    //     const scrollRatio = el.scrollLeft / (el.scrollWidth - el.clientWidth);
    //     setLineHeight(scrollRatio * 300);
    // };

    const Controls = useAnimation();
    const [Ref, InView] = useInView({
        threshold: 0.3,
        triggerOnce: true,
    });

    useEffect(() => {
        if (InView) {
            Controls.start("visible");
        }
    }, [InView, Controls]);

    return (
        <div className="hero-section no-scrollbar">
            <SEO
                title="Urban Pilgrim | Wellness Events, Retreats & Sessions"
                description="Discover authentic wellness experiences with Urban Pilgrim. Book yoga, meditation, and holistic wellness sessions with trusted guides."
                keywords="urban pilgrim, wellness, yoga, meditation, retreats, sessions, holistic wellness, Indian wisdom"
                canonicalUrl="/"
                ogImage="/public/assets/home_page_img.png"
            />
            <HeroCarousel />
            {/* <About /> */}
            <UpComing />

            {/* Explore our program */}
            <div>
                <div className="div">
                    <Program_Explorer />
                </div>
            </div>  

            {/* content */}
            <div className="content3">
                <div className="c3container">
                    <motion.div className="c3img" initial={{ x: -100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                        <OptimizedImage src={contentImage} alt="iamge" />
                    </motion.div>
                    <motion.div className="c3text_container" initial={{ x: 100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true }}>
                        <motion.div className="datacontainer">
                            { contentFeatures &&
                                contentFeatures.map((feature, index) => (
                                    <C3_container_data key={index} imageCss="lg:max-h-[40px] lg:max-w-[30px] sm:max-h-[40px] sm:max-w-[30px] sm:mt-0 mt-1 max-h-[30px] max-w-[25px]" img={feature?.image} heading={feature?.title} content={feature?.shorttitle} />
                                ))
                            }
                        </motion.div>
                    </motion.div>
                </div>
            </div>
            
            {/* Find your Guides */}
            <div className="content6">
                <div className="meditateimg ">
                    <OptimizedImage src="/assets/meditationimg.png" alt="error" />
                </div>
                
                <div className="c6container">
                    <div className="imgover-content">
                        {/* Heading */}
                        <motion.div className="c6top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.05 }}>
                            <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>{guides?.title}</strong></div>
                            <div className="c6description" style={{ color: "#4F4F4F" }}>
                                {guides?.description
                                    ?.split(" ")
                                    .slice(0, 10)
                                    .join(" ")}...
                            
                            </div>
                        </motion.div>

                        {/* Filter and View All */}
                        <div className="flex justify-end gap-2 items-center flex-wrap mb-4">
                            <div className="flex gap-2 items-center flex-wrap">
                                {/* Category Filter Dropdown */}
                                <div className="relative group">
                                    <button
                                        onClick={() => setShowGuideCategoryDropdown(!showGuideCategoryDropdown)}
                                        className="flex items-center gap-2 text-xs md:text-sm
                                            bg-gradient-to-b from-[#C5703F] to-[#C16A00] 
                                            bg-clip-text text-transparent 
                                            border-2 border-[#C5703F] rounded-full 
                                            py-1 md:py-2 px-4 md:px-6 cursor-pointer 
                                            transition-all duration-300 
                                            group-hover:text-white hover:bg-gradient-to-b hover:from-[#C5703F] hover:to-[#C16A00] hover:bg-clip-border hover:border-white"
                                    >
                                        <span className="capitalize">
                                            {selectedGuideCategory === 'all' ? 'Categories' : selectedGuideCategory}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 text-[#C16A00] group-hover:text-white transition-transform duration-200 ${showGuideCategoryDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {showGuideCategoryDropdown && (
                                        <div className="absolute top-full left-0 mt-1 w-full min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                            {guideCategories.map((category) => (
                                                <button
                                                    key={category}
                                                    onClick={() => {
                                                        setSelectedGuideCategory(category);
                                                        setShowGuideCategoryDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg capitalize
                                                        ${selectedGuideCategory === category ? 'bg-[#C5703F] text-white font-medium' : 'text-gray-700'}`}
                                                >
                                                    {category === 'all' ? 'All Categories' : category}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* View all */}
                                <div>
                                    <ViewAll link="/pilgrim_guides" />
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div 
                                ref={guidesScrollRef}
                                className="c6bottom lg:!gap-10 lg:!overflow-visible overflow-hidden overflow-x-auto no-scrollbar"
                                onScroll={handleGuidesScroll}
                            >
                                {
                                    
                                    guideArray &&
                                    guideArray.map((guide, index) => (
                                        <motion.div key={index} initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                                            <PersondetailsCard type="guide" image={guide?.guideCard?.thumbnail} title={guide?.guideCard?.title} price={guide?.guideCard?.price} />
                                        </motion.div>
                                    ))
                                }
                            </div>

                            {/* Horizontal Progress Bar - Bottom Center */}
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 sm:hidden mb-7 z-10">
                                <div 
                                    className="w-24 h-1.5 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                                    onClick={handleGuidesProgressClick}
                                >
                                    <div 
                                        className="h-full bg-[#C5703F] rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${guidesScrollProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Book your Pilgrim Experience/Retreat */}
            <div className="content5">
                <div className="c5container">
                    {/* Heading */}
                    <motion.div className="c5top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>{Experience?.title}</strong></div>
                        <div className="c5description">
                            {Experience?.description
                                ?.split(" ")
                                .slice(0, 10)
                                .join(" ")}...
                        </div>
                    </motion.div>

                    {/* Filter and View All */}
                    <div className="flex justify-end gap-2 items-center flex-wrap mb-4">
                        <div className="flex gap-2 items-center flex-wrap">
                            {/* Category Filter Dropdown */}
                            <div className="relative group">
                                <button
                                    onClick={() => setShowRetreatCategoryDropdown(!showRetreatCategoryDropdown)}
                                    className="flex items-center gap-2 text-xs md:text-sm
                                        bg-gradient-to-b from-[#C5703F] to-[#C16A00] 
                                        bg-clip-text text-transparent 
                                        border-2 border-[#C5703F] rounded-full 
                                        py-1 md:py-2 px-4 md:px-6 cursor-pointer 
                                        transition-all duration-300 
                                        group-hover:text-white hover:bg-gradient-to-b hover:from-[#C5703F] hover:to-[#C16A00] hover:bg-clip-border hover:border-white"
                                >
                                    <span className="capitalize">
                                        {selectedRetreatCategory === 'all' ? 'Categories' : selectedRetreatCategory}
                                    </span>
                                    <ChevronDown className={`w-3 h-3 text-[#C16A00] group-hover:text-white transition-transform duration-200 ${showRetreatCategoryDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {showRetreatCategoryDropdown && (
                                    <div className="absolute top-full left-0 mt-1 w-full min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                        {retreatCategories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => {
                                                    setSelectedRetreatCategory(category);
                                                    setShowRetreatCategoryDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg capitalize
                                                    ${selectedRetreatCategory === category ? 'bg-[#C5703F] text-white font-medium' : 'text-gray-700'}`}
                                            >
                                                {category === 'all' ? 'All Categories' : category}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* View all */}
                            <div>
                                <ViewAll link="/pilgrim_retreats" />
                            </div>
                        </div>

                    </div>

                    {/* Card */}
                    <div className="relative">
                        <motion.div 
                            ref={retreatsScrollRef}
                            className="c5bottom lg:!overflow-visible overflow-x-auto no-scrollbar" 
                            initial={{ y: 100, opacity: 0 }} 
                            whileInView={{ y: 0, opacity: 1 }} 
                            transition={{ duration: 0.5, ease: "easeOut" }} 
                            viewport={{ once: true, amount: 0.1 }}
                            onScroll={handleRetreatsScroll}
                        >
                            {experienceData &&
                                experienceData.map((experience, index) => (
                                    <PersondetailsCard type="retreat" key={index} image={experience?.pilgrimRetreatCard?.image} title={experience?.pilgrimRetreatCard?.title} price={experience?.pilgrimRetreatCard?.price} />
                                ))
                            }
                        </motion.div>

                        {/* Horizontal Progress Bar - Bottom Center */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 sm:hidden mb-3 z-10">
                            <div 
                                className="w-24 h-1.5 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                                onClick={handleRetreatsProgressClick}
                            >
                                <div 
                                    className="h-full bg-[#C5703F] rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${retreatsScrollProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Find your Pilgrim Wellness Program */}
            <div className="content5 ">
                <div className="c5container">
                    {/* Heading */}
                    <motion.div className="c5top" initial={{ x: -200, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: true, amount: 0.1 }}>
                        <div className="text-2xl md:text-3xl font-bold text-left text-black"><strong>{sessions?.title}</strong></div>
                        <div className="c5description">
                            {sessions?.description
                                ?.split(" ")
                                .slice(0, 10)
                                .join(" ")}...
                        </div>
                    </motion.div>

                    {/* Filter and View All */}
                    <div className="flex justify-end gap-2 items-center flex-wrap mb-4">
                        {/* Category Filter Dropdown */}
                        <div className="relative group">
                            <button
                                onClick={() => setShowSessionCategoryDropdown(!showSessionCategoryDropdown)}
                                className="flex items-center gap-2 text-xs md:text-sm
                                    bg-gradient-to-b from-[#C5703F] to-[#C16A00] 
                                    bg-clip-text text-transparent 
                                    border-2 border-[#C5703F] rounded-full 
                                    py-1 md:py-2 px-4 md:px-6 cursor-pointer 
                                    transition-all duration-300 
                                    group-hover:text-white hover:bg-gradient-to-b hover:from-[#C5703F] hover:to-[#C16A00] hover:bg-clip-border hover:border-white"
                            >
                                <span className="capitalize">
                                    {selectedSessionCategory === 'all' ? 'Categories' : selectedSessionCategory}
                                </span>
                                <ChevronDown className={`w-3 h-3 text-[#C16A00] group-hover:text-white transition-transform duration-200 ${showSessionCategoryDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showSessionCategoryDropdown && (
                                <div className="absolute top-full left-0 mt-1 w-full min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    {sessionCategories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => {
                                                setSelectedSessionCategory(category);
                                                setShowSessionCategoryDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg capitalize
                                                ${selectedSessionCategory === category ? 'bg-[#C5703F] text-white font-medium' : 'text-gray-700'}`}
                                        >
                                            {category === 'all' ? 'All Categories' : category}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <ViewAll link="/pilgrim_sessions" />
                        </div>
                    </div>

                    {/* Card */}
                    <div className="relative">
                        <motion.div 
                            ref={sessionsScrollRef}
                            className="c5bottom overflow-x-auto no-scrollbar 
                                lg:!overflow-visible"
                            initial={{ y: 100, opacity: 0 }} 
                            whileInView={{ y: 0, opacity: 1 }} 
                            transition={{ duration: 0.5, ease: "easeOut" }} 
                            viewport={{ once: true, amount: 0.1 }}
                            onScroll={handleSessionsScroll}
                        >

                            {/* MOBILE + TABLET (default) */}
                            <div className="flex md:hidden">
                                {filteredLiveSessions?.map((session, index) => (
                                    <PersondetailsCard 
                                        type="live-session"
                                        key={`live-${index}`}
                                        image={session?.liveSessionCard?.thumbnail}
                                        title={session?.liveSessionCard?.title}
                                        price={session?.liveSessionCard?.price}
                                    />
                                ))}

                                {filteredRecordedSessions?.map((session, index) => (
                                    <PersondetailsCard 
                                        type="recorded-session"
                                        key={`recorded-${index}`}
                                        image={session?.recordedProgramCard?.thumbnail}
                                        title={session?.recordedProgramCard?.title}
                                        price={session?.recordedProgramCard?.price}
                                    />
                                ))}

                                {filteredWorkshops?.map((workshop, index) => (
                                    <PersondetailsCard 
                                        type="workshop"
                                        key={`workshop-${index}`}
                                        image={workshop?.thumbnail}
                                        title={workshop?.title}
                                        price={workshop?.price}
                                    />
                                ))}
                            </div>


                            {/* DESKTOP ONLY */}
                            <div className="hidden md:flex md:gap-15 lg:gap-20">
                                {filteredLiveSessions?.map((session, index) => (
                                    <PersondetailsCard 
                                        type="live-session"
                                        key={`live-d-${index}`}
                                        image={session?.liveSessionCard?.thumbnail}
                                        title={session?.liveSessionCard?.title}
                                        price={session?.liveSessionCard?.price}
                                    />
                                ))}

                                {filteredRecordedSessions?.map((session, index) => (
                                    <PersondetailsCard 
                                        type="recorded-session"
                                        key={`recorded-d-${index}`}
                                        image={session?.recordedProgramCard?.thumbnail}
                                        title={session?.recordedProgramCard?.title}
                                        price={session?.recordedProgramCard?.price}
                                    />
                                ))}

                                {filteredWorkshops?.map((workshop, index) => (
                                    <PersondetailsCard 
                                        type="workshop"
                                        key={`workshop-d-${index}`}
                                        image={workshop?.thumbnail}
                                        title={workshop?.title}
                                        price={workshop?.price}
                                    />
                                ))}
                            </div>

                        </motion.div>
                        
                        {/* Horizontal Progress Bar - Bottom Center */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 sm:hidden mb-3 z-10">
                            <div 
                                className="w-24 h-1.5 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                                onClick={handleSessionsProgressClick}
                            >
                                <div 
                                    className="h-full bg-[#C5703F] rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${sessionsScrollProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yoga */}
            <Highlights />

            <div className="content8">
                <C8_container_data />
            </div>
        </div>
    );
}

export default Home;
