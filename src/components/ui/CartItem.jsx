import { useState } from "react";
import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";

export default function CartItem({ item, onRemove, onQuantityChange }) {
  const [quantity, setQuantity] = useState(item.quantity || 1);

  const handleIncrement = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onQuantityChange?.(item.id, newQuantity);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onQuantityChange?.(item.id, newQuantity);
    }
  };

  const handleRemove = () => {
    onRemove?.(item.id);
  };

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-none w-full">
      {/* Product Image */}
      <img
        src={item.img}
        alt={item.title}
        className="w-20 h-20 rounded-md object-cover flex-shrink-0"
      />

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
          {item.title}
        </h3>
        {item.meta && (
          <p className="text-xs text-gray-500 mb-1">{item.meta}</p>
        )}
        {item.submeta && (
          <p className="text-xs text-gray-500 mb-2">{item.submeta}</p>
        )}
        <p className="font-bold text-sm md:text-base">
          ₹ {(item.price * quantity).toLocaleString()}
        </p>
        {quantity > 1 && (
          <p className="text-xs text-gray-500">
            ₹ {item.price.toLocaleString()} each
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-3 flex-shrink-0">
        {/* Remove Button */}
        <button
          onClick={handleRemove}
          className="text-red-500 hover:text-red-700 transition-colors p-1"
          aria-label="Remove item"
        >
          <FiTrash2 size={18} />
        </button>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 border rounded-lg">
          <button
            onClick={handleDecrement}
            disabled={quantity <= 1}
            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease quantity"
          >
            <FiMinus size={14} />
          </button>
          <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
            {quantity}
          </span>
          <button
            onClick={handleIncrement}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="Increase quantity"
          >
            <FiPlus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
