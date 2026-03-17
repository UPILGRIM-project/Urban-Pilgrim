import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// import { addToCart } from "../../features/cartSlice";
import { showSuccess, showError } from "../../utils/toast";
import { httpsCallable } from "firebase/functions";
import { functions, auth, db } from "../../services/firebase";
import { useSelector } from "react-redux";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setUser } from "../../features/authSlice";
import UserDetailsOverlay from "./UserDetailsOverlay";

export default function GiftCardDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const [giftCard, setGiftCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedPrice, setSelectedPrice] = useState(null);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedMediaType, setSelectedMediaType] = useState('image');

    useEffect(() => {
        const fetchGiftCard = async () => {
            try {
                setLoading(true);
                const giftCardRef = doc(db, 'giftCards', id);
                const giftCardSnap = await getDoc(giftCardRef);

                if (giftCardSnap.exists()) {
                    const data = giftCardSnap.data();

                    // Transform Firestore data to match component structure
                    const transformedGiftCard = {
                        id: giftCardSnap.id,
                        title: data.title || 'Untitled Gift Card',
                        description: data.description || '',
                        priceOptions: data.pricingOptions?.map(opt => ({
                            value: Math.round(opt.amount - (opt.amount * (opt.discount / 100))),
                            originalValue: opt.amount,
                            discount: opt.discount
                        })) || [],
                        startingPrice: data.pricingOptions?.[0]?.amount || 1000,
                        thumbnail: data.mainImage || '/assets/golden-mandala.png',
                        gallery: data.images?.length > 0 ? data.images : [data.mainImage || '/assets/golden-mandala.png'],
                        validityMonths: 12, // Default validity
                        features: data.whatsIncluded?.filter(item => item.trim() !== '') || [
                            'Valid for all Urban Pilgrim services',
                            'Digital delivery within 24 hours'
                        ],
                        category: data.relatedItem?.type || 'any',
                        relatedItemName: data.relatedItem?.name || null,
                        isPopular: data.isActive || false,
                        isActive: data.isActive || false,
                        termsAndConditions: data.termsAndConditions?.filter(term => term.trim() !== '') || [
                            'Gift card is valid for 12 months from the date of purchase',
                            'Can be used for multiple transactions until balance is exhausted',
                            'Non-refundable and cannot be exchanged for cash'
                        ]
                    };

                    setGiftCard(transformedGiftCard);

                    // Set initial selected media
                    setSelectedMedia(transformedGiftCard.thumbnail);
                    setSelectedMediaType(getMediaType(transformedGiftCard.thumbnail));

                    if (transformedGiftCard.priceOptions && transformedGiftCard.priceOptions.length > 0) {
                        setSelectedPrice(transformedGiftCard.priceOptions[0]);
                    }
                } else {
                    console.error('Gift card not found');
                    setGiftCard(null);
                }
            } catch (error) {
                console.error('Error fetching gift card:', error);
                showError('Failed to load gift card details');
                setGiftCard(null);
            } finally {
                setLoading(false);
            }
        };

        fetchGiftCard();
    }, [id]);

    const getMediaType = (url) => {
        if (!url) return 'image';
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ? 'video' : 'image';
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleBuyNow = () => {
        if (!selectedPrice) {
            showError('Please select an amount first');
            return;
        }

        setShowUserDetails(true);
    };

    const handleMediaSelect = (mediaUrl) => {
        setSelectedMedia(mediaUrl);
        setSelectedMediaType(getMediaType(mediaUrl));
    };

    // OTP helpers wired to Cloud Functions
    const sendOtp = async (email, whatsappNumber) => {
        const sendOtpFn = httpsCallable(functions, "sendOtp");
        await sendOtpFn({ email, whatsappNumber });
        return true;
    };

    const verifyOtp = async (email, otp, whatsappNumber) => {
        const verifyOtpFn = httpsCallable(functions, "verifyOtp");
        const res = await verifyOtpFn({ email, otp });
        const result = await signInWithCustomToken(auth, res.data.token);
        const user = result.user;
        // Ensure user doc exists with WhatsApp number
        const userRef = doc(db, "users", user.uid, "info", "details");
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                whatsappNumber: whatsappNumber || '',
                createdAt: new Date()
            });
            dispatch(setUser({ uid: user.uid, email: user.email, whatsappNumber: whatsappNumber || '' }));
        } else {
            dispatch(setUser({ uid: user.uid, email: user.email, whatsappNumber: userSnap.data()?.whatsappNumber }));
        }
        return true;
    };

    const handleConfirmPurchase = async (formData) => {
        try {
            // Get user email from either logged-in user or form data
            const purchaserEmail = user?.email || formData.email;
            const purchaserName = user?.displayName || `${formData.firstName} ${formData.lastName}` || purchaserEmail?.split('@')[0] || 'Pilgrim';

            if (!purchaserEmail) {
                showError("Email is required to continue");
                return;
            }

            setPurchaseLoading(true);
            setShowUserDetails(false);

            // Create order using new gift card program function
            const createOrder = httpsCallable(functions, 'createGiftCardProgramOrder');
            const { data: order } = await createOrder({
                amount: selectedPrice.value,
                giftCardType: giftCard.category,
                quantity: quantity
            });

            // Initialize Razorpay payment
            const options = {
                key: 'rzp_live_3NlFfPs6Z3NcoM', // Replace with your Razorpay key
                amount: order.amount,
                currency: order.currency,
                name: 'Urban Pilgrim',
                description: `${giftCard.title} Gift Card`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // Show processing loader
                        setProcessingPayment(true);

                        // Confirm payment and generate coupon
                        const confirmPayment = httpsCallable(functions, 'confirmGiftCardProgramPayment');
                        await confirmPayment({
                            purchaserEmail: purchaserEmail,
                            purchaserName: purchaserName,
                            giftCardType: giftCard.category,
                            giftCardTitle: giftCard.title,
                            amount: selectedPrice.value,
                            quantity: quantity,
                            paymentResponse: response,
                            billingDetails: formData  // Include full form data
                        });

                        // Hide processing loader
                        setProcessingPayment(false);

                        showSuccess(`🎉 Gift card purchased successfully`);

                        // Navigate back to gift cards list after success
                        setTimeout(() => {
                            navigate('/retreats#gift-cards');
                        }, 2000);

                    } catch (err) {
                        console.error('Payment confirmation error:', err);
                        setProcessingPayment(false);
                        showError('Failed to process gift card purchase');
                    }
                },
                prefill: {
                    name: user.displayName || '',
                    email: user.email || '',
                },
                theme: {
                    color: '#2F6288'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Gift card purchase error:', error);
            showError('Failed to initiate gift card purchase');
        } finally {
            setPurchaseLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!giftCard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Gift Card Not Found</h2>
                <button
                    onClick={() => navigate('/pilgrim_retreats')}
                    className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                >
                    Back to Retreats
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 py-10 lg:mt-[100px] mt-[50px] bg-gradient-to-r from-[#FAF4F0] to-white">
            {/* Title and Price */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center">
                    <h1 className="sm:text-4xl text-2xl font-bold capitalize">
                        {giftCard.title}
                    </h1>
                </div>
                <p className="text-2xl font-semibold text-gray-800">
                    <span className="md:text-xl text-lg">
                        Starting from ₹{Number(giftCard.startingPrice || 1000).toLocaleString("en-IN")}
                    </span>
                    {selectedPrice && selectedPrice.originalValue > selectedPrice.value && (
                        <span className="md:text-lg text-sm text-red-500 ml-2">
                            (Up to {selectedPrice.discount}% OFF)
                        </span>
                    )}
                </p>
            </div>

            {/* Image and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto px-4 md:py-10 py-4">
                {/* Image - Sticky */}
                <div className="flex-shrink-0 space-y-4 md:sticky mx-auto top-24 self-start">
                    {/* Main Image/Video Display */}
                    <div className="rounded-xl overflow-hidden">
                        {selectedMediaType === 'video' ? (
                            <video
                                src={selectedMedia || giftCard.thumbnail}
                                controls
                                className="w-full xl:h-[380px] lg:h-[280px] md:h-[210px] sm:h-[350px] object-cover"
                            />
                        ) : (
                            <img
                                src={selectedMedia || giftCard.thumbnail || "/gift_card.jpg"}
                                alt={giftCard.title}
                                className="w-full xl:h-[380px] lg:h-[280px] md:h-[210px] sm:h-[350px] object-cover"
                                onError={(e) => {
                                    e.target.src = "/gift_card.jpg";
                                }}
                            />
                        )}
                    </div>

                    {/* Gallery Thumbnails */}
                    {giftCard.gallery && giftCard.gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {giftCard.gallery.map((media, index) => {
                                const mediaType = getMediaType(media);
                                const isSelected = selectedMedia === media;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleMediaSelect(media)}
                                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-[#2F6288] shadow-lg' : 'border-gray-200 hover:border-[#2F6288]/50'
                                            }`}
                                    >
                                        {mediaType === 'video' ? (
                                            <div className="relative">
                                                <video
                                                    src={media}
                                                    className="w-full h-20 object-cover"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <img
                                                src={media}
                                                alt={`Gallery ${index + 1}`}
                                                className="w-full h-20 object-cover"
                                                onError={(e) => {
                                                    e.target.src = "/gift_card.jpg";
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Details and Purchase */}
                <div className="space-y-6">
                    {/* Description */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">About This Gift Card</h2>
                        <p className="text-gray-700 leading-relaxed">
                            {giftCard.description}
                        </p>
                    </div>

                    {/* Validity */}
                    {/* <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-[rgb(197,112,63)]/30">
                        <div className="flex items-center gap-2 text-[rgb(197,112,63)]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span className="font-semibold">Valid for {giftCard.validityMonths} months from purchase</span>
                        </div>
                    </div> */}

                    {/* Features */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">What's Included</h3>
                        <ul className="space-y-3">
                            {giftCard.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Price Selection and Purchase */}
                    <div className="border-t pt-6">
                        {/* Price Selection */}
                        {giftCard.priceOptions && (
                            <div className="mb-6">
                                <label className="font-semibold mb-3 block">Select Amount:</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {giftCard.priceOptions.map((option, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedPrice(option)}
                                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${selectedPrice?.value === option.value
                                                ? 'border-[rgb(197,112,63)] bg-gradient-to-r from-orange-50 to-red-50'
                                                : 'border-gray-200 hover:border-[rgb(197,112,63)]/50 hover:bg-gradient-to-r hover:from-orange-25 hover:to-red-25'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-xl font-bold">
                                                        ₹{option.value.toLocaleString("en-IN")}
                                                    </span>
                                                    {option.originalValue > option.value && (
                                                        <span className="text-sm text-gray-500 line-through ml-2">
                                                            ₹{option.originalValue.toLocaleString("en-IN")}
                                                        </span>
                                                    )}
                                                </div>
                                                {option.originalValue > option.value && (
                                                    <span className="bg-[rgb(197,112,63)] text-white px-2 py-1 rounded text-sm font-semibold">
                                                        {option.discount}% OFF
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="flex items-center gap-4 mb-6">
                            <label className="font-semibold text-gray-800">Quantity:</label>
                            <div className="flex items-center border border-[rgb(197,112,63)]/30 rounded-lg bg-white">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-3 py-2 transition-colors text-[rgb(197,112,63)] font-semibold"
                                >
                                    -
                                </button>
                                <span className="px-4 py-2 border-x border-[rgb(197,112,63)]/30 font-semibold text-gray-800">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="px-3 py-2 transition-colors text-[rgb(197,112,63)] font-semibold"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleBuyNow}
                                disabled={!selectedPrice || purchaseLoading}
                                className="w-full bg-[#2F6288] text-white font-semibold md:py-4 py-3 px-6 rounded-lg hover:bg-[#224b66] transition-all duration-300 transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {purchaseLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    `Buy Now - ${selectedPrice ? `₹${(selectedPrice.value * quantity).toLocaleString("en-IN")}` : 'Select Amount'}`
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    {giftCard.termsAndConditions && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold mb-3">Terms & Conditions</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {giftCard.termsAndConditions.map((term, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <span className="text-[#2F6288]">•</span>
                                        <span>{term}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* User Details Overlay */}
            {showUserDetails && (
                <UserDetailsOverlay
                    giftCard={giftCard}
                    selectedPrice={selectedPrice}
                    quantity={quantity}
                    total={(selectedPrice?.value || 0) * quantity}
                    onClose={() => setShowUserDetails(false)}
                    onConfirm={handleConfirmPurchase}
                    isLoggedIn={!!user}
                    user={user}
                    sendOtp={sendOtp}
                    verifyOtp={verifyOtp}
                />
            )}

            {/* Processing Payment Overlay */}
            {processingPayment && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
                        <h3 className="text-lg font-semibold text-gray-900">Processing Payment...</h3>
                        <p className="text-gray-600 text-center">
                            Please wait while we confirm your payment<br />
                            and generate your gift card coupon.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
