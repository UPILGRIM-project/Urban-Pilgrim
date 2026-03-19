import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../features/cartSlice";
import { showSuccess, showError } from "../../utils/toast";
import { trackEvent } from "../../utils/metaPixel";

export default function WorkshopPrograms() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const workshops = useSelector((state) => state.workshops.workshops);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 1000);
    }, []);

    const handleAddToCart = (workshop) => {
        try {
            const cartItem = {
                id: workshop.id,
                title: workshop.title,
                price: workshop.price,
                thumbnail: workshop.thumbnail,
                category: 'workshop',
                type: 'workshop',
                quantity: 1,
                minPerson: workshop.minPerson,
                maxPerson: workshop.maxPerson,
                extraPersonPrice: workshop.extraPersonPrice
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
            showSuccess(`${workshop.title} added to cart!`);
        } catch (error) {
            console.error('Add to cart error:', error);
            showError('Failed to add workshop to cart');
        }
    };

    const handleBookNow = (workshop) => {
        handleAddToCart(workshop);
        navigate('/cart');
    };

    const getMediaType = (url) => {
        if (!url) return 'image';
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ? 'video' : 'image';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
            </div>
        );
    }

    if (!workshops || workshops.length === 0) {
        return (
            <div className="px-4 py-10 bg-gradient-to-r from-[#FAF4F0] to-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Workshops Coming Soon</h2>
                    <p className="text-gray-600 mb-8">We're preparing amazing workshop experiences for you.</p>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-10 bg-gradient-to-r from-[#FAF4F0] to-white">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 mb-10">
                <div className="text-center">
                    <h1 className="sm:text-4xl text-2xl font-bold text-gray-900 mb-4">
                        Workshop Programs
                    </h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        Transform your skills with our hands-on workshop experiences. Learn from experts and connect with like-minded individuals.
                    </p>
                </div>
            </div>

            {/* Workshops Grid */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {workshops.map((workshop, index) => (
                        <div key={workshop.id || index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                            {/* Workshop Image/Video */}
                            <div className="relative h-48 overflow-hidden">
                                {getMediaType(workshop.thumbnail) === 'video' ? (
                                    <video
                                        src={workshop.thumbnail}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        src={workshop.thumbnail || '/assets/workshop-placeholder.jpg'}
                                        alt={workshop.title}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                
                                {/* Popular Badge */}
                                {workshop.isPopular && (
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-[#2F6288] text-white px-3 py-1 rounded-full text-sm font-semibold">
                                            Popular
                                        </span>
                                    </div>
                                )}

                                {/* Price Badge */}
                                <div className="absolute top-3 right-3">
                                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                                        ₹{Number(workshop.price || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            </div>

                            {/* Workshop Details */}
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                                    {workshop.title || 'Untitled Workshop'}
                                </h3>
                                
                                <p className="text-gray-600 mb-4 line-clamp-3">
                                    {workshop.description || 'Workshop description coming soon...'}
                                </p>

                                {/* Workshop Info */}
                                <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {workshop.minPerson || 1}-{workshop.maxPerson || '∞'} people
                                        </span>
                                        
                                        {workshop.images && workshop.images.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {workshop.images.length} photos
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Extra Person Price */}
                                {workshop.extraPersonPrice && (
                                    <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg border border-[rgb(197,112,63)]/30 mb-4">
                                        <div className="flex items-center gap-2 text-[rgb(197,112,63)]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                            </svg>
                                            <span className="text-sm font-semibold">
                                                +₹{Number(workshop.extraPersonPrice).toLocaleString("en-IN")} per extra person
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Variants */}
                                {workshop.variants && workshop.variants.length > 1 && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">{workshop.variants.length} variants available</span>
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAddToCart(workshop)}
                                        className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={() => handleBookNow(workshop)}
                                        className="flex-1 bg-[#2F6288] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#224b66] transition-colors"
                                    >
                                        Book Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Call to Action */}
            <div className="max-w-4xl mx-auto px-4 mt-16 text-center">
                <div className="bg-gradient-to-r from-[#2F6288] to-[#1e4a6b] rounded-2xl p-8 text-white">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">
                        Ready to Transform Your Skills?
                    </h2>
                    <p className="text-lg mb-6 opacity-90">
                        Join our workshop community and unlock your potential with expert-led sessions.
                    </p>
                    <button
                        onClick={() => navigate('/contact')}
                        className="bg-white text-[#2F6288] font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Contact Us for Custom Workshops
                    </button>
                </div>
            </div>
        </div>
    );
}
