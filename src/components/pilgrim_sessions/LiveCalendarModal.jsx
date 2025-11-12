import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { FiChevronLeft, FiChevronRight, FiX, FiArrowLeft } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice.js";
import { showSuccess } from "../../utils/toast.js";

export default function LiveCalendarModal({ isOpen, onClose, sessionData, selectedPlan, mode,availableSlots = [],personsPerBooking = 1,occupancyType = '',capacityMax = 0}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedSlotsMulti, setSelectedSlotsMulti] = useState([]); // multi-select for one-time and monthly
    const [localSlots, setLocalSlots] = useState([]);
    const [view, setView] = useState('monthly'); // keep monthly as main canvas
    const [loading, setLoading] = useState(false);
    
    const dispatch = useDispatch();
    const userPrograms = useSelector((state) => state.userProgram);

    useEffect(() => {
        if (isOpen) {
            fetchAvailableSlots();
        }
    }, [isOpen, availableSlots, mode, selectedPlan]);

    const fetchAvailableSlots = async () => {
        // Use slots passed from parent component instead of fetching
        if (availableSlots.length > 0) {
            // Process parent slots to ensure they have the available property
            const processedParentSlots = availableSlots.map((slot, index) => ({
                id: slot.id || `parent-${slot.date}-${slot.time || slot.startTime}-${index}`,
                date: slot.date,
                time: slot.time || slot.startTime,
                endTime: slot.endTime,
                location: slot.location,
                available: true, // All slots are available since booking tracking is not implemented
                duration: slot.duration || 60,
                ...slot
            }));
            setLocalSlots(processedParentSlots);
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            // Fallback: Get slots from session data if no slots passed from parent
            const modeKey = mode === 'Online' ? 'onlineSlots' : 'offlineSlots';
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
                ...slot
            }));
            
            setLocalSlots(processedSlots);
        } catch (error) {
            console.error('Error fetching slots:', error);
            setLocalSlots([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMultipleToCart = () => {
        if (!sessionData || selectedSlotsMulti.length === 0) return;

        selectedSlotsMulti.forEach((slot) => {
            const cartItem = {
                id: `${sessionData?.guideCard?.title}-${slot.id}`,
                title: sessionData?.guideCard?.title,
                price: slot.selectedPrice || getPerSlotPrice(), // Use individual slot price
                gst: sessionData?.guideCard?.gst || 0,
                persons: Math.max(1, Number(personsPerBooking || 1)),
                image: sessionData?.guideCard?.thumbnail,
                quantity: 1, // one item per slot ensures backend slot reservation per item
                type: 'live',
                category: 'live',
                mode: mode,
                subscriptionType: selectedPlan,
                organizer: sessionData?.organizer,
                slots: [{ id: slot.id, date: slot.date, startTime: slot.time || slot.startTime, endTime: slot.endTime, location: slot.location }],
                occupancyType: slot.selectedOccupancyType || occupancyType, // Use individual slot occupancy type
                timestamp: new Date().toISOString()
            };
            dispatch(addToCart(cartItem));
        });

        showSuccess(`${selectedSlotsMulti.length} slot(s) added to cart!`);
        onClose();
        resetModal();
    };

    const handleAddMonthlyToCart = () => {
        if (!sessionData || selectedSlotsMulti.length === 0) return;

        const modeKey = mode?.toLowerCase();
        const subscriptionKey = selectedPlan; // 'monthly'
        const price = sessionData[modeKey]?.[subscriptionKey]?.price;

        const cartItem = {
            id: `${sessionData?.guideCard?.title}-monthly-${Date.now()}`,
            title: sessionData?.guideCard?.title,
            price: price, // monthly price
            gst: sessionData?.guideCard?.gst || 0,
            persons: 1,
            image: sessionData?.guideCard?.thumbnail,
            quantity: 1,
            type: "guide",
            mode: mode,
            subscriptionType: selectedPlan,
            organizer: sessionData?.organizer,
            selectedSlots: selectedSlotsMulti.map(s => ({ id: s.id, date: s.date, startTime: s.time || s.startTime, endTime: s.endTime, location: s.location, rowIdx: s.rowIdx, tIdx: s.tIdx, type: s.type })),
            timestamp: new Date().toISOString()
        };
        dispatch(addToCart(cartItem));

        showSuccess(`${selectedSlotsMulti.length} session(s) scheduled and added to cart!`);
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
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Check if there are any available slots for the selected occupancy type
        const occ = (occupancyType || '').toString().toLowerCase();
        
        return localSlots.some(slot => {
            if (slot.date !== dateStr) return false;
            
            // Check if slot type matches selected occupancy type
            const slotType = (slot.type || 'individual').toLowerCase();
            const occupancyMatches = slotType === occ || 
                (occ.includes('couple') && slotType.includes('couple')) ||
                (occ.includes('twin') && slotType.includes('twin')) ||
                (occ.includes('group') && slotType.includes('group')) ||
                (occ.includes('individual') && slotType.includes('individual'));
            
            if (!occupancyMatches) return false;
            
            // Check if slot is not full
            const booked = Number(slot.bookedCount || 0);
            let cap = 1; // default for individual
            if (occ.includes('couple') || occ.includes('twin')) {
                cap = 2;
            } else if (occ.includes('group')) {
                cap = Number(capacityMax || 0);
            }
            
            // Check if slot is full
            if (booked >= cap) return false;
            
            // Check slot locking - unavailable if locked for different occupancy type
            const key = `${slot.date}|${slot.startTime || slot.time}|${slot.endTime}`;
            const lock = (slotLocks[key] || '').toString().toLowerCase();
            if (lock && lock !== occ) return false;
            
            return true; // Available if not full and not locked
        });
    };

    const getNextAvailableSlot = () => {
        const availableSlot = localSlots.find(slot => slot.available);
        if (availableSlot) {
            const date = new Date(availableSlot.date);
            return {
                date: date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                time: availableSlot.time
            };
        }
        return null;
    };

    const getSlotsForDate = (dateStr) => {
        // Filter slots for the selected date
        let slots = localSlots.filter(slot => slot.date === dateStr);
        
        // Filter by occupancy type and availability
        const occ = (occupancyType || '').toString().toLowerCase();
        
        slots = slots.filter(slot => {
            // Check if slot type matches selected occupancy type
            const slotType = (slot.type || 'individual').toLowerCase();
            const occupancyMatches = slotType === occ || 
                (occ.includes('couple') && slotType.includes('couple')) ||
                (occ.includes('twin') && slotType.includes('twin')) ||
                (occ.includes('group') && slotType.includes('group')) ||
                (occ.includes('individual') && slotType.includes('individual'));
            
            if (!occupancyMatches) return false;
            
            // Check if slot is full
            const booked = Number(slot.bookedCount || 0);
            let cap = 1; // default for individual
            if (occ.includes('couple') || occ.includes('twin')) {
                cap = 2;
            } else if (occ.includes('group')) {
                cap = Number(capacityMax || 0);
            }
            
            // Hide full slots
            if (booked >= cap) return false;
            
            // Check slot locking - hide if locked for different occupancy type
            const key = `${slot.date}|${slot.startTime || slot.time}|${slot.endTime}`;
            const lock = (slotLocks[key] || '').toString().toLowerCase();
            if (lock && lock !== occ) return false;
            
            return true;
        });
        
        // Filter out slots already purchased by current user
        if (selectedPlan === 'oneTime') {
            const title = sessionData?.guideCard?.title || '';
            const purchasedSet = new Set(
                (userPrograms || [])
                    .filter(p => p.type === 'guide' && p.subscriptionType === 'oneTime' && (p.title === title))
                    .map(p => `${p.slotDate}|${p.slotStart}|${p.slotEnd}`)
            );
            slots = slots.filter(s => !purchasedSet.has(`${s.date}|${s.startTime || s.time}|${s.endTime}`));
        }
        
        return slots;
    };

    // Compute current enrolled counts from sessionData.slotBookings
    const getSlotBookings = () => {
        try {
            const modeKey = mode?.toLowerCase();
            const subKey = selectedPlan;
            const plan = sessionData?.[modeKey]?.[subKey] || {};
            return (plan.slotBookings && typeof plan.slotBookings === 'object') ? plan.slotBookings : {};
        } catch {
            return {};
        }
    };
    const slotBookings = getSlotBookings();

    // Retrieve first-booker occupancy locks per slot
    const getSlotLocks = () => {
        try {
            const modeKey = mode?.toLowerCase();
            const subKey = selectedPlan;
            const plan = sessionData?.[modeKey]?.[subKey] || {};
            return (plan.slotLocks && typeof plan.slotLocks === 'object') ? plan.slotLocks : {};
        } catch {
            return {};
        }
    };
    const slotLocks = getSlotLocks();

    // Compute per-slot price and running total for one-time purchases
    const getPerSlotPrice = () => {
        try {
            const modeKey = mode?.toLowerCase();
            const subscriptionKey = 'oneTime';
            const p = Number(sessionData?.[modeKey]?.[subscriptionKey]?.price || 0);
            return isNaN(p) ? 0 : p;
        } catch {
            return 0;
        }
    };
    // Calculate total based on individual slot prices (for mixed occupancy types)
    const oneTimeTotal = selectedPlan === 'oneTime' ? 
        selectedSlotsMulti.reduce((total, slot) => total + (slot.selectedPrice || getPerSlotPrice()), 0) : 0;

    const handleDateClick = (day) => {
        if (!day || !hasAvailableSlots(day)) return;
        
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
    };

    const handleSlotSelect = (slot) => {
        // For one-time and monthly, support multi-select
        if (selectedPlan === 'quarterly') {
            // keep legacy single select if quarterly flows exist
            setSelectedSlot(slot);
            setView('confirmation');
            return;
        }
        setSelectedSlotsMulti((prev) => {
            const exists = prev.some(s => s.id === slot.id);
            if (exists) return prev.filter(s => s.id !== slot.id);

            // Enforce monthly selection cap if provided
            if (selectedPlan === 'monthly') {
                const modeKey = mode?.toLowerCase();
                const max = Number(sessionData?.[modeKey]?.monthly?.sessionsCount || 0);
                if (max > 0 && prev.length >= max) return prev; // ignore if limit reached
            }
            
            // Store occupancy type and price with each slot for accurate calculation
            const slotWithOccupancy = {
                ...slot,
                selectedOccupancyType: occupancyType,
                selectedPrice: getPerSlotPrice()
            };
            
            return [...prev, slotWithOccupancy];
        });
    };

    const handleAddToCart = () => {
        if (!sessionData || !selectedSlot) {
            return;
        }

        // Get the price based on mode and subscription type
        const modeKey = mode?.toLowerCase(); // "online" or "offline"
        const subscriptionKey = selectedPlan; // "monthly", "quarterly", "oneTime"
        const price = sessionData[modeKey]?.[subscriptionKey]?.price;

        const cartItem = {
            id: `${sessionData?.guideCard?.title}-${selectedSlot.id}`, // unique id
            title: sessionData?.guideCard?.title,
            price: price,
            persons: 1, // default to 1 person
            image: sessionData?.guideCard?.thumbnail,
            quantity: 1,
            type: "guide",
            mode: mode,
            gst: sessionData?.guideCard?.gst || 0,
            subscriptionType: selectedPlan,
            organizer: sessionData?.organizer,
            slot: selectedSlot,
            date: selectedDate,
            timestamp: new Date().toISOString()
        };

        dispatch(addToCart(cartItem));
        showSuccess("Added to cart!");
        
        onClose();
        resetModal();
    };

    const resetModal = () => {
        setView('monthly');
        setSelectedDate(null);
        setSelectedSlot(null);
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    if (!isOpen) return null;

    const nextSlot = getNextAvailableSlot();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {sessionData?.session?.title || 'Book Your Session'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {mode} - {selectedPlan === 'monthly' ? 'Monthly' : selectedPlan === 'quarterly' ? 'Quarterly' : 'One Time'} Plan
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
                            {view === 'monthly' && (
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
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {getDaysInMonth(currentDate).map((day, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleDateClick(day)}
                                                    disabled={!day || !hasAvailableSlots(day)}
                                                    className={`p-2 text-center text-sm rounded transition-colors ${
                                                        !day 
                                                            ? 'invisible' 
                                                            : hasAvailableSlots(day)
                                                                ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                                                                : 'text-gray-300 cursor-not-allowed'
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
                                                <h4 className="font-medium text-gray-800">Available Slots</h4>
                                                <p className="text-sm text-gray-600">
                                                    Select a date on the calendar to view and pick slots. You can select multiple dates and slots.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-gray-800">Slots on {new Date(selectedDate).toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'})}</h4>
                                                    <button
                                                        onClick={() => setSelectedDate(null)}
                                                        className="text-sm text-[#2F6288] hover:underline"
                                                    >
                                                        Clear date
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {getSlotsForDate(selectedDate).map(slot => {
                                                        const start = slot.startTime || slot.time;
                                                        const key = `${slot.date}|${start}|${slot.endTime}`;
                                                        
                                                        // Use bookedCount directly from slot for live sessions
                                                        const booked = Number(slot.bookedCount || 0);
                                                        
                                                        // Calculate capacity based on occupancy type
                                                        let cap = 1; // default for individual
                                                        const occ = (occupancyType || '').toString().toLowerCase();
                                                        if (occ.includes('couple') || occ.includes('twin')) {
                                                            cap = 2;
                                                        } else if (occ.includes('group')) {
                                                            cap = Number(capacityMax || 0);
                                                        }
                                                        
                                                        // Check slot locking and occupancy matching
                                                        const slotType = (slot.type || 'individual').toLowerCase();
                                                        const lock = (slotLocks[key] || '').toString().toLowerCase();
                                                        
                                                        const occupancyMatches = slotType === occ || 
                                                            (occ.includes('couple') && slotType.includes('couple')) ||
                                                            (occ.includes('twin') && slotType.includes('twin')) ||
                                                            (occ.includes('group') && slotType.includes('group')) ||
                                                            (occ.includes('individual') && slotType.includes('individual'));
                                                        
                                                        const isSelected = selectedSlotsMulti.some(s => s.id === slot.id);
                                                        
                                                        // Hide slot if it doesn't match occupancy type, is full, or locked for different occupancy
                                                        let disabled = false;
                                                        if (!occupancyMatches) {
                                                            disabled = true; // Hide slots that don't match occupancy type
                                                        } else if (selectedPlan === 'oneTime') {
                                                            // Hide if slot is full for this occupancy type
                                                            if (booked >= cap) disabled = true;
                                                            // Hide if slot is locked for a different occupancy type
                                                            if (!disabled && lock && occ && lock !== occ) {
                                                                disabled = true;
                                                            }
                                                        }
                                                        return (
                                                            <button
                                                                key={slot.id}
                                                                onClick={() => !disabled && handleSlotSelect(slot)}
                                                                className={`p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-[#2F6288] bg-blue-50' : disabled ? 'border-gray-200 bg-gray-100 cursor-not-allowed' : 'border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100'}`}
                                                                disabled={disabled}
                                                            >
                                                                <div className="text-left">
                                                                    <p className="font-semibold text-green-800">{slot.time || slot.startTime}</p>
                                                                    <p className="text-sm text-gray-600">{slot.duration || 60} minutes</p>
                                                                    
                                                                    {/* Show price per slot */}
                                                                    {selectedPlan === 'oneTime' && (
                                                                        <p className="text-sm font-medium text-[#2F6288] mt-1">
                                                                            ₹{getPerSlotPrice()}/slot
                                                                        </p>
                                                                    )}
                                                                    
                                                                    {/* Show enrolled count for all occupancy types */}
                                                                    {selectedPlan === 'oneTime' && (
                                                                        <p className="text-xs mt-1 text-gray-600">
                                                                            Enrolled: {booked}/{cap}
                                                                            {occ.includes('individual') && ' (Individual)'}
                                                                            {(occ.includes('couple') || occ.includes('twin')) && ' (Couple)'}
                                                                            {occ.includes('group') && ' (Group)'}
                                                                        </p>
                                                                    )}
                                                                    
                                                                    {/* Show lock status if slot is locked for different occupancy */}
                                                                    {selectedPlan === 'oneTime' && lock && lock !== occ && (
                                                                        <p className="text-xs mt-1 text-amber-700">
                                                                            Locked for: {lock.charAt(0).toUpperCase() + lock.slice(1)}
                                                                        </p>
                                                                    )}
                                                                    
                                                                    <p className={`text-xs mt-1 font-medium ${
                                                                        isSelected ? 'text-blue-700' : 
                                                                        disabled ? 'text-red-600' : 
                                                                        'text-green-600'
                                                                    }`}>
                                                                        {isSelected ? 'Selected' : 
                                                                         disabled ? (
                                                                            booked >= cap ? 'Full' : 
                                                                            lock && lock !== occ ? 'Locked' : 
                                                                            'Not Available'
                                                                         ) : 
                                                                         'Available'}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Info text above footer */}
                                                <div className="mt-4 text-xs sm:text-sm text-gray-600">
                                                    {selectedPlan === 'oneTime' ? (
                                                        <>
                                                            <span>
                                                                {(() => {
                                                                    const occ = (occupancyType || '').toString().toLowerCase();
                                                                    if (occ.includes('individual')) {
                                                                        return 'Individual slots: Each slot can be booked by one person only.';
                                                                    } else if (occ.includes('couple') || occ.includes('twin')) {
                                                                        return 'Couple slots: Each slot allows up to 2 bookings, then becomes unavailable.';
                                                                    } else if (occ.includes('group')) {
                                                                        const max = Number(capacityMax || 0);
                                                                        return `Group slots: Each slot allows up to ${max} bookings, then becomes unavailable.`;
                                                                    }
                                                                    return 'Select your preferred time slots.';
                                                                })()}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        (() => {
                                                            const modeKey = mode?.toLowerCase();
                                                            const max = Number(sessionData?.[modeKey]?.monthly?.sessionsCount || 0);
                                                            if (max > 0) {
                                                                return <span>{`You can select up to ${max} session${max>1?'s':''} this month.`}</span>;
                                                            }
                                                            return null;
                                                        })()
                                                    )}
                                                </div>

                                                {/* Footer actions for selections */}
                                                <div className="mt-6 flex items-center justify-between">
                                                    <div className="text-sm text-gray-700">
                                                        Selected: <span className="font-semibold">{selectedSlotsMulti.length}</span>
                                                        {selectedPlan === 'monthly' && (() => {
                                                            const modeKey = mode?.toLowerCase();
                                                            const max = Number(sessionData?.[modeKey]?.monthly?.sessionsCount || 0);
                                                            return max > 0 ? <span className="ml-1">/ {max}</span> : null;
                                                        })()}
                                                        {selectedPlan === 'oneTime' && (
                                                            <span className="ml-3 text-gray-900">
                                                                Total: <span className="font-semibold">₹{oneTimeTotal}</span>
                                                                <span className="text-xs text-gray-500 ml-1">
                                                                    {(() => {
                                                                        // Show breakdown if mixed occupancy types
                                                                        const occupancyTypes = [...new Set(selectedSlotsMulti.map(s => s.selectedOccupancyType))];
                                                                        if (occupancyTypes.length > 1) {
                                                                            // Show detailed breakdown for mixed types
                                                                            const breakdown = selectedSlotsMulti.map(s => `${s.selectedOccupancyType}:₹${s.selectedPrice}`).join(', ');
                                                                            return `(${breakdown})`;
                                                                        } else if (occupancyTypes.length === 1) {
                                                                            const firstSlot = selectedSlotsMulti[0];
                                                                            return `(${occupancyTypes[0]} • ₹${firstSlot?.selectedPrice || getPerSlotPrice()}/slot)`;
                                                                        }
                                                                        return `(₹${getPerSlotPrice()}/slot)`;
                                                                    })()}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedPlan === 'oneTime' ? (
                                                        <button
                                                            onClick={handleAddMultipleToCart}
                                                            disabled={selectedSlotsMulti.length === 0}
                                                            className="px-4 py-3 bg-[#2F6288] text-white rounded-lg disabled:opacity-50"
                                                        >
                                                            Add {selectedSlotsMulti.length || ''} Slot{selectedSlotsMulti.length === 1 ? '' : 's'} to Cart{selectedSlotsMulti.length > 0 ? ` • ₹${oneTimeTotal}` : ''}
                                                        </button>
                                                    ) : selectedPlan === 'monthly' ? (
                                                        <button
                                                            onClick={handleAddMonthlyToCart}
                                                            disabled={selectedSlotsMulti.length === 0}
                                                            className="px-4 py-3 bg-[#2F6288] text-white rounded-lg disabled:opacity-50"
                                                        >
                                                            Save {selectedSlotsMulti.length || ''} Session{selectedSlotsMulti.length === 1 ? '' : 's'}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Daily View */}
                            {view === 'daily' && (
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <button
                                            onClick={() => setView('monthly')}
                                            className="flex items-center gap-2 text-[#2F6288] hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                                        >
                                            <FiArrowLeft className="w-4 h-4" />
                                            Back to Calendar
                                        </button>
                                        <h3 className="text-lg font-semibold">
                                            {new Date(selectedDate).toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Confirmation View */}
                            {view === 'confirmation' && selectedSlot && (
                                <div className="max-w-md mx-auto">
                                    <div className="text-center mb-6">
                                        <h3 className="text-lg font-semibold mb-2">Confirm Your Booking</h3>
                                        <p className="text-gray-600">Please review your selection</p>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600">🟢</span>
                                                <span className="font-medium">{mode} - {selectedSlot.duration} minutes</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>📅</span>
                                                <span>
                                                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                                                        weekday: 'long', 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        year: 'numeric'
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
                                                📞 All slots are available. Booking will be confirmed after purchase.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setView('daily')}
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
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
