import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice";
import { trackEvent } from "../../utils/metaPixel";
import { fetchAllBundles } from "../../services/bundleService";
import SubscriptionCard from "./SubscriptionCard";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function SubscriptionPlans() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const fetchedBundles = await fetchAllBundles();
      // Filter active bundles and sort by discount (highest first)
      const activeBundles = fetchedBundles
        .filter(bundle => bundle.isActive)
        .sort((a, b) => (b.discount || 0) - (a.discount || 0));
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
      bundleId: bundle.id,
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
    toast.success(`${bundle.name} added to cart!`);
  };

  const nextSlide = () => {
    if (bundles.length > 3) {
      setCurrentIndex((prev) => 
        prev + 3 >= bundles.length ? 0 : prev + 3
      );
    }
  };

  const prevSlide = () => {
    if (bundles.length > 3) {
      setCurrentIndex((prev) => 
        prev - 3 < 0 ? Math.max(0, bundles.length - 3) : prev - 3
      );
    }
  };

  const visibleBundles = bundles.slice(currentIndex, currentIndex + 3);

  return (
    <section className="px-6 py-12 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Bundle Packages & Benefits</h2>
          <p className="text-gray-600 mb-10">
            Save more with our curated wellness bundles - the perfect combination for your spiritual journey.
          </p>
        </div>

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
          <div className="relative">
            {/* Navigation Arrows */}
            {bundles.length > 3 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5 text-[#2F6288]" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5 text-[#2F6288]" />
                </button>
              </>
            )}

            {/* Horizontal Scroll Container */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4" style={{ minWidth: 'fit-content' }}>
                {visibleBundles.map((bundle, index) => (
                  <div key={bundle.id} className="flex-shrink-0 w-80">
                    <SubscriptionCard 
                      bundle={bundle}
                      onAddToCart={handleAddToCart}
                      isHighestDiscount={index === 0 && currentIndex === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Indicator */}
            {bundles.length > 3 && (
              <div className="flex justify-center mt-6">
                {Array.from({ length: Math.ceil(bundles.length / 3) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index * 3)}
                    className={`w-3 h-3 rounded-full mx-1 transition-all duration-200 ${
                      index === Math.floor(currentIndex / 3)
                        ? 'bg-[#2F6288] scale-125'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
