import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';
import { useSelector } from 'react-redux';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function MonthlyCalendarModal({
    isOpen,
    onClose,
    sessionData,
    selectedPlan,
    mode,
    availableSlots,
    occupancyType,
    userMonthlySlots,
    slotBookings,
    groupStatus,
    waitingPeriod,
    onGroupBooking,
    onAddToCart
}) {
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showSlotSelection, setShowSlotSelection] = useState(false);
    
    // Get user from Redux
    const user = useSelector((state) => state.auth?.user || state.user?.currentUser || null);

    if (!isOpen) return null;

    const plan = sessionData?.[mode?.toLowerCase()]?.[selectedPlan] || {};
    const sessionsPerMonth = Number(plan.sessionsCount || 0);
    const remainingSessions = sessionsPerMonth - userMonthlySlots.length;
    const groupMin = Number(plan.groupMin || 0);
    const groupMax = Number(plan.groupMax || 0);

    // Get calendar days for current month
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const currentDay = new Date(startDate);
        
        while (currentDay <= lastDay || days.length % 7 !== 0) {
            days.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
        }
        
        return days;
    };

    // Get slots for a specific date
    const getSlotsForDate = (date) => {
        const dateStr = date.toISOString().slice(0, 10);
        const slots = availableSlots.filter(slot => slot.date === dateStr);
        
        return slots;
    };

    // Check if user already has a slot on this date
    const hasSlotOnDate = (date) => {
        const dateStr = date.toISOString().slice(0, 10);
        return userMonthlySlots.some(slot => slot.date === dateStr);
    };

    // Handle slot selection
    const handleSlotSelect = async (slot) => {
        if (loading) return;

        const dateStr = slot.date;
        
        // Check if user already has a slot on this date
        if (hasSlotOnDate(new Date(dateStr)) && occupancyType.toLowerCase() !== 'group') {
            showError('You can only book one slot per day');
            return;
        }

        // Check session limit
        if (userMonthlySlots.length >= sessionsPerMonth && occupancyType.toLowerCase() !== 'group') {
            showError(`You have reached the monthly limit of ${sessionsPerMonth} sessions`);
            return;
        }

        try {
            if (occupancyType.toLowerCase() === 'group') {
                // Handle group booking
                const result = await onGroupBooking(slot, plan);
                // Handle date selection (first step)
                const handleDateSelect = (date) => {
                    const dateStr = date.toISOString().slice(0, 10);
                    const slotsForDate = getSlotsForDate(date);
                    
                    if (slotsForDate.length === 0) {
                        showError('No slots available for this date');
                        return;
                    }
                    
                    // Check if user already has a slot on this date
                    if (hasSlotOnDate(date)) {
                        showError('You already have a booking on this date');
                        return;
                    }
                    setSelectedDate(date);
                    setShowSlotSelection(true);
                };
                
                // Handle slot selection from available slots for selected date
                const handleSlotSelect = (slot) => {
                    if (loading) return;
                    
                    const dateStr = slot.date;
                    
                    // Check if user already selected a slot for this date
                    const existingSlotForDate = selectedSlots.find(s => s.date === dateStr);
                    if (existingSlotForDate) {
                        showError('You can only book one slot per day');
                        return;
                    }
                    
                    // Check session limit
                    if (selectedSlots.length >= sessionsPerMonth) {
                        showError(`You can only book ${sessionsPerMonth} sessions per month`);
                        return;
                    }

                    setSelectedSlots(prev => [...prev, slot]);
                    setShowSlotSelection(false);
                    setSelectedDate(null);
                };
                
                // Remove selected slot
                const removeSelectedSlot = (slotToRemove) => {
                    setSelectedSlots(prev => prev.filter(slot => 
                        !(slot.date === slotToRemove.date && slot.startTime === slotToRemove.startTime)
                    ));
                };
                
                // Handle individual/couple booking
                const handleIndividualCoupleBooking = async (slot) => {
                    try {
            // Create booking record
            const bookingData = {
                userId: user.uid,
                userName: user.displayName || user.email,
                programTitle: sessionData.guideCard.title,
                mode: mode,
                occupancyType: occupancyType,
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                month: new Date().toISOString().slice(0, 7),
                bookedAt: new Date().toISOString()
            };

            // Save to monthlyBookings collection
            await addDoc(collection(db, 'monthlyBookings'), bookingData);

            // Save to slotBookings collection for visibility management
            await addDoc(collection(db, 'slotBookings'), {
                ...bookingData,
                slotKey: `${slot.date}|${slot.startTime}|${slot.endTime}`
            });

            // Create cart item
            const cartItem = {
                id: `${sessionData.guideCard.title}-${slot.date}-${slot.startTime}`,
                title: sessionData.guideCard.title,
                price: getSlotPrice(),
                persons: 1,
                image: sessionData.guideCard.thumbnail,
                quantity: 1,
                type: 'monthly',
                category: 'guide',
                mode: mode,
                subscriptionType: selectedPlan,
                organizer: sessionData.organizer,
                slots: [slot],
                occupancyType: occupancyType,
                timestamp: new Date().toISOString()
            };

            onAddToCart(cartItem);
            showSuccess('Slot booked successfully!');
        } catch (error) {
            console.error('Error in individual/couple booking:', error);
            throw error;
        }
    };

    // Get price for the selected occupancy type
    const getSlotPrice = () => {
        const occType = occupancyType.toLowerCase();
        if (occType.includes('individual')) return Number(plan.individualPrice || plan.price || 0);
        if (occType.includes('couple')) return Number(plan.couplesPrice || 0);
        if (occType.includes('group')) return Number(plan.groupPrice || 0);
        return Number(plan.price || 0);
    };

    // Render group status information
    const renderGroupStatus = () => {
        if (occupancyType.toLowerCase() !== 'group') return null;

        if (groupStatus?.status === 'waiting') {
            const daysLeft = waitingPeriod ? 
                Math.ceil((new Date(waitingPeriod.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
            
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-semibold text-yellow-800">Group Formation in Progress</h3>
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">
                        Current members: {groupStatus.bookings.length} / {groupMax}
                    </p>
                    <p className="text-sm text-yellow-700 mb-2">
                        Minimum required: {groupMin} members
                    </p>
                    <p className="text-sm text-yellow-700">
                        Time remaining: {daysLeft} days
                    </p>
                    {groupStatus.bookings.some(b => b.userId === user?.uid) && (
                        <p className="text-sm text-green-700 font-medium mt-2">
                            ✓ You have already joined this group
                        </p>
                    )}
                </div>
            );
        }

        if (groupStatus?.status === 'active') {
            return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Group Active</h3>
                    </div>
                    <p className="text-sm text-green-700">
                        This group is currently running sessions. New groups will be available after completion.
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Group Booking Available</h3>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                    Join a group session! Minimum {groupMin} members required.
                </p>
                <p className="text-sm text-blue-700">
                    Maximum {groupMax} members allowed.
                </p>
            </div>
        );
    };

    // Render monthly booking summary
    const renderBookingSummary = () => {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Monthly Booking Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600">Sessions booked:</p>
                        <p className="font-medium">{userMonthlySlots.length} / {sessionsPerMonth}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Remaining sessions:</p>
                        <p className="font-medium">{remainingSessions}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Occupancy type:</p>
                        <p className="font-medium">{occupancyType}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Price per session:</p>
                        <p className="font-medium">₹{getSlotPrice()}</p>
                    </div>
                </div>
            </div>
        );
    };

    const calendarDays = getCalendarDays();
    const today = new Date();
    const currentMonth = currentDate.getMonth();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold">Monthly Booking Calendar</h2>
                        <p className="text-sm text-gray-600">{sessionData?.guideCard?.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {renderBookingSummary()}
                    {renderGroupStatus()}

                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                            className="px-3 py-1 border rounded hover:bg-gray-50"
                            disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()}
                        >
                            Previous
                        </button>
                        <h3 className="text-lg font-semibold">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                            className="px-3 py-1 border rounded hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                                {day}
                            </div>
                        ))}
                        
                        {calendarDays.map((day, index) => {
                            const isCurrentMonth = day.getMonth() === currentMonth;
                            const isPast = day < today.setHours(0, 0, 0, 0);
                            const slotsForDay = getSlotsForDate(day);
                            const hasUserSlot = hasSlotOnDate(day);
                            const hasAvailableSlots = slotsForDay.length > 0;
                            
                            return (
                                <div
                                    key={index}
                                    className={`min-h-[100px] border rounded p-1 transition-colors ${
                                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                                    } ${isPast ? 'opacity-50' : ''} ${
                                        hasAvailableSlots && isCurrentMonth && !isPast 
                                            ? 'border-blue-300 bg-blue-50 shadow-sm' 
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
                                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                    }`}>
                                        <span>{day.getDate()}</span>
                                        {hasAvailableSlots && isCurrentMonth && !isPast && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                    
                                    {hasUserSlot && (
                                        <div className="bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded mb-1">
                                            Booked
                                        </div>
                                    )}
                                    
                                    {isCurrentMonth && !isPast && slotsForDay.map((slot, slotIndex) => (
                                        <button
                                            key={slotIndex}
                                            onClick={() => handleSlotSelect(slot)}
                                            disabled={loading || (hasUserSlot && occupancyType.toLowerCase() !== 'group')}
                                            className={`w-full text-xs p-1 rounded mb-1 transition-colors ${
                                                loading || (hasUserSlot && occupancyType.toLowerCase() !== 'group')
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{slot.startTime}</span>
                                            </div>
                                            <div className="text-xs opacity-75">
                                                {slot.type}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Booking Instructions:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• You can book up to {sessionsPerMonth} sessions per month</li>
                            <li>• Only one slot per day is allowed (except for group bookings)</li>
                            <li>• Slots are available from today until the end of the month</li>
                            {occupancyType.toLowerCase() === 'individual' && (
                                <li>• Individual slots become unavailable after booking</li>
                            )}
                            {occupancyType.toLowerCase() === 'couple' && (
                                <li>• Couple slots allow up to 2 bookings before becoming unavailable</li>
                            )}
                            {occupancyType.toLowerCase() === 'group' && (
                                <>
                                    <li>• Group requires minimum {groupMin} and maximum {groupMax} members</li>
                                    <li>• 7-day waiting period starts after first booking</li>
                                    <li>• Refunds processed if minimum not reached within 7 days</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
