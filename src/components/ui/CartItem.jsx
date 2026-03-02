import { useState } from "react";
import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";

export default function CartItem({
  item,
  onRemove,
  onQuantityChange,
  onPersonsChange,
}) {
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [persons, setPersons] = useState(item.persons || 1);

  // ---- QUANTITY HANDLERS ----
  // const handleIncrementQty = () => {
  //     const newQuantity = quantity + 1;
  //     setQuantity(newQuantity);
  //     onQuantityChange?.(item.id, newQuantity);
  // };

  // const handleDecrementQty = () => {
  //     if (quantity > 1) {
  //         const newQuantity = quantity - 1;
  //         setQuantity(newQuantity);
  //         onQuantityChange?.(item.id, newQuantity);
  //     }
  // };

  // ---- PERSONS HANDLERS ----
  const handleIncrementPersons = () => {
    const newPersons = persons + 1;
    setPersons(newPersons);
    onPersonsChange?.(item.id, newPersons);
  };

  const handleDecrementPersons = () => {
    if (persons > 1) {
      const newPersons = persons - 1;
      setPersons(newPersons);
      onPersonsChange?.(item.id, newPersons);
    }
  };

  const handleRemove = () => {
    onRemove?.(item.id);
  };


  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-none w-full">
      {/* Product Image/Video */}
      {(item.image && item.image.includes(".mp4")) ||
      (item.image && item.image.includes("video")) ? (
        <video
          src={item.image || item.thumbnail}
          className="w-20 h-20 rounded-md object-cover flex-shrink-0"
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <img
          src={item.image || item.thumbnail}
          alt={item.title}
          className="w-20 h-20 rounded-md object-cover flex-shrink-0"
        />
      )}

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
          {item.title}
        </h3>
        {item.meta && <p className="text-xs text-gray-500 mb-1">{item.meta}</p>}
        {item.submeta && (
          <p className="text-xs text-gray-500 mb-1">{item.submeta}</p>
        )}

        {/* Additional Details */}
        <div className="space-y-1 mb-2">
          {/* Mode (Online/Offline) */}
          {item.mode && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Mode:</span> {item.mode}
            </p>
          )}

          {/* Occupancy Type */}
          {item.occupancyType && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Occupancy:</span>{" "}
              {item.occupancyType}
            </p>
          )}

          {/* Selected Slots */}
          {item.selectedSlots && item.selectedSlots.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Slots:</span>
              <div className="mt-1 space-y-0.5">
                {item.selectedSlots.map((slot, index) => (
                  <div key={index} className="text-xs text-gray-500 pl-2">
                    •{" "}
                    {slot.date &&
                      new Date(slot.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                    {slot.startTime && slot.endTime
                      ? `(${slot.startTime} - ${slot.endTime})`
                      : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Slot (for non-array slot data) */}
          {item.slot && !item.selectedSlots && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Slot:</span>{" "}
              {item.slot.date &&
                new Date(item.slot.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
              {item.slot.startTime && item.slot.endTime
                ? `(${item.slot.startTime} - ${item.slot.endTime})`
                : ""}
            </p>
          )}
        </div>

        {/* Price persons × quantity */}
        <p className="font-bold text-sm md:text-base">
          ₹{" "}
          {(
            item.price *
            persons *
            quantity *
            (item?.duration || 1)
          ).toLocaleString()}
        </p>
        {(quantity > 1 || persons > 1) && (
          <p className="text-xs text-gray-500">
            ₹ {item?.price?.toLocaleString()}
            {quantity > 1 && persons > 1
              ? ` each × ${persons} persons × ${quantity}`
              : quantity > 1
                ? ` × ${quantity}`
                : ` each × ${persons} persons`}
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

        {/* Persons Controls */}
        <div className="flex items-center gap-1 sm:gap-2 border rounded-lg">
          <button
            onClick={handleDecrementPersons}
            disabled={persons <= 1}
            className="p-1.5 sm:p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-gray-50"
            aria-label="Decrease persons"
          >
            <FiMinus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium min-w-[1.5rem] sm:min-w-[2rem] text-center">
            {persons}
          </span>
          <button
            onClick={handleIncrementPersons}
            className="p-1.5 sm:p-2 transition-colors hover:bg-gray-50"
            aria-label="Increase persons"
          >
            <FiPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
