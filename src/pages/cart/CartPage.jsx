import { useSelector, useDispatch } from "react-redux";
import { clearCart, removeFromCart, updatePersons, updateQuantity } from "../../features/cartSlice";
import CartItem from "../../components/ui/CartItem";
import SEO from "../../components/SEO.jsx";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import CheckoutOverlay from "./CheckoutOverlay.jsx"
import { httpsCallable } from "firebase/functions";
import { functions, auth, db } from "../../services/firebase.js";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setUser } from "../../features/authSlice";
import Loader2 from "../../components/Loader2.jsx";
import { addUserPrograms } from "../../features/userProgramsSlice.js";
import { prepareCheckoutData, prepareUserProgramsData } from "../../utils/cartUtils.js";
import { reserveLiveSlotsAfterPayment } from "../../utils/liveBookingUtils";
import { validateCoupon } from "../../utils/couponUtils.js";

export default function CartPage() {
	const cartData = useSelector((state) => state.cart.items);
	const user = useSelector((state) => state.auth.user);
	const dispatch = useDispatch();
	const [showCheckout, setShowCheckout] = useState(false);
	const [loading, setLoading] = useState(false);
	const [couponCode, setCouponCode] = useState('');
	const [appliedCoupon, setAppliedCoupon] = useState(null);
	const [couponLoading, setCouponLoading] = useState(false);

	// Gift card state
	const [giftAmount, setGiftAmount] = useState(1000);
	const [giftProgramIndex, setGiftProgramIndex] = useState(-1); // -1 means any program
	const [giftLoading, setGiftLoading] = useState(false);

	// Subtotal
	const subtotal = cartData.reduce(
		(sum, item) =>
			sum +
			item.price *
			(item.persons ?? 1) *
			(item.quantity ?? 1) *
			(item.duration ?? 1),
		0
	);

	// Monthly discount applies ONLY to guide monthly items when admin has set a percent
	const monthlyDiscount = cartData.reduce((acc, item) => {
		if (
			String(item?.type).toLowerCase() !== "guide" ||
			String(item?.subscriptionType).toLowerCase() !== "monthly"
		)
			return acc;

        // Try these fields in order; prefer Firestore slides -> (mode) -> monthly -> discount
        // Support both slides[0] and slides direct object just in case
        const modeKey = String(item?.mode || '').toLowerCase(); // 'online' | 'offline'
        const rawPercent =
            item?.monthly?.discount ??
            item?.discountPercent ??
            item?.discount_percentage ??
            item?.discountPercentage ??
            item?.discount;

        const percent = Number(rawPercent);
        if (!percent || isNaN(percent) || percent <= 0) return acc;

        const lineTotal =
            item.price *
            (item.persons ?? 1) *
            (item.quantity ?? 1) *
            (item.duration ?? 1);

		const lineDiscount = Math.round(lineTotal * (percent / 100));
		return acc + lineDiscount;
	}, 0);
	const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
	const totalDiscount = monthlyDiscount + couponDiscount;
	
	// Calculate GST for each item and round up
	const gstAmount = cartData.reduce((acc, item) => {
		const lineTotal =
			item.price *
			(item.persons ?? 1) *
			(item.quantity ?? 1) *
			(item.duration ?? 1);
		
		// Get GST rate from item (default to 0 if not set)
		const gstRate = Number(item.gst || 0);
		
		// Calculate GST amount for this item
		const itemGst = (lineTotal * gstRate) / 100;
		
		return acc + itemGst;
	}, 0);
	
	// Round up GST to nearest integer (23.7 becomes 24)
	const roundedGst = Math.ceil(gstAmount);
	
	const total = subtotal - totalDiscount + roundedGst;

	const handleRemoveItem = (id) => {
		dispatch(removeFromCart(id));
		toast.success("Item removed from cart");
	};

	const handleQuantityChange = (id, quantity) => {
		dispatch(updateQuantity({ id, quantity }));
	};

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	const handleCheckout = () => {
		setShowCheckout(true);
	};

	if (cartData.length === 0) {
		return (
			<div className="min-h-screen px-4 md:px-12 py-10 mt-[100px]">
				<SEO title="Your Cart | Urban Pilgrim" description="View and manage your cart." />
				<h2 className="text-3xl font-bold mb-8">Your Cart</h2>
				<div className="text-center py-12">
					<p className="text-gray-500 text-lg">Your cart is empty</p>
				</div>
			</div>
		);
	}

	// OTP helpers wired to Cloud Functions
	const sendOtp = async (email, whatsappNumber) => {
		const sendOtpFn = httpsCallable(functions, "sendOtp");
		await sendOtpFn({ email, whatsappNumber });
		return true;
	};

	const verifyOtp = async (email, otp, whatsappNumber) => {
        try {
            const verifyOtpFn = httpsCallable(functions, "verifyOtp");
            const res = await verifyOtpFn({ email, otp });
            // Sign in using custom token
            const result = await signInWithCustomToken(auth, res.data.token);
            const user = result.user;

            // Ensure user doc exists and update WhatsApp number if changed
            const userRef = doc(db, "users", user.uid, "info", "details");
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    whatsappNumber: whatsappNumber ?? "",
                    createdAt: new Date(),
                });
            } else {
                const existingData = userSnap.data();
                if (typeof whatsappNumber !== 'undefined' && existingData.whatsappNumber !== whatsappNumber) {
                    await setDoc(userRef, { whatsappNumber }, { merge: true });
                }
            }

            // Update Redux auth user (align format with SignIn.jsx)
            dispatch(setUser({
                uid: user.uid,
                email: user.email,
                whatsappNumber: whatsappNumber ?? (userSnap?.data()?.whatsappNumber ?? ""),
            }));

            return true;
        } catch (err) {
            console.error("Cart verifyOtp failed:", err);
            return false;
        }
    };

	const handleConfirmCheckout = async (formData) => {
		try {
			// After OTP verification, user will be signed in. Guard just in case.
			if (!user) {
				toast.error("Please verify your email to continue");
				return;
			}

			// Prepare checkout data with expanded bundles and coupon info
			const checkoutData = prepareCheckoutData(cartData, formData, user);
			if (appliedCoupon) {
				checkoutData.coupon = appliedCoupon;
			}

			// 1️⃣ Create Razorpay order
			const createOrder = httpsCallable(functions, "createOrder");
			const { data: order } = await createOrder({ amount: total });

			// 2️⃣ Open Razorpay popup
			const options = {
				key: "rzp_live_3NlFfPs6Z3NcoM",
				amount: order.amount,
				currency: order.currency,
				name: "Urban Pilgrim",
				description: "Program Purchase",
				order_id: order.id,
				modal: {
					ondismiss: () => {
						// User closed the Razorpay modal; hide loader if it's showing
						setLoading(false);
					},
				},
				handler: async function (response) {
					try {
						// 3️⃣ Confirm on server with expanded cart data
						setLoading(true);
						const confirmPayment = httpsCallable(functions, "confirmPayment");

						const dataContent = await confirmPayment({
							...checkoutData,
							total,
							GiftCardCoupon: checkoutData?.coupon ?? 0,
							paymentResponse: response,
							// Send both original and expanded cart data
							cartData: checkoutData.expandedCartData, // Individual items for processing
							originalCartData: checkoutData.originalCartData // Original bundles for reference
						});

						if(dataContent?.data?.status === "error"){
							toast.error("Payment failed !");
							return;
						}

						// Reserve live session slots (AFTER payment success)
						try {
							const liveItems = (cartData || []).filter(it => it?.type === 'live' && Array.isArray(it?.slots) && it?.sessionId);
							for (const item of liveItems) {
								const occ = (item.occupancyType || '').toLowerCase();
								await reserveLiveSlotsAfterPayment(item.sessionId, occ, item.slots);
							}
						} catch (e) {
							console.error('Failed to reserve live slots after payment', e);
							// Do not block success flow; proceed
						}

						// Add programs to user's purchased programs in Redux with expiration data
						// Also attach paymentId so UserDashboard shows status as Completed immediately
						const paymentId = response?.razorpay_payment_id || 'PAID';
						const purchasedAt = new Date().toISOString();
						const userPrograms = prepareUserProgramsData(checkoutData.expandedCartData).map(p => ({
							...p,
							paymentId,
							purchasedAt,
						}));
						dispatch(addUserPrograms(userPrograms));

						dispatch(clearCart());

						// Hide loader just before showing the toast so it is visible immediately
						setLoading(false);
						toast.success("Payment successful! Programs saved.");
					} catch (err) {
						console.error(err);
						// Hide loader before showing error toast
						setLoading(false);
						toast.error("Payment confirmation failed");
					} finally {
						// No-op: loading is already handled above for success and below on error
					}
				},
				prefill: {
					name: `${formData.firstName} ${formData.lastName}`,
					email: user?.email || formData.email,
					contact: formData.whatsapp || "9999999999",
				},
				theme: { color: "#2F5D82" },
			};

			const rzp = new window.Razorpay(options);
			// Show a simple loader until the Razorpay overlay appears
			setLoading(true);
			rzp.open();
			// Also handle explicit failure callback to hide loader and notify
			rzp.on('payment.failed', function () {
				setLoading(false);
				toast.error('Payment failed');
			});
		} catch (err) {
			console.error(err);
			toast.error("Checkout failed");
		} finally {
			// Loader visibility is controlled by Razorpay callbacks (ondismiss, handler, payment.failed)
		}
	};

	const handlePersonsChange = (id, persons) => {
		dispatch(updatePersons({ id, persons }));
	};

	const handleApplyCoupon = async () => {
		if (!couponCode.trim()) {
			toast.error('Please enter a coupon code');
			return;
		}

		setCouponLoading(true);
		try {
			const result = await validateCoupon(couponCode, cartData);

			if (result.valid) {
				setAppliedCoupon({
					code: result.coupon.code,
					discount: result.discount,
					discountType: result.coupon.discountType,
					discountValue: result.coupon.discountValue,
					programType: result.coupon.programType
				});
				toast.success(`Coupon applied! You saved ₹${result.discount}`);
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			console.error('Error applying coupon:', error);
			toast.error('Failed to apply coupon');
		} finally {
			setCouponLoading(false);
		}
	};

	const handleRemoveCoupon = () => {
		setAppliedCoupon(null);
		setCouponCode('');
		toast.success('Coupon removed');
	};

	// Gift Card purchase handler
	const handlePurchaseGiftCard = async () => {
		try {
			if (!user) {
				toast.error('Please login to purchase a gift card');
				return;
			}
			setGiftLoading(true);
			const createGiftOrder = httpsCallable(functions, 'createGiftCardOrder');
			const { data: order } = await createGiftOrder({ amount: giftAmount });

			const options = {
				key: 'rzp_live_3NlFfPs6Z3NcoM',
				amount: order.amount,
				currency: order.currency,
				name: 'Urban Pilgrim',
				description: `Gift Card ₹${giftAmount}`,
				order_id: order.id,
				handler: async function (response) {
					try {
						const confirmGift = httpsCallable(functions, 'confirmGiftCardPayment');
						const selected = giftProgramIndex >= 0 ? cartData[giftProgramIndex] : null;
						await confirmGift({
							purchaserEmail: user.email,
							purchaserName: user.displayName || user.email?.split('@')[0] || 'Pilgrim',
							programTitle: selected?.title || null,
							programType: selected?.type || selected?.category || null,
							programId: selected?.id || null,
							amount: giftAmount,
							paymentResponse: response
						});
						toast.success('Gift card purchased! Code sent to your email.');
						setShowGift(false);
					} catch (err) {
						console.error(err);
						toast.error('Failed to finalize gift card');
					}
				},
				prefill: {
					name: user.displayName || '',
					email: user.email,
					contact: '9999999999',
				},
				theme: { color: '#2F5D82' }
			};

			const rzp = new window.Razorpay(options);
			rzp.open();
		} catch (e) {
			console.error('Gift card error', e);
			toast.error('Unable to purchase gift card');
		} finally {
			setGiftLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
				<div className="flex flex-col items-center gap-6">
					{/* Brand Spinner */}
					<div className="relative">
						<div className="h-16 w-16 rounded-full border-4 border-[#2F6288]/20"></div>
						<div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-t-[#2F6288] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
					</div>
					<div className="text-center max-w-md">
						<h3 className="text-xl font-semibold text-[#2F6288]">Hold on, we’re processing your payment…</h3>
						<p className="mt-2 text-gray-600 text-sm">This usually takes just a moment. Please do not close or refresh this page.</p>
					</div>
					{/* Progress bar */}
					<div className="w-56 h-2 bg-gray-200 rounded-full overflow-hidden">
						<div className="h-2 bg-[#2F6288] animate-[progress_1.4s_ease-in-out_infinite]"></div>
					</div>
					<style>{`@keyframes progress { 0% { transform: translateX(-100%)} 50% { transform: translateX(-10%)} 100% { transform: translateX(110%)} }`}</style>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 md:px-12 py-10 mt-[100px]">
			<SEO title="Your Cart | Urban Pilgrim" description="View and manage your cart." />
			<h2 className="text-3xl font-bold mb-8">Your Cart</h2>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 border border-[#00000033] rounded-xl p-4">
					{cartData.map((item) => (
						<CartItem
							key={item.id}
							item={item}
							onRemove={handleRemoveItem}
							onQuantityChange={handleQuantityChange}
							onPersonsChange={handlePersonsChange}
						/>
					))}
				</div>

				<div className="lg:col-span-1 flex flex-col">
					<div className="border border-[#00000033] rounded-xl p-6">
						<h3 className="text-xl font-semibold mb-4">Order Summary</h3>
						<div className="flex justify-between text-sm mb-2">
							<span>Subtotal</span>
							<span>₹ {subtotal.toLocaleString()}</span>
						</div>
						
						{monthlyDiscount > 0 && (
							<div className="flex justify-between text-sm mb-2">
								<span>Monthly Discount</span>
								<span className="text-red-600">−₹ {monthlyDiscount.toLocaleString()}</span>
							</div>
						)}

						<div className="flex justify-between text-sm mb-2 text-gray-700">
							<span>GST</span>
							<span>₹ {roundedGst.toLocaleString()}</span>
						</div>
						
						{/* Coupon Section */}
						<div className="mt-4 mb-4">
							{!appliedCoupon ? (
								<div className="space-y-2 flex flex-col gap-2">
									<div>
										<div className="flex flex-col sm:flex-row gap-2">
											<input
												type="text"
												value={couponCode}
												onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
												placeholder="Enter coupon code"
												className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
											/>
											<button
												onClick={handleApplyCoupon}
												disabled={couponLoading}
												className="px-4 py-2 bg-[#0c3c60] text-white rounded-md text-sm hover:bg-[#0a2d47] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
											>
												{couponLoading ? 'Applying...' : 'Apply'}
											</button>
										</div>
									</div>
								</div>
							                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm font-medium text-green-800">
                                            Coupon Applied: {appliedCoupon.code}
                                        </div>
                                        <div className="text-xs text-green-600">
                                            {appliedCoupon.discountType === 'percentage'
                                                ? `${appliedCoupon.discountValue}% off`
                                                : `₹${appliedCoupon.discountValue} off`}
                                        </div>
                                        <button
                                            onClick={handleRemoveCoupon}
                                            className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span>Coupon Discount</span>
                                        <span className="text-green-600">−₹ {couponDiscount.toLocaleString()}</span>
                                    </div>
                                </div>
							)}
						</div>

						<div className="flex justify-between font-bold text-lg mt-4 mb-6">
							<span>Total</span>
							<span>₹ {total.toLocaleString()}</span>
						</div>
						
						<button onClick={handleCheckout} className="w-full bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white py-2 rounded-full font-semibold hover:opacity-90 transition-opacity">
							Go to Checkout →
						</button>

						<div className="w-full h-[1px] bg-[#00000033] my-6"></div>

						<div className="mb-6">
							<h4 className="text-lg font-semibold mb-2">Purchase Gift Card</h4>
							<div className="flex gap-2 mb-3">
								{[1000, 2000, 5000].map(amt => (
									<button
										key={amt}
										onClick={() => setGiftAmount(amt)}
										className={`px-3 py-1 rounded-full border ${giftAmount === amt ? 'bg-[#2F6288] text-white border-[#2F6288]' : 'border-gray-300'}`}
									>
										₹{amt}
									</button>
								))}
							</div>
							<label className="block text-sm text-gray-600 mb-1">Limit to program (optional)</label>
							<select
								value={giftProgramIndex}
								onChange={(e) => setGiftProgramIndex(parseInt(e.target.value))}
								className="w-full border p-2 rounded mb-3"
							>
								<option value={-1}>Any program</option>
								{cartData.map((item, idx) => (
									<option key={item.id} value={idx}>{item.title}</option>
								))}
							</select>
							<button
								onClick={handlePurchaseGiftCard}
								disabled={giftLoading}
								className="w-full bg-[#2F6288] hover:bg-[#224b66] text-white py-2 rounded-full font-semibold disabled:opacity-60"
							>
								{giftLoading ? 'Processing...' : 'Purchase Gift Card'}
							</button>
						</div>

						{showCheckout && (
							<CheckoutOverlay
								cartData={cartData}
								total={total}
								onClose={() => setShowCheckout(false)}
								onConfirm={handleConfirmCheckout}
								isLoggedIn={!!user}
								user={user}
								sendOtp={sendOtp}
								verifyOtp={verifyOtp}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
