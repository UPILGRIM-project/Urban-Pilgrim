import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import Faqs from "../../components/Faqs";
import PilgrimGuide from "../../components/pilgrim_retreats/Pilgrim_Guide";
import SEO from "../../components/SEO.jsx";
import PersondetailsCard from "../../components/persondetails_card";
import ImageGallery from "../../components/pilgrim_retreats/ImageGallery.jsx";
import SubscriptionCard from "../../components/pilgrim_sessions/SubscriptionCard";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice.js"
import { showSuccess } from "../../utils/toast.js"
import { fetchAllEvents } from "../../utils/fetchEvents";
import { getProgramButtonConfig } from "../../utils/userProgramUtils";
import DOMPurify from "dompurify";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { trackEvent } from "../../utils/metaPixel";

export default function ProgramDetails() {

    const params = useParams();
    const [programData, setProgramData] = useState(null);
    const [loading, setLoading] = useState(true);
    const programId = params.programId;
    const [persons, setPersons] = useState(1);
    const [freeTrialOpen, setFreeTrialOpen] = useState(false);
    const [freeTrialIndex, setFreeTrialIndex] = useState(0);
    const [expandedVideo, setExpandedVideo] = useState(null);
    const freeTrialVideos = programData?.recordedVideo?.filter(v => v.isFreeTrail) || [];
    // const [showBundlesPopup, setShowBundlesPopup] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Get user programs from Redux
    const userPrograms = useSelector((state) => state.userProgram);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [programId]);

    const { allEvents } = useSelector((state) => state.allEvents);

    // Fetch all events if not already loaded
    useEffect(() => {
        const loadEvents = async () => {
            if (!allEvents || Object.keys(allEvents).length === 0) {
                try {
                    await fetchAllEvents(dispatch);
                } catch (error) {
                    console.error("Error fetching events:", error);
                }
            }
        };

        loadEvents();
    }, [dispatch, allEvents]);

    function normalizeSlug(str) {
        return str
            ?.toLowerCase()
            .trim()
            .replace(/\s+/g, "-")   // spaces → dashes
            .replace(/-+/g, "-");   // collapse multiple dashes
    }

    useEffect(() => {
        const fetchRecordedProgram = async () => {
            try {
                setLoading(true);
                const recordedRef = doc(db, 'pilgrim_sessions/pilgrim_sessions/sessions/recordedSession');
                const snapshot = await getDoc(recordedRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const slidesArray = Object.values(data.slides || {});

                    const found = slidesArray.find(
                        (program) => normalizeSlug(program?.recordedProgramCard?.title) === normalizeSlug(programId)
                    );

                    setProgramData(found || null);
                }
            } catch (error) {
                console.error("Error fetching recorded program:", error);
            } finally {
                setLoading(false);
            }
        };

        if (programId) fetchRecordedProgram();
    }, [programId]);

    useEffect(() => {
        if (programData?.recordedProgramCard) {
            trackEvent("ViewContent", {
                content_name: programData.recordedProgramCard.title,
                content_type: "recorded",
                content_ids: [programId],
                value: getNumericPrice() || 0,
                currency: "INR"
            });
        }
    }, [programData, programId]);


    const increment = () => setPersons((prev) => prev + 1);
    const decrement = () => setPersons((prev) => (prev > 1 ? prev - 1 : 1));

    const handleSubscriptionClick = () => {
        // Directly add to cart (bundle popup disabled)
        handleDirectAddToCart();
    };

    const handleDirectAddToCart = () => {
        if (!programData) return;

        const cartItem = {
            id: `${programData.recordedProgramCard?.title || 'recorded'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // unique id
            title: programData.recordedProgramCard?.title,
            price: getNumericPrice(),
            gst: programData.recordedProgramCard?.gst || 0,
            persons,
            image: programData?.recordedProgramCard?.thumbnail,
            quantity: 1,
            type: "recorded",
        };

        dispatch(addToCart(cartItem));
        showSuccess("Added to cart!");
    };

    const redirectToProgram = () => {
        if (!programData) return;
        // Redirect to the program details page
        navigate(`/program_details/${normalizeSlug(programData?.recordedProgramCard?.title)}`);
    };

    // Helper: get numeric base price from available fields
    const getNumericPrice = () => {
        const raw =
            programData?.oneTimeSubscription?.price ??
            programData?.recordedProgramCard?.price ??
            null;
        if (raw == null) return null;
        const num = Number(String(raw).toString().replace(/,/g, ""));
        return isNaN(num) ? null : num;
    };

    return (
        <>
            {loading ? (
                // Skeleton Loader
                <>
                    <SEO
                        title="Loading Program Details | Urban Pilgrim"
                        description="Loading recorded program details..."
                        keywords="recorded program, wellness, urban pilgrim"
                        canonicalUrl={`/program_details?id=${programId}`}
                        ogType="product"
                    />
                    
                    {/* Main content skeleton */}
                    <div className="xl:max-w-7xl lg:max-w-4xl md:max-w-[700px] mx-auto p-6 bg-gradient-to-b from-[#FAF4F0] to-white shadow-lg grid gap-6 md:mt-[100px] mt-[80px] px-4">
                        {/* Image gallery skeleton */}
                        <div className="space-y-4">
                            <div className="h-8 bg-gray-300 rounded w-64 animate-pulse"></div>
                            <div className="aspect-video bg-gray-300 rounded-lg animate-pulse"></div>
                        </div>

                        <div className="flex flex-col justify-between">
                            {/* Program details skeleton */}
                            <div className="space-y-4 text-gray-700">
                                <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
                                <div className="h-5 bg-gray-300 rounded w-32 animate-pulse"></div>
                                <div className="h-5 bg-gray-300 rounded w-40 animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                                    <div className="h-4 bg-gray-300 rounded w-5/6 animate-pulse"></div>
                                    <div className="h-4 bg-gray-300 rounded w-4/5 animate-pulse"></div>
                                </div>
                            </div>

                            {/* Subscription card skeleton */}
                            <div className="mt-6 p-6 bg-white rounded-lg shadow-sm">
                                <div className="h-6 bg-gray-300 rounded w-32 mb-4 animate-pulse"></div>
                                <div className="h-10 bg-gray-300 rounded w-full animate-pulse"></div>
                            </div>

                            {/* About program skeleton */}
                            <div className="mt-6 p-6 bg-white rounded-lg shadow-sm">
                                <div className="h-6 bg-gray-300 rounded w-40 mb-4 animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                                    <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                                </div>
                            </div>

                            {/* Videos skeleton */}
                            <div className="mt-6">
                                <div className="h-6 bg-gray-300 rounded w-32 mb-4 animate-pulse"></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                                            <div className="flex gap-3">
                                                <div className="w-20 h-16 bg-gray-300 rounded animate-pulse"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                                                    <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : programData ? (
                // Full content when data is loaded
                <>
                    <SEO
                        title={`${programData?.recordedProgramCard?.title} | Urban Pilgrim`}
                description={programData?.recordedProgramCard?.description}
                keywords={`${programData?.recordedProgramCard?.instructor}, wellness program, ${programData?.recordedProgramCard?.duration}, urban pilgrim, self-discovery, meditation, yoga`}
                canonicalUrl={`/program_details?id=${encodeURIComponent(
                    programData?.recordedProgramCard?.title?.toLowerCase()?.replace(/\s+/g, "-")
                )}`}
                ogImage={programData?.recordedProgramCard?.image}
                ogType="product"
            >
                {/* Additional structured data for programs/products */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org/",
                        "@type": "Product",
                        name: programData?.recordedProgramCard?.title,
                        description: programData?.recordedProgramCard?.description,
                        image: programData?.recordedProgramCard?.image,
                        offers: {
                            "@type": "Offer",
                            priceCurrency: "INR",
                            price: getNumericPrice() ?? undefined,
                            availability: "https://schema.org/InStock",
                        },
                        brand: {
                            "@type": "Brand",
                            name: "Urban Pilgrim",
                        },
                        instructor: {
                            "@type": "Person",
                            name: programData?.recordedProgramCard?.instructor,
                        },
                    })}
                </script>
            </SEO>

            {/* Main content */}
            <div className="xl:max-w-7xl lg:max-w-4xl md:max-w-[700px] mx-auto p-6 bg-gradient-to-b from-[#FAF4F0] to-white shadow-lg grid gap-6 md:mt-[100px] mt-[80px] px-4">
                {/* image gallery */}
                <div className="space-y-4">
                    <h2 className="md:text-2xl font-bold text-xl">
                        {programData?.recordedProgramCard?.title || "Retreat Title"}
                    </h2>
                    <ImageGallery
                        images={programData?.oneTimeSubscription?.images || []}
                        videos={programData?.oneTimeSubscription?.videos || []}
                    />

                </div>

                <div className="flex flex-col justify-between">
                    {/* Program details */}
                    <div className="space-y-4 text-gray-700">
                        {/* Price */}
                        <div className="flex text-lg font-semibold text-black">
                            <span>
                                {(() => {
                                    const p = getNumericPrice();
                                    if (p == null) return "Price not available";
                                    return `From ${new Intl.NumberFormat("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 2,
                                    }).format(p)}`;
                                })()}
                            </span>
                        </div>

                        {/* Days */}
                        <div className="flex items-center gap-2 text-sm text-[#787B7B] font-bold">
                            <img
                                src="/assets/program/package.svg"
                                alt="package"
                                className="h-4 w-4"
                            />
                            Packages:
                            <span className="px-4 py-2 bg-white rounded-lg text-black font-semibold">
                                {programData?.recordedProgramCard?.days} days
                            </span>
                        </div>

                        {/* No. of persons/session */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-[#787B7B] font-bold">
                            <img
                                src="/assets/program/people.svg"
                                alt="package"
                                className="h-4 w-4"
                            />
                            <span className="mr-1">No. of persons:</span>
                            <span className="flex items-center gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white border-[#D69A75] border rounded-full">
                                <button
                                    onClick={decrement}
                                    className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                    aria-label="Decrease persons"
                                >
                                    −
                                </button>
                                <span className="min-w-[20px] text-center">{persons}</span>
                                <button
                                    onClick={increment}
                                    className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                    aria-label="Increase persons"
                                >
                                    +
                                </button>
                            </span>
                        </div>

                        {programData?.recordedProgramCard?.description && (
                            <div
                                className="md:text-sm text-xs text-gray-700 max-w-none mt-4"
                                dangerouslySetInnerHTML={{
                                    __html: programData.recordedProgramCard.description,
                                }}
                            />
                        )}
                    </div>

                    {(() => {
                        // Get button configuration based on user ownership
                        const buttonConfig = getProgramButtonConfig(
                            userPrograms,
                            programData?.recordedProgramCard?.title,
                            'program'
                        );

                        if (buttonConfig.action === 'view') {
                            // User already owns this program - show view button
                            return (
                                <div className="space-y-4 mt-5">

                                    {/* Program Owned Card */}
                                    <div className="w-full md:inline-block md:max-w-[280px] border border-gray-300 rounded-lg p-4 bg-white">
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            <h4 className="text-lg font-medium text-gray-900">Program Owned</h4>
                                        </div>
                                        <div className="text-2xl font-bold text-[#2F6288] mb-1 text-center">
                                            ₹{getNumericPrice()?.toLocaleString() || '0'}
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4 text-center">Purchased</p>

                                        {/* View Program Button */}
                                        <div className="flex justify-center">
                                            <button
                                                className="px-6 py-2 bg-[#2F6288] text-white rounded-lg font-medium transition-all duration-200 hover:bg-[#1F4A68] hover:shadow-lg"
                                                onClick={() => {
                                                    if (programData?.recordedProgramCard?.title) {
                                                        const normalizedTitle = programData.recordedProgramCard.title
                                                            .toLowerCase()
                                                            .trim()
                                                            .replace(/\s+/g, '-');
                                                        navigate(`/program/${normalizedTitle}/slots`);
                                                    }
                                                }}
                                            >
                                                {buttonConfig.text}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // User doesn't own the program - show subscription card
                        return (
                            <SubscriptionCard
                                price={getNumericPrice()}
                                handleClick={handleSubscriptionClick}
                                title={programData?.recordedProgramCard?.title}
                                redirectToProgram={redirectToProgram}
                                programType="program"
                                hasFreeTrail={freeTrialVideos.length > 0}
                                onFreeTrialClick={() => { setFreeTrialIndex(0); setFreeTrialOpen(true); }}
                            />
                        );
                    })()}

                    {/* About the Program */}
                    {(programData?.aboutProgram?.title || programData?.aboutProgram?.shortDescription || (Array.isArray(programData?.aboutProgram?.points) && programData.aboutProgram.points.filter(Boolean).length > 0)) && (
                        <div className="md:mt-6 mt-4 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm md:p-6 p-4">
                            <h3 className="text-2xl font-bold text-[#2F6288]">
                                {programData.aboutProgram.title || "About the Program"}
                            </h3>
                            <span className="block w-16 h-[3px] bg-[#2F6288] mt-1 mb-5 rounded"></span>

                            {programData.aboutProgram.shortDescription && (
                                <div
                                    className="text-sm text-gray-700 prose prose-sm max-w-none mb-4
                                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                                        [&_li]:text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: programData.aboutProgram.shortDescription }}
                                />
                            )}

                            {Array.isArray(programData.aboutProgram.points) && programData.aboutProgram.points.filter(Boolean).length > 0 && (
                                <ul className="mt-3 space-y-2">
                                    {programData.aboutProgram.points.filter(Boolean).map((point, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#2F6288] text-white flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {programData?.recordedVideo && programData.recordedVideo.length > 0 && (
                        <div className="flex flex-col my-4">
                            <p className="text-lg font-semibold text-gray-800 mb-4">
                                Program Videos
                            </p>
                            <motion.div
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                initial={{ y: 100, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                viewport={{ once: true, amount: 0.1 }}
                            >
                                {(() => {
                                    return programData.recordedVideo.map((video, index) => {
                                        const src = video?.src || video?.url || video?.video || video?.link || '';
                                        const ytId = src.match(/[?&]v=([^&]+)/)?.[1]
                                            || src.match(/youtu\.be\/([^?&/]+)/)?.[1]
                                            || src.match(/embed\/([^?&/]+)/)?.[1];
                                        const thumbnail = video?.thumbnail || video?.image || video?.thumb
                                            || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                                        const title = video?.title || video?.name || `Video ${index + 1}`;
                                        const description = video?.description || video?.desc || '';
                                        const isExpanded = expandedVideo === index;

                                        return (
                                            <motion.div
                                                key={video.id || index}
                                                className="flex gap-3 bg-white rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                                                initial={{ y: 100, opacity: 0 }}
                                                whileInView={{ y: 0, opacity: 1 }}
                                                transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
                                                viewport={{ once: true, amount: 0.1 }}
                                                onClick={() => setExpandedVideo(isExpanded ? null : index)}
                                            >
                                                {/* Thumbnail */}
                                                <div className="relative w-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 self-start" style={{ height: '72px' }}>
                                                    {thumbnail ? (
                                                        <img
                                                            src={thumbnail}
                                                            alt={title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Text */}
                                                <div className="flex flex-col justify-start min-w-0 flex-1">
                                                    <p className={`text-sm font-semibold text-gray-800 leading-snug transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>{title}</p>
                                                    {description && (
                                                        <motion.div
                                                            initial={false}
                                                            animate={{ height: isExpanded ? 'auto' : '2.7rem', opacity: 1 }}
                                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div
                                                                className={`text-sm text-gray-500 leading-snug [&_*]:text-sm [&_p]:m-0 [&_p]:p-0 [&_ul]:m-0 [&_ol]:m-0 max-w-none ${isExpanded ? '' : 'line-clamp-2'}`}
                                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    });
                                })()}
                            </motion.div>
                        </div>
                    )}
                    
                    {/* FAQ's */}
                    {programData?.faqs && programData.faqs.length > 0 && (
                        <div className="md:mt-6 mt-4 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm md:p-6 p-4">
                            <h3 className="text-2xl font-bold text-[#2F6288]">
                                FAQ's
                            </h3>
                            <span className="block w-16 h-[3px] bg-[#2F6288] mb-5 rounded"></span>

                            <Faqs faqs={programData?.faqs} />
                        </div>
                    )}
                </div>
            </div>

            {/* Free Trial Modal */}
            {freeTrialOpen && freeTrialVideos.length > 0 && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setFreeTrialOpen(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                            <div>
                                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mr-2">FREE TRIAL</span>
                                <span className="font-semibold text-gray-800 text-sm">
                                    {freeTrialVideos[freeTrialIndex]?.title || `Video ${freeTrialIndex + 1}`}
                                </span>
                            </div>
                            <button
                                onClick={() => setFreeTrialOpen(false)}
                                className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Video player */}
                        <div className="bg-black aspect-video w-full">
                            <video
                                key={freeTrialVideos[freeTrialIndex]?.url}
                                src={freeTrialVideos[freeTrialIndex]?.url}
                                controls
                                autoPlay
                                className="w-full h-full"
                            />
                        </div>

                        {/* Description */}
                        {freeTrialVideos[freeTrialIndex]?.description && (
                            <div
                                className="px-5 py-3 text-sm text-gray-600 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(freeTrialVideos[freeTrialIndex].description) }}
                            />
                        )}

                        {/* Multi-video tabs (if more than one free trial video) */}
                        {freeTrialVideos.length > 1 && (
                            <div className="flex gap-2 px-5 pb-4 flex-wrap">
                                {freeTrialVideos.map((v, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setFreeTrialIndex(i)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${i === freeTrialIndex
                                                ? 'bg-[#C5703F] text-white border-[#C5703F]'
                                                : 'border-gray-300 text-gray-600 hover:border-[#C5703F]'
                                            }`}
                                    >
                                        {v.title || `Video ${i + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PilgrimGuide guides={programData?.guide[0]} />

            {/* You may also like */}
            <div className="max-w-7xl mx-auto pt-4 bg-white rounded-2xl grid px-4">
                <h2 className="text-3xl text-[#2F6288] font-bold ">
                    You May Also Like
                </h2>

                <motion.div
                    className="md:grid flex flex-col mx-auto lg:mx-0 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    initial={{ y: 100, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {allEvents && Object.keys(allEvents).length > 0 ? (
                        (() => {
                            const records = Object.entries(allEvents)
                                .filter(([id, data]) => (data?.type === 'recorded-session' || data?.type === 'recorded') && !!data?.upcomingSessionCard?.image);
                            const lives = Object.entries(allEvents)
                                .filter(([id, data]) => (data?.type === 'live-session' || data?.type === 'live') && !!data?.upcomingSessionCard?.image);

                            const pick = (records.length ? records : lives)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 3);

                            if (pick.length === 0) {
                                return (
                                    <>
                                        <PersondetailsCard image="/assets/Rohini_singh.png" title="Discover your true self - A 28 day program with Rohini Singh Sisodia" price="Rs.14,999.00" />
                                        <PersondetailsCard image="/assets/Anisha.png" title="Let's meditate for an hour - With Anisha" price="Rs.199.00" />
                                        <PersondetailsCard image="/assets/arati_prasad.png" title="Menopausal fitness - A 4 day regime curated by Aarti Prasad" price="Rs.4,000.00" />
                                    </>
                                );
                            }

                            return pick.map(([id, data]) => (
                                <PersondetailsCard
                                    key={id}
                                    image={data?.upcomingSessionCard?.image || '/assets/default-event.png'}
                                    title={data?.upcomingSessionCard?.title || 'Event'}
                                    price={`${data?.upcomingSessionCard?.price || '0'}`}
                                    type={records.length ? 'recorded-session' : 'live-session'}
                                />
                            ));
                        })()
                    ) : (
                        // Fallback to original cards if no events loaded
                        <>
                            <PersondetailsCard image="/assets/Rohini_singh.png" title="Discover your true self - A 28 day program with Rohini Singh Sisodia" price="Rs.14,999.00" />
                            <PersondetailsCard image="/assets/Anisha.png" title="Let's meditate for an hour - With Anisha" price="Rs.199.00" />
                            <PersondetailsCard image="/assets/arati_prasad.png" title="Menopausal fitness - A 4 day regime curated by Aarti Prasad" price="Rs.4,000.00" />
                        </>
                    )}
                </motion.div>
            </div>
        </>
            ) : (
                // Program not found
                <>
                    <SEO
                        title="Program Not Found | Urban Pilgrim"
                        description="The requested recorded program could not be found."
                        keywords="recorded program, urban pilgrim"
                        canonicalUrl={`/program_details?id=${programId}`}
                    />
                    <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF4F0] to-white px-4 pb-4 max-w-7xl mx-auto z-10 relative mt-[100px] min-h-[50vh]">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎥</div>
                            <h1 className="text-2xl font-bold text-[#2F6288] mb-2">Program Not Found</h1>
                            <p className="text-gray-600 mb-6">The recorded program you're looking for doesn't exist or has been removed.</p>
                            <a href="/pilgrim_sessions" className="inline-block px-6 py-3 bg-[#2F6288] text-white rounded-lg hover:bg-[#224b66] transition-colors">
                                Browse Programs
                            </a>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
