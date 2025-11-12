// Booking Lifecycle Management System
// Handles group waiting periods, individual/couple immediate starts, and slot cleanup

import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

/**
 * Check and process group bookings that have completed their 7-day waiting period
 */
export const processGroupWaitingPeriods = async () => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        
        // Find all group bookings where waiting period has ended
        const cartQuery = query(
            collection(db, 'carts'),
            where('occupancyType', '==', 'group'),
            where('status', '==', 'waiting'),
            where('waitingPeriodEnd', '<=', today)
        );
        
        const waitingBookings = await getDocs(cartQuery);
        
        for (const bookingDoc of waitingBookings.docs) {
            const booking = bookingDoc.data();
            const bookingId = bookingDoc.id;
            
            // Count total bookings for the same slots
            const slotBookings = await getSlotBookingCount(booking);
            
            if (slotBookings >= booking.minPersons) {
                // Minimum reached - activate the group
                await updateDoc(doc(db, 'carts', bookingId), {
                    status: 'active',
                    actualStartDate: today
                });
                
                // Send activation email
                await sendGroupActivationEmail(booking);
                
            } else {
                // Minimum not reached - process refund
                await processGroupRefund(booking, bookingId);
            }
        }
        
    } catch (error) {
        console.error('Error processing group waiting periods:', error);
    }
};

/**
 * Clean up expired bookings (after 1 month completion)
 */
export const cleanupExpiredBookings = async () => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        
        // Find all bookings that have expired
        const expiredQuery = query(
            collection(db, 'carts'),
            where('endDate', '<', today),
            where('status', 'in', ['active', 'completed'])
        );
        
        const expiredBookings = await getDocs(expiredQuery);
        
        for (const bookingDoc of expiredBookings.docs) {
            const booking = bookingDoc.data();
            const bookingId = bookingDoc.id;
            
            // Mark as completed and free up slots
            await updateDoc(doc(db, 'carts', bookingId), {
                status: 'completed',
                completedDate: today
            });
            
            // Free up the slots for new bookings
            await freeUpSlots(booking);
        }
        
    } catch (error) {
        console.error('Error cleaning up expired bookings:', error);
    }
};

/**
 * Get booking count for specific slots
 */
const getSlotBookingCount = async (booking) => {
    try {
        const slotKeys = booking.selectedSlots.map(slot => 
            `${slot.date}-${slot.startTime}-${slot.endTime}`
        );
        
        // Count bookings for the same slots and occupancy type
        const bookingQuery = query(
            collection(db, 'carts'),
            where('occupancyType', '==', booking.occupancyType),
            where('title', '==', booking.title),
            where('mode', '==', booking.mode)
        );
        
        const bookings = await getDocs(bookingQuery);
        let count = 0;
        
        bookings.forEach(doc => {
            const data = doc.data();
            if (data.selectedSlots && data.selectedSlots.some(slot => {
                const slotKey = `${slot.date}-${slot.startTime}-${slot.endTime}`;
                return slotKeys.includes(slotKey);
            })) {
                count++;
            }
        });
        
        return count;
        
    } catch (error) {
        console.error('Error getting slot booking count:', error);
        return 0;
    }
};

/**
 * Process refund for group booking that didn't meet minimum
 */
const processGroupRefund = async (booking, bookingId) => {
    try {
        // Update booking status
        await updateDoc(doc(db, 'carts', bookingId), {
            status: 'refunded',
            refundDate: new Date().toISOString().slice(0, 10),
            refundReason: 'Minimum group size not reached'
        });
        
        // Here you would integrate with your payment gateway to process refund
        // For now, just log the refund request
        console.log(`Refund requested for booking ${bookingId}:`, {
            amount: booking.price,
            customerEmail: booking.customerEmail,
            reason: 'Minimum group size not reached'
        });
        
        // Send refund notification email
        await sendRefundNotificationEmail(booking);
        
    } catch (error) {
        console.error('Error processing group refund:', error);
    }
};

/**
 * Free up slots after booking completion
 */
const freeUpSlots = async (booking) => {
    try {
        // This would update your slot availability system
        // Implementation depends on how you store slot availability
        console.log(`Freeing up slots for completed booking:`, booking.selectedSlots);
        
        // You might want to:
        // 1. Remove booking references from slot documents
        // 2. Update slot availability counters
        // 3. Clear any slot reservations
        
    } catch (error) {
        console.error('Error freeing up slots:', error);
    }
};

/**
 * Send group activation email
 */
const sendGroupActivationEmail = async (booking) => {
    // Implementation for sending activation email
    console.log(`Sending group activation email to ${booking.customerEmail}`);
};

/**
 * Send refund notification email
 */
const sendRefundNotificationEmail = async (booking) => {
    // Implementation for sending refund notification email
    console.log(`Sending refund notification email to ${booking.customerEmail}`);
};

/**
 * Check if a user can book a specific slot (validation)
 */
export const validateSlotBooking = async (slotData, occupancyType, userId) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        
        // Check if user already has an active booking for this program
        const existingQuery = query(
            collection(db, 'carts'),
            where('customerEmail', '==', userId),
            where('title', '==', slotData.title),
            where('mode', '==', slotData.mode),
            where('status', 'in', ['active', 'waiting']),
            where('endDate', '>=', today)
        );
        
        const existingBookings = await getDocs(existingQuery);
        
        if (!existingBookings.empty) {
            return {
                valid: false,
                reason: 'You already have an active booking for this program'
            };
        }
        
        // Check slot capacity for group bookings
        if (occupancyType === 'group') {
            const slotBookingCount = await getSlotBookingCount(slotData);
            const maxCapacity = slotData.maxPersons || 10;
            
            if (slotBookingCount >= maxCapacity) {
                return {
                    valid: false,
                    reason: 'Group slots are full'
                };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        console.error('Error validating slot booking:', error);
        return {
            valid: false,
            reason: 'Validation error occurred'
        };
    }
};

/**
 * Get booking status for display
 */
export const getBookingStatus = (booking) => {
    const today = new Date().toISOString().slice(0, 10);
    
    if (booking.status === 'waiting') {
        const daysLeft = Math.ceil((new Date(booking.waitingPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
        return {
            status: 'waiting',
            message: `Waiting for minimum group size (${daysLeft} days left)`,
            daysLeft
        };
    }
    
    if (booking.status === 'active') {
        const daysLeft = Math.ceil((new Date(booking.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
            status: 'active',
            message: `Active (${daysLeft} days remaining)`,
            daysLeft
        };
    }
    
    return {
        status: booking.status,
        message: booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
    };
};
