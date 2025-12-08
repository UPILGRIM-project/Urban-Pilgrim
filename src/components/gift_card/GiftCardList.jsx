import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import GiftCardItem from "./GiftCardItem";

export default function GiftCardList() {
    const [giftCards, setGiftCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedScrollPosition = sessionStorage.getItem('giftCardScrollPosition');
        if (savedScrollPosition) {
            // Start from top
            window.scrollTo(0, 0);
            
            setTimeout(() => {
                // Smooth scroll to the saved position
                window.scrollTo({
                    top: parseInt(savedScrollPosition),
                    behavior: 'smooth'
                });
                
                // Clean up after restoring
                setTimeout(() => {
                    sessionStorage.removeItem('giftCardScrollPosition');
                    sessionStorage.removeItem('giftCardId');
                    sessionStorage.removeItem('giftCardPosition');
                }, 1000); // Clean up after scroll animation completes
            }, 100);
        }
    }, []);

    useEffect(() => {
        const fetchGiftCards = async () => {
            try {
                setLoading(true);
                const giftCardsRef = collection(db, 'giftCards');
                const querySnapshot = await getDocs(giftCardsRef);
                
                const fetchedGiftCards = querySnapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        
                        // Only include active gift cards
                        if (!data.isActive) return null;
                        
                        return {
                            id: doc.id,
                            title: data.title || 'Untitled Gift Card',
                            description: data.description || '',
                            priceOptions: data.pricingOptions?.map(opt => ({
                                value: opt.amount,
                                originalValue: Math.round(opt.amount / (1 - opt.discount / 100)),
                                discount: opt.discount
                            })) || [],
                            startingPrice: data.pricingOptions?.[0]?.amount || 1000,
                            thumbnail: data.mainImage || '/assets/golden-mandala.png',
                            gallery: data.images?.length > 0 ? data.images : [data.mainImage || '/assets/golden-mandala.png'],
                            validityMonths: 12,
                            features: data.whatsIncluded?.filter(item => item.trim() !== '') || [
                                'Valid for all Urban Pilgrim services',
                                'Digital delivery within 24 hours'
                            ],
                            category: data.relatedItem?.type || 'any',
                            isPopular: data.isActive || false
                        };
                    })
                    .filter(card => card !== null); // Remove inactive cards
                
                setGiftCards(fetchedGiftCards);
            } catch (error) {
                console.error('Error fetching gift cards:', error);
                setGiftCards([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGiftCards();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:gap-20 gap-8">
            {giftCards.map((giftCard) => (
                <GiftCardItem key={giftCard.id} giftCard={giftCard} />
            ))}
        </div>
    );
}
