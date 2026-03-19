import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Package, ArrowLeft, ArrowRight } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice";
import { trackEvent } from "../../utils/metaPixel";
import { fetchAllBundles } from "../../services/bundleService";
import "./BundlesPopup.css";

export default function BundlesPopup({ isOpen, onClose, retreatData, selectedOccupancy, persons, duration, programType = "retreat" }) {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [bundlesPerView, setBundlesPerView] = useState(3);
    const [expandedBundles, setExpandedBundles] = useState({});
    const dispatch = useDispatch();

    useEffect(() => {
        if (isOpen) {
            fetchBundles();
            updateBundlesPerView();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleResize = () => updateBundlesPerView();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const updateBundlesPerView = () => {
        if (window.innerWidth < 640) {
            setBundlesPerView(1);
        } else if (window.innerWidth < 1024) {
            setBundlesPerView(2);
        } else {
            setBundlesPerView(3);
        }
    };

    const fetchBundles = async () => {
        try {
            setLoading(true);
            const fetchedBundles = await fetchAllBundles();
            // Filter active bundles
            const activeBundles = fetchedBundles.filter(bundle => bundle.isActive);
            setBundles(activeBundles);
        } catch (error) {
            console.error("Error fetching bundles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (bundle, variant) => {
        const cartItem = {
            id: `${bundle.id}-${variant}`,
            title: `${bundle.name} - ${bundle[variant]?.name}`,
            price: parseFloat(bundle[variant]?.price || 0),
            image: bundle.image || "/assets/package.svg",
            type: "bundle",
            bundleId: bundle?.id,
            variant: variant,
            originalPrice: bundle[variant]?.totalPrice || 0,
            discount: bundle.discount || 0,
            programs: bundle[variant]?.programs || []
        };
        
        dispatch(addToCart(cartItem));
        try {
            trackEvent("AddToCart", {
                content_name: cartItem.title,
                content_type: cartItem.type,
                content_ids: [cartItem.id],
                value: cartItem.price,
                currency: "INR",
            });
        } catch (e) {
            console.warn("Meta Pixel trackEvent failed:", e);
        }
        onClose();
    };

    const nextSlide = () => {
        if (bundles.length > bundlesPerView) {
            setCurrentIndex((prev) => 
                prev + bundlesPerView >= bundles.length ? 0 : prev + bundlesPerView
            );
        }
    };

    const prevSlide = () => {
        if (bundles.length > bundlesPerView) {
            setCurrentIndex((prev) => 
                prev - bundlesPerView < 0 ? Math.max(0, bundles.length - bundlesPerView) : prev - bundlesPerView
            );
        }
    };

    const toggleExpand = (bundleId, variant) => {
        setExpandedBundles(prev => ({
            ...prev,
            [`${bundleId}-${variant}`]: !prev[`${bundleId}-${variant}`]
        }));
    };      

    const visibleBundles = bundles.slice(currentIndex, currentIndex + bundlesPerView);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-2 sm:p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2F6288] to-[#1e4a6b] text-white p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Package className="w-6 h-6 sm:w-8 sm:h-8" />
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-bold">Bundles</h2>
                                    <p className="text-blue-100 text-sm sm:text-base hidden sm:block">Save more with our curated bundles</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-2 sm:p-6 flex-1 overflow-y-auto bundles-popup-scroll">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
                            </div>
                        ) : bundles.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No bundles available</h3>
                                <p className="text-gray-500">Check back later for special offers!</p>
                            </div>
                        ) : (
                            <>
                                {/* Bundle Carousel */}
                                <div className="relative">
                                    {/* Navigation Arrows */}
                                    {bundles.length > bundlesPerView && (
                                        <>
                                            <button
                                                onClick={prevSlide}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                                            >
                                                <ArrowLeft className="w-5 h-5 text-[#2F6288]" />
                                            </button>
                                            <button
                                                onClick={nextSlide}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                                            >
                                                <ArrowRight className="w-5 h-5 text-[#2F6288]" />
                                            </button>
                                        </>
                                    )}

                                    {/* Bundles Grid */}
                                    <div className="grid gap-3 sm:gap-6" style={{ 
                                        gridTemplateColumns: `repeat(${bundlesPerView}, 1fr)` 
                                    }}>
                                        {visibleBundles.map((bundle) => (
                                            <motion.div
                                                key={bundle.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 min-h-0 overflow-hidden"
                                            >
                                                {/* Bundle Header */}
                                                <div className="text-center mb-2 sm:mb-4">
                                                    <div className="w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2F6288] to-[#1e4a6b] rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-3">
                                                        <Package className="w-4 h-4 sm:w-8 sm:h-8 text-white" />
                                                    </div>
                                                    <h3 className="text-sm sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2">{bundle.name}</h3>
                                                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 hidden sm:block">{bundle.description}</p>
                                                </div>

                                                {/* Variants */}
                                                <div className="space-y-2 sm:space-y-4">
                                                    {/* Variant 1 */}
                                                    {bundle.variant1 && bundle.variant1.programs?.length > 0 && (
                                                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                                                            <div className="flex items-center justify-between mb-1 sm:mb-3">
                                                                <h4 className="font-semibold text-gray-800 text-xs sm:text-base truncate pr-1 flex-1">{bundle.variant1.name}</h4>
                                                                <span className="text-xs bg-green-100 text-green-800 px-1 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                                                                    {bundle.variant1.programs.length}
                                                                </span>
                                                            </div>
                                                            {/* Variant 1 Programs */}
                                                            <div className="space-y-0.5 sm:space-y-2 mb-1 sm:mb-3">
                                                                {(expandedBundles[`${bundle.id}-variant1`] 
                                                                    ? bundle.variant1.programs 
                                                                    : bundle.variant1.programs.slice(0, 2)
                                                                ).map((program, index) => (
                                                                    <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs text-gray-600">
                                                                        <div className="w-1 h-1 sm:w-2 sm:h-2 bg-[#2F6288] rounded-full flex-shrink-0"></div>
                                                                        <span className="truncate text-xs">{program.title}</span>
                                                                    </div>
                                                                ))}

                                                                {bundle.variant1.programs.length > 2 && (
                                                                    <button
                                                                        onClick={() => toggleExpand(bundle.id, "variant1")}
                                                                        className="text-xs text-blue-600 hover:underline text-center w-full"
                                                                    >
                                                                        {expandedBundles[`${bundle.id}-variant1`] 
                                                                            ? "Show less" 
                                                                            : `+${bundle.variant1.programs.length - 2} more`}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between mb-1 sm:mb-3">
                                                                <div className="text-left">
                                                                    <div className="text-sm sm:text-2xl font-bold text-[#2F6288]">
                                                                        ₹{bundle.variant1.price}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 line-through">
                                                                        ₹{bundle.variant1.totalPrice}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-xs sm:text-lg font-bold text-green-600">
                                                                        {bundle.discount}% OFF
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddToCart(bundle, 'variant1')}
                                                                className="w-full bg-[#2F6288] text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-md sm:rounded-lg hover:bg-[#1e4a6b] transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
                                                            >
                                                                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                <span className="hidden sm:inline">Add to Cart</span>
                                                                <span className="sm:hidden">Add</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Variant 2 */}
                                                    {bundle?.variant2 && bundle?.variant2?.programs?.length > 0 && (
                                                        <div className="border border-gray-200 rounded-md sm:rounded-lg p-2 sm:p-4">
                                                            <div className="flex items-center justify-between mb-1 sm:mb-3">
                                                                <h4 className="font-semibold text-gray-800 text-xs sm:text-base truncate pr-1 flex-1">{bundle.variant2.name}</h4>
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-1 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                                                                    {bundle.variant2.programs.length}
                                                                </span>
                                                            </div>
                                                            {/* Variant 2 Programs */}
                                                            <div className="space-y-0.5 sm:space-y-2 mb-1 sm:mb-3">
                                                                {(expandedBundles[`${bundle.id}-variant2`] 
                                                                    ? bundle.variant2.programs 
                                                                    : bundle.variant2.programs.slice(0, 2)
                                                                ).map((program, index) => (
                                                                    <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs text-gray-600">
                                                                    <div className="w-1 h-1 sm:w-2 sm:h-2 bg-[#2F6288] rounded-full flex-shrink-0"></div>
                                                                    <span className="truncate text-xs">{program.title}</span>
                                                                    </div>
                                                                ))}

                                                                {bundle?.variant2?.programs?.length > 2 && (
                                                                    <button
                                                                    onClick={() => toggleExpand(bundle.id, "variant2")}
                                                                    className="text-xs text-blue-600 hover:underline text-center w-full"
                                                                    >
                                                                    {expandedBundles[`${bundle.id}-variant2`] 
                                                                        ? "Show less" 
                                                                        : `+${bundle.variant2.programs.length - 2} more`}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between mb-1 sm:mb-3">
                                                                <div className="text-left">
                                                                    <div className="text-sm sm:text-2xl font-bold text-[#2F6288]">
                                                                        ₹{bundle.variant2.price}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 line-through">
                                                                        ₹{bundle.variant2.totalPrice}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-xs sm:text-lg font-bold text-green-600">
                                                                        {bundle.discount}% OFF
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddToCart(bundle, 'variant2')}
                                                                className="w-full bg-[#2F6288] text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-md sm:rounded-lg hover:bg-[#1e4a6b] transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
                                                            >
                                                                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                <span className="hidden sm:inline">Add to Cart</span>
                                                                <span className="sm:hidden">Add</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Dots Indicator */}
                                    {bundles.length > bundlesPerView && (
                                        <div className="flex justify-center mt-6">
                                            {Array.from({ length: Math.ceil(bundles.length / bundlesPerView) }).map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentIndex(index * bundlesPerView)}
                                                    className={`w-3 h-3 rounded-full mx-1 transition-all duration-200 ${
                                                        index === Math.floor(currentIndex / bundlesPerView)
                                                            ? 'bg-[#2F6288] scale-125'
                                                            : 'bg-gray-300 hover:bg-gray-400'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-2 sm:px-6 py-3 sm:py-5 border-t flex-shrink-0">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                                <p className="font-medium">
                                    {retreatData?.pilgrimRetreatCard?.title || "Spiritual Program"}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                <button
                                    onClick={onClose}
                                    className="px-3 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-base"
                                >
                                    Browse More Options
                                </button>
                                <button
                                    onClick={() => {
                                        // Add program to cart directly for all supported types
                                        if (retreatData) {
                                            const derivedPrice =
                                                (selectedOccupancy?.price ?? null) ||
                                                (retreatData?.pilgrimRetreatCard?.price ?? null) ||
                                                0;

                                            const derivedImage =
                                                retreatData?.oneTimePurchase?.images?.[0] ||
                                                retreatData?.oneTimeSubscription?.images?.[0] ||
                                                retreatData?.pilgrimRetreatCard?.image ||
                                                "/assets/retreats.svg";

                                            const cartItem = {
                                                id: retreatData.id || `${programType}-${Date.now()}`,
                                                title: retreatData.pilgrimRetreatCard?.title || "Program",
                                                price: derivedPrice,
                                                image: derivedImage,
                                                type: programType,
                                                persons: persons || 1,
                                                duration: duration || 1,
                                                location: retreatData.pilgrimRetreatCard?.location,
                                            };
                                            dispatch(addToCart(cartItem));
                                            onClose();
                                        }
                                    }}
                                    className="px-3 sm:px-6 py-2 bg-[#2F6288] text-white rounded-lg hover:bg-[#1e4a6b] transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
                                >
                                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Add Program to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
