import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice.js";
import { showSuccess } from "../../utils/toast.js";

export default function CalendarModal({
  isOpen,
  onClose,
  sessionData,
  selectedPlan,
  mode,
  availableSlots = [],
  personsPerBooking = 1,
  occupancyType = "",
  capacityMax = 0,
  quantity = 1,
  onAddToCart,
}) {
  // Dynamic mode with default fallback
  const dynamicMode = mode || "Online";

  // Dynamic occupancy type with default fallback
  const dynamicOccupancyType = (occupancyType || "individual").toLowerCase();

  if (sessionData && mode && selectedPlan) {
    const plan = sessionData[mode.toLowerCase()]?.[selectedPlan];
  }
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotsMulti, setSelectedSlotsMulti] = useState([]); // multi-select for one-time and monthly
  const [localSlots, setLocalSlots] = useState([]);
  const [view, setView] = useState("monthly"); // keep monthly as main canvas
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const userPrograms = useSelector((state) => state.userProgram);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots();
    }
  }, [isOpen, availableSlots, dynamicMode, selectedPlan]);

  const fetchAvailableSlots = async () => {
    // Use slots passed from parent component instead of fetching
    if (availableSlots.length > 0) {
      // Process parent slots to ensure they have the available property
      const processedParentSlots = availableSlots.map((slot, index) => ({
        id:
          slot.id ||
          `parent-${slot.date}-${slot.time || slot.startTime}-${index}`,
        date: slot.date,
        time: slot.time || slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        available: true, // All slots are available since booking tracking is not implemented
        duration: slot.duration || 60,
        ...slot,
      }));
      setLocalSlots(processedParentSlots);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fallback: Get slots from session data if no slots passed from parent
      const modeKey =
        dynamicMode.toLowerCase() === "online" ? "onlineSlots" : "offlineSlots";
      const slots = sessionData?.session?.[modeKey] || [];

      // Process slots into the expected format
      const processedSlots = slots.map((slot, index) => ({
        id: `data-${slot.date}-${slot.startTime}-${index}`,
        date: slot.date,
        time: slot.startTime || slot.time,
        endTime: slot.endTime,
        location: slot.location,
        available: true, // All slots are available since booking tracking is not implemented
        duration: slot.duration || 60,
        ...slot,
      }));

      setLocalSlots(processedSlots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setLocalSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMultipleToCart = () => {
    if (!sessionData || selectedSlotsMulti.length === 0) return;

    const modeKey = dynamicMode?.toLowerCase();
    const subscriptionKey = selectedPlan; // 'oneTime'
    const plan = sessionData[modeKey]?.[subscriptionKey];
    // Get price based on occupancy type from occupancies array
    let price;
    if (plan?.occupancies && Array.isArray(plan.occupancies)) {
      const occupancy = plan.occupancies.find(
        (occ) =>
          occ.type?.toLowerCase() === dynamicOccupancyType?.toLowerCase(),
      );
      price = occupancy ? Number(occupancy.price) : plan?.price || 0;
    } else {
      // Fallback to old structure if occupancies array doesn't exist
      if (
        dynamicOccupancyType === "couple" ||
        dynamicOccupancyType === "couples"
      ) {
        price = plan?.couplesPrice || plan?.price || 0;
      } else if (dynamicOccupancyType === "group") {
        price = plan?.groupPrice || plan?.price || 0;
      } else {
        price = plan?.individualPrice || plan?.price || 0;
      }
    }

    selectedSlotsMulti.forEach((slot) => {
      const cartItem = {
        id: `${sessionData?.guideCard?.title}-${slot.id}`,
        title: sessionData?.guideCard?.title,
        price: price,
        gst: sessionData?.guideCard?.gst || 0,
        persons: Math.max(1, Number(personsPerBooking || 1)),
        image: sessionData?.guideCard?.thumbnail,
        quantity: quantity || 1,
        type: "guide",
        mode: dynamicMode,
        subscriptionType: selectedPlan,
        occupancyType: occupancyType || "individual",
        organizer: sessionData?.organizer,
        slot: slot,
        date: slot.date,
        timestamp: new Date().toISOString(),
      };

      // Use parent onAddToCart if provided, otherwise dispatch
      if (typeof onAddToCart === "function") {
        onAddToCart(cartItem);
      } else {
        dispatch(addToCart(cartItem));
      }
    });

    showSuccess(`${selectedSlotsMulti.length} slot(s) added to cart!`);
    onClose();
    resetModal();
  };

  const handleAddMonthlyToCart = () => {
    if (!sessionData || selectedSlotsMulti.length === 0) return;

    const modeKey = dynamicMode?.toLowerCase();
    const subscriptionKey = selectedPlan; // 'monthly'
    const plan = sessionData[modeKey]?.[subscriptionKey];
    // Get price based on occupancy type from occupancies array
    let price;
    if (plan?.occupancies && Array.isArray(plan.occupancies)) {
      const occupancy = plan.occupancies.find(
        (occ) =>
          occ.type?.toLowerCase() === dynamicOccupancyType?.toLowerCase(),
      );
      price = occupancy ? Number(occupancy.price) : plan?.price || 0;
    } else {
      // Fallback to old structure if occupancies array doesn't exist
      if (
        dynamicOccupancyType === "couple" ||
        dynamicOccupancyType === "couples"
      ) {
        price = plan?.couplesPrice || plan?.price || 0;
      } else if (dynamicOccupancyType === "group") {
        price = plan?.groupPrice || plan?.price || 0;
      } else {
        price = plan?.individualPrice || plan?.price || 0;
      }
    }

    const cartItem = {
      id: `${sessionData?.guideCard?.title}-monthly-${Date.now()}`,
      title: sessionData?.guideCard?.title,
      price: price, // monthly price
      gst: sessionData?.guideCard?.gst || 0,
      persons: 1,
      image: sessionData?.guideCard?.thumbnail,
      quantity: quantity || 1,
      type: "guide",
      mode: dynamicMode,
      subscriptionType: selectedPlan,
      organizer: sessionData?.organizer,
      selectedSlots: selectedSlotsMulti.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.time || s.startTime,
        endTime: s.endTime,
        location: s.location,
        rowIdx: s.rowIdx,
        tIdx: s.tIdx,
        type: s.type,
      })),
      timestamp: new Date().toISOString(),
    };
    dispatch(addToCart(cartItem));

    showSuccess(
      `${selectedSlotsMulti.length} session(s) scheduled and added to cart!`,
    );
    onClose();
    resetModal();
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const hasAvailableSlots = (day) => {
    if (!day) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return localSlots.some((slot) => slot.date === dateStr && slot.available);
  };

  const getNextAvailableSlot = () => {
    const availableSlot = localSlots.find((slot) => slot.available);
    if (availableSlot) {
      const date = new Date(availableSlot.date);
      return {
        date: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: availableSlot.time,
      };
    }
    return null;
  };

  const getSlotsForDate = (dateStr) => {
    // Filter out one-time slots that the current user has already purchased
    const slots = localSlots.filter((slot) => slot.date === dateStr);
    if (selectedPlan !== "oneTime") return slots;
    const title = sessionData?.guideCard?.title || "";
    const purchasedSet = new Set(
      (userPrograms || [])
        .filter(
          (p) =>
            p.type === "guide" &&
            p.subscriptionType === "oneTime" &&
            p.title === title,
        )
        .map((p) => `${p.slotDate}|${p.slotStart}|${p.slotEnd}`),
    );
    return slots.filter(
      (s) =>
        !purchasedSet.has(`${s.date}|${s.startTime || s.time}|${s.endTime}`),
    );
  };

  // Compute current enrolled counts from sessionData.slotBookings
  const getSlotBookings = () => {
    try {
      const modeKey = dynamicMode?.toLowerCase();
      const subKey = selectedPlan;
      const plan = sessionData?.[modeKey]?.[subKey] || {};
      return plan.slotBookings && typeof plan.slotBookings === "object"
        ? plan.slotBookings
        : {};
    } catch {
      return {};
    }
  };
  const slotBookings = getSlotBookings();

  // Retrieve first-booker occupancy locks per slot
  const getSlotLocks = () => {
    try {
      const modeKey = dynamicMode?.toLowerCase();
      const subKey = selectedPlan;
      const plan = sessionData?.[modeKey]?.[subKey] || {};
      return plan.slotLocks && typeof plan.slotLocks === "object"
        ? plan.slotLocks
        : {};
    } catch {
      return {};
    }
  };
  const slotLocks = getSlotLocks();

  // Compute per-slot price and running total for one-time purchases
  const getPerSlotPrice = () => {
    try {
      const modeKey = dynamicMode?.toLowerCase();
      const subscriptionKey = "oneTime";
      const plan = sessionData?.[modeKey]?.[subscriptionKey];
      // Get price based on occupancy type from occupancies array
      let price;
      if (plan?.occupancies && Array.isArray(plan.occupancies)) {
        const occupancy = plan.occupancies.find(
          (occ) =>
            occ.type?.toLowerCase() === dynamicOccupancyType?.toLowerCase(),
        );
        price = occupancy ? Number(occupancy.price) : plan?.price || 0;
      } else {
        // Fallback to old structure if occupancies array doesn't exist
        if (
          dynamicOccupancyType === "couple" ||
          dynamicOccupancyType === "couples"
        ) {
          price = plan?.couplesPrice || plan?.price || 0;
        } else if (dynamicOccupancyType === "group") {
          price = plan?.groupPrice || plan?.price || 0;
        } else {
          price = plan?.individualPrice || plan?.price || 0;
        }
      }
      const p = Number(price || 0);
      return isNaN(p) ? 0 : p;
    } catch {
      return 0;
    }
  };
  const oneTimeTotal =
    selectedPlan === "oneTime"
      ? selectedSlotsMulti.length * getPerSlotPrice()
      : 0;

  const handleDateClick = (day) => {
    if (!day || !hasAvailableSlots(day)) return;

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const handleSlotSelect = (slot) => {
    // For one-time and monthly, support multi-select
    if (selectedPlan === "quarterly") {
      // keep legacy single select if quarterly flows exist
      setSelectedSlot(slot);
      setView("confirmation");
      return;
    }
    setSelectedSlotsMulti((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      if (exists) return prev.filter((s) => s.id !== slot.id);

      // Enforce monthly selection cap if provided
      if (selectedPlan === "monthly") {
        const modeKey = dynamicMode?.toLowerCase();
        const max = Number(sessionData?.[modeKey]?.monthly?.sessionsCount || 0);
        if (max > 0 && prev.length >= max) return prev; // ignore if limit reached
      }
      return [...prev, slot];
    });
  };

  const handleAddToCart = () => {
    if (!sessionData || !selectedSlot) {
      return;
    }

    // Get the price based on mode, subscription type, and occupancy
    const modeKey = dynamicMode?.toLowerCase(); // "online" or "offline"
    const subscriptionKey = selectedPlan; // "monthly", "quarterly", "oneTime"
    const plan = sessionData[modeKey]?.[subscriptionKey];
    // Get price based on occupancy type from occupancies array
    let price;
    if (plan?.occupancies && Array.isArray(plan.occupancies)) {
      const occupancy = plan.occupancies.find(
        (occ) =>
          occ.type?.toLowerCase() === dynamicOccupancyType?.toLowerCase(),
      );
      price = occupancy ? Number(occupancy.price) : plan?.price || 0;
    } else {
      // Fallback to old structure if occupancies array doesn't exist
      if (
        dynamicOccupancyType === "couple" ||
        dynamicOccupancyType === "couples"
      ) {
        price = plan?.couplesPrice || plan?.price || 0;
      } else if (dynamicOccupancyType === "group") {
        price = plan?.groupPrice || plan?.price || 0;
      } else {
        price = plan?.individualPrice || plan?.price || 0;
      }
    }

    const cartItem = {
      id: `${sessionData?.guideCard?.title}-${selectedSlot.id}`, // unique id
      title: sessionData?.guideCard?.title,
      price: price,
      gst: sessionData?.guideCard?.gst || 0,
      persons: 1, // default to 1 person
      image: sessionData?.guideCard?.thumbnail,
      quantity: quantity || 1,
      type: "guide",
      mode: dynamicMode,
      subscriptionType: selectedPlan,
      organizer: sessionData?.organizer,
      slot: selectedSlot,
      date: selectedDate,
      timestamp: new Date().toISOString(),
    };

    dispatch(addToCart(cartItem));
    showSuccess("Added to cart!");

    onClose();
    resetModal();
  };

  const resetModal = () => {
    setView("monthly");
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  if (!isOpen) return null;

  // const nextSlot = getNextAvailableSlot();
  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {sessionData?.session?.title || "Book Your Session"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {dynamicMode} -{" "}
              {selectedPlan === "monthly" ? "Monthly" : "One Time"} Plan
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Occupancy: {dynamicOccupancyType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
            </div>
          ) : (
            <>
              {/* Monthly View with right-side slot panel */}
              {view === "monthly" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <FiChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-semibold">{monthName}</h3>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <FiChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div
                            key={day}
                            className="p-2 text-center text-sm font-medium text-gray-500"
                          >
                            {day}
                          </div>
                        ),
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentDate).map((day, index) => (
                        <button
                          key={index}
                          onClick={() => handleDateClick(day)}
                          disabled={!day || !hasAvailableSlots(day)}
                          className={`p-2 text-center text-sm rounded transition-colors ${
                            !day
                              ? "invisible"
                              : hasAvailableSlots(day)
                                ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                                : "text-gray-300 cursor-not-allowed"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right-side Slots Panel */}
                  <div className="space-y-4">
                    {!selectedDate ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">
                          Available Slots
                        </h4>
                        <p className="text-sm text-gray-600">
                          Select a date on the calendar to view and pick slots.
                          You can select multiple dates and slots.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800">
                            Slots on{" "}
                            {new Date(selectedDate).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </h4>
                          <button
                            onClick={() => setSelectedDate(null)}
                            className="text-sm text-[#2F6288] hover:underline"
                          >
                            Clear date
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getSlotsForDate(selectedDate).map((slot) => {
                            const start = slot.startTime || slot.time;
                            const key = `${slot.date}|${start}|${slot.endTime}`;
                            const booked = Number(slotBookings[key] || 0);
                            const cap = Number(capacityMax || 0);
                            const lock = (slotLocks[key] || "")
                              .toString()
                              .toLowerCase();
                            const occ = (dynamicOccupancyType || "")
                              .toString()
                              .toLowerCase();
                            const isSelected = selectedSlotsMulti.some(
                              (s) => s.id === slot.id,
                            );
                            let disabled = false;
                            if (selectedPlan === "monthly") {
                              const modeKey = dynamicMode?.toLowerCase();
                              const max = Number(
                                sessionData?.[modeKey]?.monthly
                                  ?.sessionsCount || 0,
                              );
                              disabled =
                                max > 0 &&
                                !isSelected &&
                                selectedSlotsMulti.length >= max;
                            } else if (selectedPlan === "oneTime") {
                              if (cap > 0 && booked >= cap) disabled = true;
                              // Enforce lock: if another occupancy booked first, block others
                              if (!disabled && lock && occ && lock !== occ) {
                                disabled = true;
                              }
                            }
                            return (
                              <button
                                key={slot.id}
                                onClick={() =>
                                  !disabled && handleSlotSelect(slot)
                                }
                                className={`p-4 rounded-lg border-2 transition-all ${isSelected ? "border-[#2F6288] bg-blue-50" : disabled ? "border-gray-200 bg-gray-100 cursor-not-allowed" : "border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100"}`}
                                disabled={disabled}
                              >
                                <div className="text-left">
                                  <p className="font-semibold text-green-800">
                                    {slot.time}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {slot.duration} minutes
                                  </p>
                                  {selectedPlan === "oneTime" && cap > 0 && (
                                    <p className="text-xs mt-1 text-gray-600">
                                      Enrolled: {booked}/{cap}
                                    </p>
                                  )}
                                  {selectedPlan === "monthly" &&
                                    (() => {
                                      const modeKey =
                                        dynamicMode?.toLowerCase();
                                      const type = slot.type || "individual";
                                      const gMax =
                                        Number(
                                          sessionData?.[modeKey]?.monthly
                                            ?.groupMax || 0,
                                        ) || 0;
                                      const capMonthly =
                                        type === "couple"
                                          ? 2
                                          : type === "group"
                                            ? gMax
                                            : 0;
                                      const enrolled = Number(
                                        slot.bookedCount || 0,
                                      );
                                      if (
                                        (type === "couple" && capMonthly > 0) ||
                                        (type === "group" && capMonthly > 0)
                                      ) {
                                        return (
                                          <p className="text-xs mt-1 text-gray-600">
                                            Enrolled: {enrolled}/{capMonthly}
                                          </p>
                                        );
                                      }
                                      return null;
                                    })()}
                                  {selectedPlan === "oneTime" && lock && (
                                    <p className="text-xs mt-1 text-amber-700">
                                      Locked for: {lock}
                                    </p>
                                  )}
                                  <p
                                    className={`text-xs mt-1 ${isSelected ? "text-blue-700" : disabled ? "text-gray-400" : "text-green-600"}`}
                                  >
                                    {isSelected
                                      ? "Selected"
                                      : disabled
                                        ? "Full"
                                        : "Available"}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Info text above footer */}
                        <div className="mt-4 text-xs sm:text-sm text-gray-600">
                          {selectedPlan === "oneTime" ? (
                            <>
                              <span>The slots are already booked</span>
                            </>
                          ) : (
                            (() => {
                              const modeKey = dynamicMode?.toLowerCase();
                              const max = Number(
                                sessionData?.[modeKey]?.monthly
                                  ?.sessionsCount || 0,
                              );
                              if (max > 0) {
                                return (
                                  <span>{`You can select up to ${max} session${max > 1 ? "s" : ""} this month.`}</span>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>

                        {/* Footer actions for selections */}
                        <div className="mt-6 space-y-3">
                          {/* Occupancy Price Display */}
                          {selectedSlotsMulti.length > 0 && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">
                                  Occupancy:{" "}
                                  <span className="font-medium text-gray-900 capitalize">
                                    {dynamicOccupancyType}
                                  </span>
                                </span>
                                <span className="text-lg font-bold text-[#2F6288]">
                                  ₹
                                  {(() => {
                                    const modeKey = dynamicMode?.toLowerCase();
                                    const subscriptionKey = selectedPlan;
                                    const plan =
                                      sessionData[modeKey]?.[subscriptionKey];

                                    // Get price based on occupancy type from occupancies array
                                    let price;
                                    if (
                                      plan?.occupancies &&
                                      Array.isArray(plan.occupancies)
                                    ) {
                                      const occupancy = plan.occupancies.find(
                                        (occ) =>
                                          occ.type?.toLowerCase() ===
                                          dynamicOccupancyType?.toLowerCase(),
                                      );
                                      price = occupancy
                                        ? Number(occupancy.price)
                                        : plan?.price || 0;
                                    } else {
                                      // Fallback to old structure if occupancies array doesn't exist
                                      if (
                                        dynamicOccupancyType === "couple" ||
                                        dynamicOccupancyType === "couples"
                                      ) {
                                        price =
                                          plan?.couplesPrice ||
                                          plan?.price ||
                                          0;
                                      } else if (
                                        dynamicOccupancyType === "group"
                                      ) {
                                        price =
                                          plan?.groupPrice || plan?.price || 0;
                                      } else {
                                        price =
                                          plan?.individualPrice ||
                                          plan?.price ||
                                          0;
                                      }
                                    }
                                    price = Number(price || 0);
                                    if (selectedPlan === "oneTime") {
                                      // For one-time: price × slots × quantity
                                      return (
                                        price *
                                        selectedSlotsMulti.length *
                                        quantity
                                      ).toLocaleString();
                                    } else {
                                      // For monthly: just the plan price
                                      return price.toLocaleString();
                                    }
                                  })()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                                <span>
                                  {selectedSlotsMulti.length} slot
                                  {selectedSlotsMulti.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                  selected
                                  {selectedPlan === "monthly" &&
                                    (() => {
                                      const modeKey =
                                        dynamicMode?.toLowerCase();
                                      const max = Number(
                                        sessionData?.[modeKey]?.monthly
                                          ?.sessionsCount || 0,
                                      );
                                      return max > 0 ? (
                                        <span> / {max}</span>
                                      ) : null;
                                    })()}
                                </span>
                                {selectedPlan === "oneTime" && quantity > 1 && (
                                  <span>
                                    ₹
                                    {(() => {
                                      const plan =
                                        sessionData[
                                          dynamicMode?.toLowerCase()
                                        ]?.[selectedPlan];
                                      let price;
                                      if (
                                        plan?.occupancies &&
                                        Array.isArray(plan.occupancies)
                                      ) {
                                        const occupancy = plan.occupancies.find(
                                          (occ) =>
                                            occ.type?.toLowerCase() ===
                                            dynamicOccupancyType?.toLowerCase(),
                                        );
                                        price = occupancy
                                          ? Number(occupancy.price)
                                          : plan?.price || 0;
                                      } else {
                                        // Fallback to old structure if occupancies array doesn't exist
                                        if (
                                          dynamicOccupancyType === "couple" ||
                                          dynamicOccupancyType === "couples"
                                        ) {
                                          price =
                                            plan?.couplesPrice ||
                                            plan?.price ||
                                            0;
                                        } else if (
                                          dynamicOccupancyType === "group"
                                        ) {
                                          price =
                                            plan?.groupPrice ||
                                            plan?.price ||
                                            0;
                                        } else {
                                          price =
                                            plan?.individualPrice ||
                                            plan?.price ||
                                            0;
                                        }
                                      }
                                      return Number(
                                        price || 0,
                                      ).toLocaleString();
                                    })()}{" "}
                                    × {selectedSlotsMulti.length} × {quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex justify-end">
                            {selectedPlan === "oneTime" ? (
                              <button
                                onClick={handleAddMultipleToCart}
                                disabled={selectedSlotsMulti.length === 0}
                                className="px-4 py-3 bg-[#2F6288] text-white rounded-lg disabled:opacity-50 font-semibold"
                              >
                                Add {selectedSlotsMulti.length || ""} Slot
                                {selectedSlotsMulti.length === 1 ? "" : "s"} to
                                Cart
                              </button>
                            ) : selectedPlan === "monthly" ? (
                              <button
                                onClick={handleAddMonthlyToCart}
                                disabled={selectedSlotsMulti.length === 0}
                                className="px-4 py-3 bg-[#2F6288] text-white rounded-lg disabled:opacity-50 font-semibold"
                              >
                                Save {selectedSlotsMulti.length || ""} Session
                                {selectedSlotsMulti.length === 1 ? "" : "s"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Daily View */}
              {view === "daily" && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => setView("monthly")}
                      className="flex items-center gap-2 text-[#2F6288] hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <FiArrowLeft className="w-4 h-4" />
                      Back to Calendar
                    </button>
                    <h3 className="text-lg font-semibold">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="p-2 text-center text-sm font-medium text-gray-500"
                        >
                          {day}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation View */}
              {view === "confirmation" && selectedSlot && (
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Confirm Your Booking
                    </h3>
                    <p className="text-gray-600">
                      Please review your selection
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">🟢</span>
                        <span className="font-medium">
                          {mode} - {selectedSlot.duration} minutes
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>
                          {new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{selectedSlot.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🌏</span>
                        <span>Asia/Calcutta</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        📞 All slots are available. Booking will be confirmed
                        after purchase.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Occupancy Price Display */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Occupancy:{" "}
                          <span className="font-medium text-gray-900">
                            {dynamicOccupancyType}
                          </span>
                        </span>
                        <span className="text-lg font-bold text-[#2F6288]">
                          ₹
                          {(() => {
                            const modeKey = dynamicMode?.toLowerCase();
                            const subscriptionKey = selectedPlan;
                            const plan =
                              sessionData[modeKey]?.[subscriptionKey];
                            // Get price based on occupancy type from occupancies array
                            let price;
                            if (
                              plan?.occupancies &&
                              Array.isArray(plan.occupancies)
                            ) {
                              const occupancy = plan.occupancies.find(
                                (occ) =>
                                  occ.type?.toLowerCase() ===
                                  dynamicOccupancyType?.toLowerCase(),
                              );
                              price = occupancy
                                ? Number(occupancy.price)
                                : plan?.price || 0;
                            } else {
                              // Fallback to old structure if occupancies array doesn't exist
                              if (
                                dynamicOccupancyType === "couple" ||
                                dynamicOccupancyType === "couples"
                              ) {
                                price = plan?.couplesPrice || plan?.price || 0;
                              } else if (dynamicOccupancyType === "group") {
                                price = plan?.groupPrice || plan?.price || 0;
                              } else {
                                price =
                                  plan?.individualPrice || plan?.price || 0;
                              }
                            }
                            return (
                              Number(price || 0) * quantity
                            ).toLocaleString();
                          })()}
                        </span>
                      </div>
                      {quantity > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          ₹
                          {(() => {
                            const modeKey = dynamicMode?.toLowerCase();
                            const subscriptionKey = selectedPlan;
                            const plan =
                              sessionData[modeKey]?.[subscriptionKey];
                            let price;
                            if (
                              plan?.occupancies &&
                              Array.isArray(plan.occupancies)
                            ) {
                              const occupancy = plan.occupancies.find(
                                (occ) =>
                                  occ.type?.toLowerCase() ===
                                  dynamicOccupancyType?.toLowerCase(),
                              );
                              price = occupancy
                                ? Number(occupancy.price)
                                : plan?.price || 0;
                            } else {
                              // Fallback to old structure if occupancies array doesn't exist
                              if (
                                dynamicOccupancyType === "couple" ||
                                dynamicOccupancyType === "couples"
                              ) {
                                price = plan?.couplesPrice || plan?.price || 0;
                              } else if (dynamicOccupancyType === "group") {
                                price = plan?.groupPrice || plan?.price || 0;
                              } else {
                                price =
                                  plan?.individualPrice || plan?.price || 0;
                              }
                            }
                            return Number(price || 0).toLocaleString();
                          })()}{" "}
                          × {quantity} sessions
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setView("daily")}
                        className="flex-1 px-4 py-3 border-2 border-[#2F6288] text-[#2F6288] rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 px-4 py-3 bg-[#2F6288] text-white rounded-lg hover:bg-[#2F6288]/90 transition-colors font-semibold"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
