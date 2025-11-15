import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../features/cartSlice";
import { showSuccess, showError } from "../../utils/toast";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function WorkshopDetails() {
    const { title } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);

    const [workshop, setWorkshop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mainImage, setMainImage] = useState("");
    const [mainImageType, setMainImageType] = useState("image");
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [participants, setParticipants] = useState(1);
    const [expandedGuides, setExpandedGuides] = useState({});
    const [requestStatus, setRequestStatus] = useState("initial"); // initial, pending, approved, rejected
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestData, setRequestData] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [title]);

    useEffect(() => {
        const fetchWorkshopByTitle = async () => {
            try {
                setLoading(true);

                // Fetch all workshops from database
                const workshopsCollection = collection(db, "workshops");
                const workshopsSnapshot = await getDocs(workshopsCollection);
                const workshopsList = workshopsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Find workshop by title (URL slug format)
                const foundWorkshop = workshopsList.find(
                    (w) => w.title?.replace(/\s+/g, "-").toLowerCase() === title,
                );

                if (foundWorkshop) {
                    setWorkshop(foundWorkshop);
                    setMainImage(foundWorkshop.thumbnail || foundWorkshop.images?.[0]);
                    setSelectedVariant(foundWorkshop.variants?.[0] || null);
                    setParticipants(parseInt(foundWorkshop.minPerson) || 1);

                    // Check request status from database
                    if (user) {
                        checkRequestStatusFromDB(foundWorkshop.id, user.uid);
                    }
                } else {
                    showError("Workshop not found");
                }
            } catch (error) {
                console.error("Error fetching workshop:", error);
                showError("Failed to load workshop details");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkshopByTitle();
    }, [title, user]);

    const checkRequestStatusFromDB = async (workshopId, userId) => {
        try {
            const getRequestStatus = httpsCallable(
                functions,
                "getWorkshopRequestStatusByWorkshop",
            );
            const result = await getRequestStatus({ workshopId, userId });

            if (result.data && result.data.length > 0) {
                // Sort by requestId to get the most recent (requestId contains timestamp)
                const sortedRequests = result.data.sort((a, b) =>
                    b.requestId.localeCompare(a.requestId),
                );
                const latestRequest = sortedRequests[0];
                setRequestStatus(latestRequest.status);
                setRequestData(latestRequest);
            } else {
                setRequestStatus("initial");
            }
        } catch (error) {
            console.error("Error checking request status:", error);
            setRequestStatus("initial");
        }
    };

    const checkRequestStatus = async (requestId) => {
        try {
            const getRequestStatus = httpsCallable(
                functions,
                "getWorkshopRequestStatus",
            );
            const result = await getRequestStatus({ requestId });

            if (result.data.status !== "initial") {
                setRequestStatus(result.data.status);
                setRequestData(result.data.requestData);
            }
        } catch (error) {
            console.error("Error checking request status:", error);
            // Don't show error to user, just keep initial status
        }
    };

    const getMediaType = (url) => {
        if (!url) return "image";
        const videoExtensions = [".mp4", ".mov", ".avi", ".webm"];
        return videoExtensions.some((ext) => url.toLowerCase().includes(ext))
            ? "video"
            : "image";
    };

    const handleMediaSelect = (media) => {
        setMainImage(media);
        setMainImageType(getMediaType(media));
    };

    const toggleGuideExpansion = (index) => {
        setExpandedGuides((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const handleMakeRequest = () => {
        if (!user) {
            showError("Please login to make a request");
            return;
        }
        setShowRequestModal(true);
    };

    const handleRequestSubmit = async (formData) => {
        if (!user) {
            alert("Please sign in before submitting request");
            return;
        }
        try {
            setLoading(true);
            setRequestStatus("pending");
            setRequestData(formData);
            setShowRequestModal(false);

            // Call Firebase function to submit request
            const submitRequest = httpsCallable(functions, "submitWorkshopRequest");
            const result = await submitRequest({
                userId: user?.uid,
                workshop: {
                    id: workshop.id,
                    title: workshop.title,
                    price: workshop.price,
                },
                variant: selectedVariant,
                participants,
                ...formData,
            });

            if (result.data.success) {
                setRequestStatus("pending");
                showSuccess(
                    "Request submitted successfully! You will be notified via email once reviewed.",
                );
                // Refresh the status from database
                if (user) {
                    checkRequestStatusFromDB(workshop.id, user.uid);
                }
            } else {
                throw new Error(result.data.message || "Failed to submit request");
            }
        } catch (error) {
            console.error("Error submitting request:", error);
            showError("Failed to submit request. Please try again.");
            setRequestStatus("initial");
        } finally {
            setLoading(false);
        }
    };

    const getButtonText = () => {
        switch (requestStatus) {
            case "initial":
                return "Make a Request";
            case "pending":
                return "Request Pending";
            case "approved":
                return "Book Now";
            case "rejected":
                return "Make a Request";
            default:
                return "Make a Request";
        }
    };

    const getButtonAction = () => {
        switch (requestStatus) {
            case "initial":
                return handleMakeRequest;
            case "pending":
                return () => showError("Please wait for admin approval");
            case "approved":
                return handleAddToCart;
            case "rejected":
                return handleMakeRequest;
            default:
                return handleMakeRequest;
        }
    };

    const calculateTotalPrice = () => {
        const basePrice = Number(workshop.price || 0);
        const extraPersons = Math.max(0, participants - (workshop.minPerson || 1));
        const extraCost = extraPersons * Number(workshop.extraPersonPrice || 0);
        return basePrice + extraCost;
    };

    const handleAddToCart = () => {
        try {
            const cartItem = {
                id: workshop.id,
                title: workshop.title,
                price: calculateTotalPrice(),
                gst: workshop.gst || 0,
                thumbnail: workshop.thumbnail,
                category: "workshop",
                type: "workshop",
                quantity: 1,
                participants: participants,
                selectedVariant: selectedVariant?.name || "Standard",
                minPerson: workshop.minPerson,
                maxPerson: workshop.maxPerson,
                organizer:
                    workshop.guide && workshop.guide.length > 0
                        ? workshop.guide[0]
                        : null,
            };

            dispatch(addToCart(cartItem));
            showSuccess(`${workshop.title} added to cart!`);
        } catch (error) {
            console.error("Add to cart error:", error);
            showError("Failed to add workshop to cart");
        }
    };

    const handleBookNow = () => {
        handleAddToCart();
        navigate("/cart");
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
            </div>
        );
    }

    if (!workshop) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Workshop Not Found
                </h2>
                <button
                    onClick={() => navigate("/sessions")}
                    className="bg-[#2F6288] text-white px-6 py-3 rounded-lg hover:bg-[#224b66] transition-colors"
                >
                    Back to Sessions
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 lg:py-10 py-6 md:mt-[100px] mt-[70px] bg-gradient-to-r from-[#FAF4F0] to-white">
            {/* Title and Price */}
            <div className="max-w-7xl mx-auto ">
                <div className="flex items-center">
                    <h1 className="lg:text-4xl sm:text-3xl text-2xl font-bold">
                        {workshop.title}
                    </h1>
                </div>
                <p className="lg:text-2xl md:text-xl text-lg font-semibold text-gray-800">
                    <span className="md:text-xl text-lg">
                        From ₹{Number(workshop.price || 0).toLocaleString("en-IN")}
                    </span>
                </p>
            </div>

            {/* Image and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto md:py-10 py-4">
                {/* Image - Sticky */}
                <div className="flex-shrink-0 space-y-4 md:sticky mx-auto top-24 self-start">
                    {/* Main Media Display */}
                    {mainImageType === "video" ? (
                        <video
                            src={mainImage || workshop.thumbnail}
                            controls
                            autoPlay
                            muted
                            className="rounded-xl xl:h-[400px] xl:w-[700px] md:h-[450px] sm:h-[480px] object-cover"
                            preload="metadata"
                        >
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <img
                            src={mainImage || workshop.thumbnail}
                            alt={workshop.title}
                            className="rounded-xl xl:h-[400px] xl:w-[700px] md:h-[450px] sm:h-[480px] object-cover"
                        />
                    )}

                    {/* Gallery Media Thumbnails */}
                    {(workshop.images?.length > 0 || workshop.videos?.length > 0) && (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {/* Images */}
                            {workshop.images?.map((image, index) => (
                                <img
                                    key={`img-${index}`}
                                    src={image}
                                    alt={`Gallery ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleMediaSelect(image)}
                                />
                            ))}

                            {/* Videos */}
                            {workshop.videos?.map((video, index) => {
                                const videoUrl = typeof video === 'string' ? video : video.url;
                                return (
                                    <div key={`vid-${index}`} className="relative">
                                        <video
                                            src={videoUrl}
                                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                            muted
                                            preload="metadata"
                                            playsInline
                                            onClick={() => handleMediaSelect(videoUrl)}
                                            onLoadedMetadata={(e) => {
                                                e.target.currentTime = 1;
                                            }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                                </svg>
                                            </div>
                                        </div>
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
                        <h2 className="lg:text-2xl text-xl font-bold mb-4">
                            About This Workshop
                        </h2>
                        <div
                            className="text-gray-700 leading-relaxed prose prose-sm max-w-none lg:text-base md:text-sm text-xs"
                            dangerouslySetInnerHTML={{
                                __html:
                                    workshop.description || "Workshop description coming soon...",
                            }}
                        />
                    </div>

                    {/* Participants Info */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-[rgb(193,106,0)]/30">
                        <div className="flex items-center gap-2 text-[rgb(193,106,0)]">
                            <svg
                                className="md:w-5 md:h-5 h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span className="font-semibold lg:text-base md:text-sm text-xs">
                                Participants: {workshop.minPerson || 1} -{" "}
                                {workshop.maxPerson || "∞"} people
                            </span>
                        </div>
                    </div>

                    {/* Variant Selection and Purchase */}
                    <div className="border-t pt-6">
                        {/* Variant Selection */}
                        {workshop.variants && workshop.variants.length > 1 && (
                            <div className="mb-6">
                                <label className="font-semibold mb-3 block">
                                    Select Variant:
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    {workshop.variants.map((variant, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`border-2 rounded-lg lg:p-4 md:p-3 p-2 cursor-pointer transition-all duration-200 ${selectedVariant?.name === variant.name
                                                    ? "border-[rgb(193,106,0)] bg-orange-50"
                                                    : "border-gray-200 hover:border-[rgb(193,106,0)]/50"
                                                }`}
                                        >
                                            <span className="font-semibold lg:text-base md:text-sm text-xs">
                                                {variant.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Participants and Buttons */}
                        <div className="flex flex-col lg:flex-row md:flex-col sm:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                            {/* Participants */}
                            <div className="flex items-center justify-between gap-4">
                                <label className="font-semibold text-gray-800">
                                    Participants:
                                </label>
                                <span className="flex items-center gap-2 px-2 sm:px-4 py-1 bg-white border-[#c16a00] border rounded-full">
                                    <button
                                        onClick={() =>
                                            setParticipants(
                                                Math.max(workshop.minPerson || 1, participants - 1),
                                            )
                                        }
                                        className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                        aria-label="Decrease persons"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-[20px] text-center">
                                        {participants}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setParticipants(
                                                workshop.maxPerson
                                                    ? Math.min(workshop.maxPerson, participants + 1)
                                                    : participants + 1,
                                            )
                                        }
                                        className="px-1 sm:px-2 text-base sm:text-lg font-bold"
                                        aria-label="Increase persons"
                                    >
                                        +
                                    </button>
                                </span>
                            </div>

                            {/* Button */}
                            <div className="md:flex-1">
                                <button
                                    onClick={getButtonAction()}
                                    disabled={requestStatus === "pending"}
                                    className={`w-full font-semibold md:py-4 py-3 px-6 rounded-full transition-colors ${requestStatus === "pending"
                                            ? "bg-gray-400 text-white cursor-not-allowed"
                                            : "bg-[#c16a00]/90 text-white hover:bg-[rgba(193,93,5,0.95)]"
                                        }`}
                                >
                                    {getButtonText()}
                                </button>

                                {/* Status Messages */}
                                {requestStatus === "approved" && (
                                    <p className="text-green-600 text-sm mt-2 animate-pulse font-semibold">
                                        ✅ Your request is approved! You can now book.
                                    </p>
                                )}
                                {requestStatus === "rejected" && (
                                    <p className="text-red-600 text-sm mt-2 animate-pulse font-semibold">
                                        ❌ Your request was rejected. Please try with another venue
                                        or variant.
                                    </p>
                                )}
                                {requestStatus === "pending" && (
                                    <p className="text-orange-600 text-sm mt-2 animate-pulse font-semibold">
                                        ⏳ Request pending admin approval...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Session Description */}
                    {workshop.sessionDescription && (
                        <div>
                            <h3 className="text-xl font-bold mb-4">Session Details</h3>
                            <div
                                className="text-gray-700 xl:text-base text-sm leading-relaxed prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: workshop.sessionDescription,
                                }}
                            />
                        </div>
                    )}

                    {/* Workshop Variants */}
                    {workshop.sessionTopics && workshop.sessionTopics.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold mb-6">Workshop Variants</h3>
                            <div className="grid gap-4">
                                {workshop.sessionTopics.map((topic, index) => (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-r from-orange-50 to-amber-50 border border-[#c16a00]/20 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#c16a00] text-white rounded-full flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-[#c16a00] lg:text-lg text-base mb-2">
                                                    {topic.title}
                                                </h4>
                                                {topic.description && (
                                                    <div
                                                        className="text-gray-700 md:text-sm text-xs leading-relaxed prose prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{
                                                            __html: topic.description,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Guide Information - Full Width */}
            {workshop.guide && workshop.guide.length > 0 && (
                <div className="max-w-7xl mx-auto">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {workshop.guide[0].title}
                    </h4>
                    <div className="grid gap-6">
                        {workshop.guide.map((guide, index) => (
                            <div key={index} className="md:flex items-start gap-6 ">
                                {guide.image && (
                                    <img
                                        src={guide.image}
                                        alt={guide.title}
                                        className="md:w-2/5 lg:aspect-[3/4] md:aspect-[2.5/4] mx-auto rounded-lg object-cover flex-shrink-0"
                                    />
                                )}
                                <div className="flex-1 md:mt-0 mt-5">
                                    {/* Mobile: Truncated text with See More/Less */}
                                    <div className="md:hidden">
                                        <div
                                            className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: expandedGuides[index]
                                                    ? guide.description
                                                    : `${guide.description?.slice(0, 350)}${guide.description?.length > 350 ? "..." : ""}`,
                                            }}
                                        />
                                        {guide.description?.length > 350 && (
                                            <button
                                                onClick={() => toggleGuideExpansion(index)}
                                                className="text-[#c16a00] text-sm font-semibold mt-2 hover:underline"
                                            >
                                                {expandedGuides[index] ? "See Less" : "See More"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Desktop: Full text */}
                                    <div className="hidden md:block">
                                        <div
                                            className="text-gray-700 xl:text-base lg:text-sm md:text-xs
                                        lg:leading-relaxed md:leading-normal prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: guide.description }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <RequestModal
                    workshop={workshop}
                    selectedVariant={selectedVariant}
                    participants={participants}
                    user={user}
                    onSubmit={handleRequestSubmit}
                    onClose={() => setShowRequestModal(false)}
                />
            )}
        </div>
    );
}

// Request Modal Component
function RequestModal({
    workshop,
    selectedVariant,
    participants,
    user,
    onSubmit,
    onClose,
}) {
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        mobile: "",
        address: "",
        venue: "",
        venueAddress: "",
        preferredDate: "",
        preferredTime: "",
        additionalNotes: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (
            !formData.name ||
            !formData.email ||
            !formData.mobile ||
            !formData.venue ||
            !formData.venueAddress
        ) {
            alert("Please fill in all required fields");
            return;
        }

        const requestData = {
            ...formData,
            workshop: {
                id: workshop.id,
                title: workshop.title,
                price: workshop.price,
            },
            variant: selectedVariant,
            participants,
            requestedAt: new Date().toISOString(),
        };

        onSubmit(requestData);
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Workshop Request
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Workshop Details Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold mb-2">Workshop Details:</h3>
                        <p>
                            <strong>Title:</strong> {workshop.title}
                        </p>
                        <p>
                            <strong>Participants:</strong> {participants}
                        </p>
                        {selectedVariant && (
                            <p>
                                <strong>Variant:</strong> {selectedVariant.name}
                            </p>
                        )}
                        <p>
                            <strong>Price:</strong> ₹
                            {Number(workshop.price || 0).toLocaleString("en-IN")}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Personal Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mobile Number *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => handleChange("mobile", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Venue Information */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Preferred Venue Name *
                            </label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={(e) => handleChange("venue", e.target.value)}
                                placeholder="e.g., Community Center, Hotel Conference Room"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Venue Address *
                            </label>
                            <textarea
                                value={formData.venueAddress}
                                onChange={(e) => handleChange("venueAddress", e.target.value)}
                                placeholder="Complete address with city, state, and pincode"
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Preferred Schedule */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Preferred Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.preferredDate}
                                    onChange={(e) =>
                                        handleChange("preferredDate", e.target.value)
                                    }
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Preferred Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.preferredTime}
                                    onChange={(e) =>
                                        handleChange("preferredTime", e.target.value)
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Notes
                            </label>
                            <textarea
                                value={formData.additionalNotes}
                                onChange={(e) =>
                                    handleChange("additionalNotes", e.target.value)
                                }
                                placeholder="Any special requirements or additional information"
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c16a00] focus:border-transparent"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-[#c16a00] text-white rounded-full hover:bg-[rgba(193,93,5,0.95)] transition-colors"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
