import { useRef } from "react";
import { useNavigate } from "react-router-dom";
// import { useDispatch } from "react-redux";

export default function GiftCardItem({ giftCard }) {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    // const [mainImage, setMainImage] = useState(giftCard.thumbnail || giftCard.mainImage);
    // const [mainImageType, setMainImageType] = useState('image');
    // const [imageError, setImageError] = useState(false);

    // const getMediaType = (url) => {
    //     if (!url) return 'image';
    //     const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    //     return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ? 'video' : 'image';
    // };

    // const handleMediaSelect = (mediaUrl) => {
    //     setMainImage(mediaUrl);
    //     setMainImageType(getMediaType(mediaUrl));
    // };

    const handlePurchase = () => {
        // Save scroll position before navigating
        if (cardRef.current) {
            const scrollPosition = window.pageYOffset;
            const cardPosition = cardRef.current.offsetTop;
            sessionStorage.setItem('giftCardScrollPosition', scrollPosition);
            sessionStorage.setItem('giftCardId', giftCard.id);
            sessionStorage.setItem('giftCardPosition', cardPosition);
        }
        navigate(`/gift-card/${giftCard.id}`);
    };

    return (
        <div ref={cardRef} className="bg-white rounded-xl shadow-[-16px_16px_18px_rgba(0,0,0,0.25)] overflow-hidden transition-shadow duration-300">
            {/* Main Media Display */}
            <div className="relative">
                <img
                    src={giftCard.thumbnail || giftCard.mainImage || "/gift_card.jpg"}
                    alt={giftCard.title}
                    className="w-full h-[210px] object-cover"
                />

                {/* Discount Badge */}
                {giftCard.priceOptions && giftCard.priceOptions[0]?.discount > 0 && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {giftCard.priceOptions[0].discount}% OFF
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4 pt-2 pb-4">
                {/* Title and Price */}
                <div>
                    <h3 className="md:text-2xl text-xl font-bold text-gray-900">
                        {giftCard.title}
                    </h3>
                    
                    <p className="text-gray-600 line-clamp-2 md:text-sm text-xs leading-relaxed">
                        {giftCard.description}
                    </p>
                </div>

                {/* Validity */}
                {/* <div className="my-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>Valid for {giftCard.validityMonths} months</span>
                    </div>
                </div> */}

                {/* Purchase Buttons */}
                <div className="mt-3 sm:mt-4 flex items-center justify-between" onClick={() => handlePurchase()}>
                    <span className="font-semibold text-[11px] sm:text-xs text-gray">From <span className="text-base sm:text-lg text-black">₹{Number(giftCard.startingPrice || 1000).toLocaleString("en-IN")}</span></span>
                    <div className="scale-95 sm:scale-100 origin-right">
                        <div className="bg-[#C5703F] inline-flex cursor-pointer items-center justify-center rounded-[29px] px-[12px] py-[12px] sm:px-[28px] border-none transition-all duration-300 max-h-[45px] w-auto hover:bg-[#a85628] hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
                            <span className="text-white text-[14px] sm:text-[18px] font-semibold font-['Poppins'] tracking-[0.5px] select-none whitespace-nowrap">
                                Buy Now
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
