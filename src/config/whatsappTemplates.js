export const WHATSAPP_TEMPLATES = {
    // Booking & Reservations
    BOOKING_CONFIRMATION: {
        sid: "HX2fc305c30b505cdc240844f65ebb3f7f",
        name: "Booking Confirmation",
        variables: ["name", "program", "date", "amount", "paymentId"],
        category: "UTILITY",
        example: "Hi Rahul, Your booking for Wellness Workshop has been confirmed! Amount: ₹5000"
    },

    // Payments
    PAYMENT_SUCCESS: {
        sid: "HX9c74a88c52f7a8dc13b1805f4fe489e6",
        name: "Payment Success",
        variables: ["name", "amount", "program", "transactionId"],
        category: "UTILITY",
        example: "Hi Priya, Payment received! Amount: ₹3000 for Yoga Session"
    },

    // Reminders
    SESSION_REMINDER: {
        sid: "HXc4dd8c286a32c98e4fe55f60e6cf28f7",
        name: "Session Reminder",
        variables: ["name", "sessionTitle", "minutes", "mode", "time"],
        category: "UTILITY",
        example: "Hi Amit, Reminder: Your session 'Morning Yoga' starts in 30 minutes!"
    },

    // Authentication
    OTP_VERIFICATION: {
        sid: "HXabcdef1234567890abcdef1234567890", // Replace with your OTP template SID
        name: "OTP Verification",
        variables: ["otp"],
        category: "AUTHENTICATION",
        example: "Your Urban Pilgrim verification code is: 123456"
    },

    // Welcome & Onboarding
    WELCOME_NEW_USER: {
        sid: "", // Add your welcome template SID here
        name: "Welcome New User",
        variables: ["name"],
        category: "MARKETING",
        example: "Welcome to Urban Pilgrim, Rahul! Discover inner peace..."
    },

    // Cancellations
    BOOKING_CANCELLED: {
        sid: "", // Add your cancellation template SID here
        name: "Booking Cancelled",
        variables: ["name", "program", "refundAmount"],
        category: "UTILITY",
        example: "Hi Priya, Your booking has been cancelled. Refund: ₹5000"
    },

    // Events
    EVENT_REMINDER: {
        sid: "", // Add your event reminder template SID here
        name: "Event Reminder",
        variables: ["name", "eventName", "date", "location"],
        category: "UTILITY",
        example: "Hi Amit, Reminder: Yoga Retreat tomorrow at Rishikesh"
    },

    // Marketing
    SPECIAL_OFFER: {
        sid: "", // Add your special offer template SID here
        name: "Special Offer",
        variables: ["name", "discount", "validUntil"],
        category: "MARKETING",
        example: "Hi Rahul, Special offer! 20% OFF on all programs until Feb 28"
    },

    // Support
    SUPPORT_RESPONSE: {
        sid: "", // Add your support template SID here
        name: "Support Response",
        variables: ["name", "ticketId", "status"],
        category: "UTILITY",
        example: "Hi Priya, Your ticket #1234 has been resolved"
    },

    // Newsletter
    NEWSLETTER: {
        sid: "", // Add your newsletter template SID here
        name: "Newsletter",
        variables: ["name", "headline", "link"],
        category: "MARKETING",
        example: "Hi Amit, New wellness programs launched! Check them out"
    }
};

export const getTemplate = (templateKey) => {
    const template = WHATSAPP_TEMPLATES[templateKey];
    if (!template || !template.sid) {
        throw new Error(`Template ${templateKey} not found or SID not configured`);
    }
    return template;
};

export const getConfiguredTemplates = () => {
    return Object.entries(WHATSAPP_TEMPLATES)
        .filter(([_, template]) => template.sid)
        .map(([key, template]) => ({
            key,
            ...template
        }));
};

export const validateTemplateData = (templateKey, data) => {
    const template = getTemplate(templateKey);
    const missingVars = template.variables.filter(v => !data[v]);
    
    if (missingVars.length > 0) {
        console.warn(`Missing variables for ${templateKey}:`, missingVars);
        return false;
    }
    return true;
};

export const formatTemplateData = (variables) => {
    const formatted = {};
    variables.forEach((value, index) => {
        // Twilio expects field2, field3, field4... (field1 is reserved for name)
        formatted[`field${index + 2}`] = value;
    });
    return formatted;
};

export default WHATSAPP_TEMPLATES;
