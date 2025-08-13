import { useState } from "react";
import CartItem from "../../components/ui/CartItem";
import SEO from "../../components/SEO.jsx";

const initialCartData = [
	{
		id: 1,
		img: "https://picsum.photos/200/300",
		title: "Rejuvenate in the Himalayas – Immerse in...",
		meta: "Date Options: TBA",
		submeta: "Occupancy: Twin",
		price: 63996,
		quantity: 1,
	},
	{
		id: 2,
		img: "https://picsum.photos/200/300",
		title: "Discover your true self - A 28 day soul search...",
		meta: "Packages: 28 days",
		submeta: "",
		price: 14999,
		quantity: 1,
	},
	{
		id: 3,
		img: "https://picsum.photos/200/300",
		title: "Menopausal fitness - A 4 day regime curated...",
		meta: "Packages: 4 sessions",
		submeta: "",
		price: 4000,
		quantity: 1,
	},
];

export default function CartPage() {
	const [cartData, setCartData] = useState(initialCartData);

	const handleRemoveItem = (itemId) => {
		setCartData((prev) => prev.filter((item) => item.id !== itemId));
	};

	const handleQuantityChange = (itemId, newQuantity) => {
		setCartData((prev) =>
			prev.map((item) =>
				item.id === itemId ? { ...item, quantity: newQuantity } : item
			)
		);
	};

	const subtotal = cartData.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0
	);
	const discount = Math.round(subtotal * 0.2);
	const total = subtotal - discount;

	if (cartData.length === 0) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#f2f4fc] via-[#fdf7f1] to-[#fffaf6] px-4 md:px-12 py-10 mt-[100px]">
				<SEO 
					title="Your Cart | Urban Pilgrim"
					description="View and manage your selected wellness sessions, retreats, and programs."
					keywords="shopping cart, checkout, urban pilgrim cart"
					canonicalUrl="/cart"
					ogType="website"
				/>
				<h2 className="text-3xl font-bold mb-8">Your Cart</h2>
				<div className="text-center py-12">
					<p className="text-gray-500 text-lg">Your cart is empty</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#f2f4fc] via-[#fdf7f1] to-[#fffaf6] px-4 md:px-12 py-10 mt-[100px]">
			<SEO 
				title="Your Cart | Urban Pilgrim"
				description="View and manage your selected wellness sessions, retreats, and programs."
				keywords="shopping cart, checkout, urban pilgrim cart"
				canonicalUrl="/cart"
				ogType="website"
			/>
			<h2 className="text-3xl font-bold mb-8">Your Cart</h2>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Cart Items - 2/3 width on large screens */}
				<div className="lg:col-span-2 border border-[#00000033] rounded-xl p-4">
					{cartData.map((item) => (
						<CartItem
							key={item.id}
							item={item}
							onRemove={handleRemoveItem}
							onQuantityChange={handleQuantityChange}
						/>
					))}
				</div>

				{/* Order Summary - 1/3 width on large screens */}
				<div className="lg:col-span-1 flex flex-col">
					<div className="border border-[#00000033] rounded-xl p-6">
						<h3 className="text-xl font-semibold mb-4">Order Summary</h3>
						<div className="flex justify-between text-sm mb-2">
							<span>Subtotal</span>
							<span>₹ {subtotal.toLocaleString()}</span>
						</div>
						<div className="flex justify-between text-sm mb-2">
							<span>Discount(-20%)</span>
							<span className="text-red-600">
								−₹ {discount.toLocaleString()}
							</span>
						</div>
						<div className="w-full h-[1px] bg-[#00000033] my-6"></div>
						<div className="flex justify-between font-bold text-lg mt-4 mb-6">
							<span>Total</span>
							<span>₹ {total.toLocaleString()}</span>
						</div>
						<button className="w-full bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white py-2 rounded-full font-semibold hover:opacity-90 transition-opacity">
							Go to Checkout →
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
