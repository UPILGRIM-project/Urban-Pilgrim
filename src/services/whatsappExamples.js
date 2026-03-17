/**
 * Quick Usage Examples for Bulk WhatsApp Messaging
 * Copy and paste these examples into your code
 */

import { 
    sendBulkWhatsApp, 
    sendWhatsAppToFirestoreUsers,
    validatePhoneNumbers 
} from '../services/whatsappService';

// ============================================
// EXAMPLE 1: Simple Welcome Message
// ============================================
export const sendWelcomeMessages = async () => {
    const users = [
        { phone: "+919876543210", name: "Rahul Kumar" },
        { phone: "+918765432109", name: "Priya Sharma" },
        { phone: "+917654321098", name: "Amit Patel" }
    ];

    const message = "Hi {name}, Welcome to Urban Pilgrim! 🧘‍♀️";

    try {
        const result = await sendBulkWhatsApp(users, message);
        console.log(`✅ Success: ${result.success}, ❌ Failed: ${result.failed}`);
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 2: Booking Confirmation
// ============================================
export const sendBookingConfirmations = async (bookings) => {
    const users = bookings.map(booking => ({
        phone: booking.userPhone,
        name: booking.userName
    }));

    const message = `Hi {name}, Your booking is confirmed! 🎉
    
Program: ${bookings[0].programTitle}
Date: ${bookings[0].date}
Time: ${bookings[0].time}

Looking forward to seeing you!
- Urban Pilgrim Team`;

    try {
        const result = await sendBulkWhatsApp(users, message);
        return result;
    } catch (error) {
        console.error("Error sending confirmations:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 3: Send to Active Subscribers
// ============================================
export const sendToActiveSubscribers = async (announcementMessage) => {
    try {
        const result = await sendWhatsAppToFirestoreUsers(
            "users",
            { 
                field: "subscriptionStatus", 
                operator: "==", 
                value: "active" 
            },
            announcementMessage || "Hi {name}, Important update from Urban Pilgrim! 📢"
        );
        
        console.log(`Sent to ${result.success} active subscribers`);
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 4: Session Reminder (1 hour before)
// ============================================
export const sendSessionReminders = async (upcomingSessions) => {
    const users = upcomingSessions.map(session => ({
        phone: session.userPhone,
        name: session.userName
    }));

    const message = `Hi {name}, Reminder! 🔔

Your session "${upcomingSessions[0].sessionTitle}" starts in 1 hour.

Time: ${upcomingSessions[0].time}
Mode: ${upcomingSessions[0].mode}

See you soon!`;

    try {
        const result = await sendBulkWhatsApp(users, message, {
            batchSize: 10,
            delayMs: 1000
        });
        return result;
    } catch (error) {
        console.error("Error sending reminders:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 5: Using Twilio Template (Production)
// ============================================
export const sendWithTemplate = async (users) => {
    const templateData = {
        field2: "Wellness Workshop",   // Program title
        field3: "5000",                 // Amount
        field4: "pay_ABC123"            // Payment ID
    };

    try {
        const result = await sendBulkWhatsApp(
            users,
            templateData,
            {
                useTemplate: true,
                contentSid: "HX142acb9807b604071eb5dd0fba816a01", // Your template SID
                batchSize: 10,
                delayMs: 1000
            }
        );
        return result;
    } catch (error) {
        console.error("Error sending template messages:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 6: Newsletter/Announcement
// ============================================
export const sendNewsletter = async () => {
    try {
        const message = `Hi {name}! 📰

New from Urban Pilgrim:
✨ 3 new wellness programs launched
🎯 Special discount this week: 20% OFF
🧘 Join our community session this Saturday

Check it out: urbanpilgrim.com

Namaste 🙏`;

        const result = await sendWhatsAppToFirestoreUsers(
            "users",
            { field: "newsletter", operator: "==", value: true },
            message,
            { batchSize: 5, delayMs: 2000 } // Slower for large volumes
        );

        return result;
    } catch (error) {
        console.error("Error sending newsletter:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 7: Payment Success Notification
// ============================================
export const sendPaymentSuccess = async (paymentData) => {
    const user = {
        phone: paymentData.userPhone,
        name: paymentData.userName
    };

    const message = `Hi ${user.name}! ✅

Payment Successful!

Amount: ₹${paymentData.amount}
Program: ${paymentData.programTitle}
Payment ID: ${paymentData.paymentId}

Invoice sent to your email.

Thank you for choosing Urban Pilgrim! 🙏`;

    try {
        const result = await sendBulkWhatsApp([user], message);
        return result;
    } catch (error) {
        console.error("Error sending payment notification:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 8: Batch Send with Validation
// ============================================
export const sendWithValidation = async (rawUsers, message) => {
    try {
        // Step 1: Validate phone numbers
        const { valid, invalid } = validatePhoneNumbers(rawUsers);
        
        console.log(`Valid: ${valid.length}, Invalid: ${invalid.length}`);
        
        if (invalid.length > 0) {
            console.warn("Invalid users:", invalid);
        }

        if (valid.length === 0) {
            throw new Error("No valid phone numbers found");
        }

        // Step 2: Send to valid users
        const result = await sendBulkWhatsApp(valid, message);
        
        // Step 3: Return detailed results
        return {
            ...result,
            validated: {
                valid: valid.length,
                invalid: invalid.length
            }
        };
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 9: Event Registration Confirmation
// ============================================
export const sendEventRegistrationConfirmation = async (registration) => {
    const message = `Hi ${registration.userName}! 🎉

Registration Confirmed!

Event: ${registration.eventName}
Date: ${registration.eventDate}
Time: ${registration.eventTime}
Location: ${registration.location}

Registration ID: ${registration.registrationId}

We can't wait to see you there!

- Urban Pilgrim Team`;

    try {
        const result = await sendBulkWhatsApp(
            [{ phone: registration.userPhone, name: registration.userName }],
            message
        );
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

// ============================================
// EXAMPLE 10: Custom Campaign with Progress
// ============================================
export const sendCampaignWithProgress = async (campaignData, onProgress) => {
    const { users, message, batchSize = 10 } = campaignData;
    
    try {
        const totalBatches = Math.ceil(users.length / batchSize);
        let completedBatches = 0;
        const results = { success: 0, failed: 0, errors: [] };

        // Process in batches
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            const batchResult = await sendBulkWhatsApp(batch, message, {
                batchSize: batch.length,
                delayMs: 0 // No delay since we're controlling batches manually
            });

            results.success += batchResult.success;
            results.failed += batchResult.failed;
            results.errors.push(...batchResult.errors);

            completedBatches++;
            
            // Report progress
            if (onProgress) {
                onProgress({
                    completedBatches,
                    totalBatches,
                    percentage: Math.round((completedBatches / totalBatches) * 100),
                    sent: results.success,
                    failed: results.failed
                });
            }

            // Delay between batches
            if (i + batchSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    } catch (error) {
        console.error("Campaign error:", error);
        throw error;
    }
};

// ============================================
// USAGE IN REACT COMPONENT
// ============================================

/*
// Example React component usage:

import { sendWelcomeMessages, sendToActiveSubscribers } from './examples/whatsappExamples';

const MyComponent = () => {
    const handleSendWelcome = async () => {
        try {
            const result = await sendWelcomeMessages();
            alert(`Sent: ${result.success}, Failed: ${result.failed}`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSendAnnouncement = async () => {
        try {
            const result = await sendToActiveSubscribers(
                "New yoga classes starting next week! 🧘‍♀️"
            );
            console.log(result);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <button onClick={handleSendWelcome}>Send Welcome</button>
            <button onClick={handleSendAnnouncement}>Send Announcement</button>
        </div>
    );
};
*/

// Export all functions
export default {
    sendWelcomeMessages,
    sendBookingConfirmations,
    sendToActiveSubscribers,
    sendSessionReminders,
    sendWithTemplate,
    sendNewsletter,
    sendPaymentSuccess,
    sendWithValidation,
    sendEventRegistrationConfirmation,
    sendCampaignWithProgress
};
