import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const validateCoupon = async (couponCode, cartData, programType = null) => {
    try {
        if (!couponCode) {
            return { valid: false, error: 'Please enter a coupon code' };
        }

        // Query for the coupon
        const couponsRef = collection(db, 'coupons');
        const q = query(couponsRef, where('code', '==', couponCode.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { valid: false, error: 'Invalid coupon code' };
        }

        const couponDoc = querySnapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() };

        // Check if coupon is active
        if (!coupon.isActive) {
            return { valid: false, error: 'This coupon is no longer active' };
        }

        // Check expiration (allow coupons without expirationDate)
        if (coupon.expirationDate) {
            const now = new Date();
            const expirationDate = new Date(coupon.expirationDate);
            if (!isNaN(expirationDate.getTime()) && expirationDate < now) {
                return { valid: false, error: 'This coupon has expired' };
            }
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return { valid: false, error: 'This coupon has reached its usage limit' };
        }

        // Check program type compatibility
        const cartProgramTypes = getCartProgramTypes(cartData);
        if (coupon.programType && !cartProgramTypes.includes(coupon.programType)) {
            return {
                valid: false,
                error: `This coupon is only valid for ${getProgramTypeLabel(coupon.programType)}`
            };
        }

        // If coupon restricts to a specific program (gift card), ensure that program exists in cart
        let applicableItems = cartData;
        if (coupon.restrictToProgram && (coupon.restrictToProgram.title || coupon.restrictToProgram.id)) {
            applicableItems = cartData.filter(item => {
                const matchById = coupon.restrictToProgram.id && item.id === coupon.restrictToProgram.id;
                const matchByTitle = coupon.restrictToProgram.title && item.title === coupon.restrictToProgram.title;
                return matchById || matchByTitle;
            });
            if (applicableItems.length === 0) {
                return { valid: false, error: 'This coupon is restricted to a specific program not present in your cart' };
            }
        }

        // Calculate subtotal for applicable items
        const applicableSubtotal = coupon.restrictToProgram
            ? applicableItems.reduce((sum, item) => sum + (item.price * (item.persons ?? 1) * (item.quantity ?? 1) * (item.duration ?? 1)), 0)
            : calculateApplicableSubtotal(cartData, coupon.programType);

        // Check minimum order amount
        if (coupon.minOrderAmount && applicableSubtotal < coupon.minOrderAmount) {
            return {
                valid: false,
                error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
            };
        }

        // Calculate discount
        const discount = calculateDiscount(applicableSubtotal, coupon);

        return {
            valid: true,
            coupon,
            discount,
            applicableSubtotal
        };

    } catch (error) {
        console.error('Error validating coupon:', error);
        return { valid: false, error: 'Failed to validate coupon. Please try again.' };
    }
};

export const calculateDiscount = (subtotal, coupon) => {
    let discount = 0;

    if (coupon.discountType === 'percentage') {
        discount = (subtotal * coupon.discountValue) / 100;
        // Apply maximum discount limit if specified
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
        }
    } else if (coupon.discountType === 'fixed') {
        discount = Math.min(coupon.discountValue, subtotal);
    }

    return Math.round(discount);
};

export const getCartProgramTypes = (cartData) => {
    const types = new Set();

    const normalize = (t) => {
        if (!t) return null;
        const s = String(t).toLowerCase();
        if (s === 'live' || s === 'live-session' || s === 'live_session') return 'live_session';
        if (s === 'recorded' || s === 'recorded-session' || s === 'recorded_session' || s === 'recordedsession') return 'recorded_session';
        if (s === 'retreat' || s === 'pilgrim_retreat' || s === 'pilgrim-retreat') return 'retreat';
        if (s === 'guide' || s === 'pilgrim_guide' || s === 'pilgrim-guide') return 'guide';
        return null;
    };

    cartData.forEach(item => {
        const t = normalize(item.type) || normalize(item.category);
        if (t) types.add(t);
    });

    return Array.from(types);
};

export const calculateApplicableSubtotal = (cartData, programType) => {
    const normalize = (t) => {
        if (!t) return null;
        const s = String(t).toLowerCase();
        if (s === 'live' || s === 'live-session' || s === 'live_session') return 'live_session';
        if (s === 'recorded' || s === 'recorded-session' || s === 'recorded_session' || s === 'recordedsession') return 'recorded_session';
        if (s === 'retreat' || s === 'pilgrim_retreat' || s === 'pilgrim-retreat') return 'retreat';
        if (s === 'guide' || s === 'pilgrim_guide' || s === 'pilgrim-guide') return 'guide';
        return null;
    };

    const target = normalize(programType);

    // If no programType is specified or not recognized, coupon applies to whole cart
    if (!target) {
        return cartData.reduce((sum, item) => {
            return sum + (item.price * (item.persons ?? 1) * (item.quantity ?? 1) * (item.duration ?? 1));
        }, 0);
    }

    return cartData
        .filter(item => {
            const t = normalize(item.type) || normalize(item.category);
            return t === target;
        })
        .reduce((sum, item) => {
            return sum + (item.price * (item.persons ?? 1) * (item.quantity ?? 1) * (item.duration ?? 1));
        }, 0);
};

export const getProgramTypeLabel = (type) => {
    const labels = {
        'live_session': 'Live Sessions',
        'recorded_session': 'Recorded Sessions',
        'retreat': 'Pilgrim Retreats',
        'guide': 'Pilgrim Guides'
    };
    return labels[type] || type;
};

export const applyCouponToCart = (cartData, coupon, discount) => {
    return {
        items: cartData,
        coupon: {
            code: coupon.code,
            discount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            programType: coupon.programType
        }
    };
};
