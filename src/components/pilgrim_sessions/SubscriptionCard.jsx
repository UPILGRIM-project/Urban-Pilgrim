import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CloudCog, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function SubscriptionCard({ bundle, onAddToCart, isHighestDiscount = false, title = "", price, handleClick = "", redirectToProgram="", programType = "session" }) {
    const userPrograms = useSelector((state) => state.userProgram);
    const navigate = useNavigate();
    const [expandedVariants, setExpandedVariants] = useState({});

    // If bundle prop is provided, use bundle mode
    if (bundle) {
        const toggleExpand = (variant) => {
            setExpandedVariants(prev => ({
                ...prev,
                [variant]: !prev[variant]
            }));
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-xl p-6 h-full ${
                    isHighestDiscount 
                        ? 'bg-gradient-to-b from-[#1C0F08] to-[#5A422D] text-white border-[3px] border-[#FFC192] shadow-[-16px_16px_18px_rgba(0,0,0,0.25)]'
                        : 'bg-gradient-to-b from-[#F9C49C] to-white border-[3px] border-[#D3C0B5]'
                }`}
            >
                {isHighestDiscount && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#BF7444] text-white text-xs font-semibold px-3 py-1 rounded-b-xl">
                        Best Deal
                    </div>
                )}

                {/* Bundle Header */}
                <div className="text-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                        isHighestDiscount ? 'bg-gradient-to-br from-[#BF7444] to-[#863D15]' : 'bg-gradient-to-br from-[#2F6288] to-[#1e4a6b]'
                    }`}>
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${
                        isHighestDiscount ? 'text-white' : 'text-gray-900'
                    }`}>{bundle.name}</h3>
                    <p className={`text-sm mb-4 ${
                        isHighestDiscount ? 'text-white/80' : 'text-gray-600'
                    }`}>{bundle.description}</p>
                </div>

                {/* Variants */}
                <div className="space-y-4">
                    {/* Variant 1 */}
                    {bundle.variant1 && bundle.variant1.programs?.length > 0 && (
                        <div className={`border rounded-lg p-4 ${
                            isHighestDiscount ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-white/50'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className={`font-semibold ${
                                    isHighestDiscount ? 'text-white' : 'text-gray-800'
                                }`}>{bundle.variant1.name}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    isHighestDiscount ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {bundle.variant1.programs.length} items
                                </span>
                            </div>

                            {/* Programs List */}
                            <div className="space-y-2 mb-3">
                                {(expandedVariants.variant1 
                                    ? bundle.variant1.programs 
                                    : bundle.variant1.programs.slice(0, 2)
                                ).map((program, index) => (
                                    <div key={index} className={`flex items-center gap-2 text-sm ${
                                        isHighestDiscount ? 'text-white/90' : 'text-gray-600'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            isHighestDiscount ? 'bg-[#BF7444]' : 'bg-[#2F6288]'
                                        }`}></div>
                                        <span className="truncate">{program.title}</span>
                                    </div>
                                ))}

                                {bundle.variant1.programs.length > 2 && (
                                    <button
                                        onClick={() => toggleExpand('variant1')}
                                        className={`text-xs hover:underline ${
                                            isHighestDiscount ? 'text-[#FFC192]' : 'text-blue-600'
                                        }`}
                                    >
                                        {expandedVariants.variant1 
                                            ? "Show less" 
                                            : `+${bundle.variant1.programs.length - 2} more`}
                                    </button>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className={`text-2xl font-bold ${
                                        isHighestDiscount ? 'text-white' : 'text-[#2F6288]'
                                    }`}>
                                        ₹{bundle.variant1.price}
                                    </div>
                                    <div className={`text-sm line-through ${
                                        isHighestDiscount ? 'text-white/60' : 'text-gray-500'
                                    }`}>
                                        ₹{bundle.variant1.totalPrice}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                        {bundle.discount}% OFF
                                    </div>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                onClick={() => onAddToCart(bundle, 'variant1')}
                                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    isHighestDiscount 
                                        ? 'bg-[#863D15] hover:bg-[#b7692f] text-white border-2 border-[#BC986A]'
                                        : 'bg-[#2F6288] text-white hover:bg-[#1e4a6b]'
                                }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Add to Cart
                            </button>
                        </div>
                    )}

                    {/* Variant 2 */}
                    {bundle.variant2 && bundle.variant2.programs?.length > 0 && (
                        <div className={`border rounded-lg p-4 ${
                            isHighestDiscount ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-white/50'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className={`font-semibold ${
                                    isHighestDiscount ? 'text-white' : 'text-gray-800'
                                }`}>{bundle.variant2.name}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    isHighestDiscount ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}>
                                    {bundle.variant2.programs.length} items
                                </span>
                            </div>

                            {/* Programs List */}
                            <div className="space-y-2 mb-3">
                                {(expandedVariants.variant2 
                                    ? bundle.variant2.programs 
                                    : bundle.variant2.programs.slice(0, 2)
                                ).map((program, index) => (
                                    <div key={index} className={`flex items-center gap-2 text-sm ${
                                        isHighestDiscount ? 'text-white/90' : 'text-gray-600'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            isHighestDiscount ? 'bg-[#BF7444]' : 'bg-[#2F6288]'
                                        }`}></div>
                                        <span className="truncate">{program.title}</span>
                                    </div>
                                ))}

                                {bundle.variant2.programs.length > 2 && (
                                    <button
                                        onClick={() => toggleExpand('variant2')}
                                        className={`text-xs hover:underline ${
                                            isHighestDiscount ? 'text-[#FFC192]' : 'text-blue-600'
                                        }`}
                                    >
                                        {expandedVariants.variant2 
                                            ? "Show less" 
                                            : `+${bundle.variant2.programs.length - 2} more`}
                                    </button>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className={`text-2xl font-bold ${
                                        isHighestDiscount ? 'text-white' : 'text-[#2F6288]'
                                    }`}>
                                        ₹{bundle.variant2.price}
                                    </div>
                                    <div className={`text-sm line-through ${
                                        isHighestDiscount ? 'text-white/60' : 'text-gray-500'
                                    }`}>
                                        ₹{bundle.variant2.totalPrice}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                        {bundle.discount}% OFF
                                    </div>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                onClick={() => onAddToCart(bundle, 'variant2')}
                                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    isHighestDiscount 
                                        ? 'bg-[#863D15] hover:bg-[#b7692f] text-white border-2 border-[#BC986A]'
                                        : 'bg-[#2F6288] text-white hover:bg-[#1e4a6b]'
                                }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Add to Cart
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // Legacy mode for non-bundle cards
    // ✅ Check if program already purchased
    const alreadyPurchased = userPrograms?.some(
        (program) => program?.title === title
    );

    // ✅ Only show a simple "View Program" card
    if (alreadyPurchased) {
        return (
            <div onClick={redirectToProgram} className="flex justify-start items-start py-4">
                <motion.div
                    className="rounded-lg w-fit text-center"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            const formattedTitle = title.replace(/\s+/g, '-').toLowerCase();
                            if (programType === "program") {
                                navigate(`/program/${formattedTitle}/slots`);
                            } else {
                                navigate(`/session/${formattedTitle}/slots`);
                            }
                        }}
                        className="w-full bg-green-600 text-white font-semibold p-3 rounded-md hover:bg-green-700 transition-colors"
                    >
                        View Program
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    const showFreeTrail = () => {
        
    }

    // ✅ Default Subscription Box if not purchased
    return (
        <div className="flex justify-start items-start py-4">
            <motion.div
                className="max-w-md w-full"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h2 className="text-xl font-bold mb-4">Subscription</h2>

                {/* Price Box */}
                <div className="border rounded-lg p-4 mb-5 bg-white">
                    <p className="text-sm font-medium text-gray-700">One Time Purchase</p>
                    <p className="text-2xl font-bold text-[#1F4B6E] mt-1">
                        {price
                            ? new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 2,
                            }).format(price)
                            : "Price not available"}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Total</p>
                </div>

                {/* Buttons */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClick}
                    className="w-full bg-[#2F5D82] text-white font-semibold py-3 rounded-md mb-3 hover:bg-[#244a67] transition-colors"
                >
                    Add to cart
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={showFreeTrail}
                    className="w-full border border-[#2F5D82] text-[#2F5D82] font-semibold py-3 rounded-md hover:bg-[#e6edf3] transition-colors"
                >
                    Get a Free Trial
                </motion.button>
            </motion.div>
        </div>
    );
}
