import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";


export const sendBulkWhatsApp = async (users, messageData, options = {}) => {
    try {
        if (!users || !Array.isArray(users) || users.length === 0) {
            throw new Error("Users array is required and must not be empty");
        }

        // Validate phone numbers exist
        const invalidUsers = users.filter(user => !user.phone);
        if (invalidUsers.length > 0) {
            console.warn(`${invalidUsers.length} users missing phone numbers`);
        }

        // Get the callable function
        const sendBulkWhatsAppMessages = httpsCallable(
            functions, 
            "sendBulkWhatsAppMessages"
        );

        // Prepare data
        const payload = {
            users,
            messageText: messageData,   // ✅ FIXED
            contentSid: options.contentSid || null
        };

        console.log("📤 Sending to Cloud Function:", {
            usersCount: users.length,
            messageData: typeof messageData === 'string' ? messageData.substring(0, 50) + '...' : messageData,
            useTemplate: payload.useTemplate,
            firstUser: users[0]
        });

        // Call the function
        const response = await sendBulkWhatsAppMessages(payload);

        console.log("✅ Response received:", {
            success: response.data.success,
            sentCount: response.data.success,
            failedCount: response.data.failed
        });

        return response.data;
    } catch (error) {
        console.error("❌ Error sending bulk WhatsApp:", {
            message: error.message,
            code: error.code,
            details: typeof error.details === 'string' ? error.details : 'See error object'
        });
        throw new Error(error.message || "Failed to send bulk WhatsApp messages");
    }
};


export const sendWhatsAppToFirestoreUsers = async (
    collectionPath,
    queryConstraints,
    messageData,
    options = {}
) => {
    try {
        const { db } = await import("./firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");

        // Build query
        let q = collection(db, collectionPath);
        
        if (queryConstraints) {
            const { field, operator, value } = queryConstraints;
            q = query(q, where(field, operator, value));
        }

        // Get users
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                phone: data.phone || data.phoneNumber || data.mobile,
                name: data.name || data.displayName || data.userName || "User"
            };
        }).filter(user => user.phone); // Only include users with phone numbers

        if (users.length === 0) {
            throw new Error(`No users found in '${collectionPath}' collection with the specified criteria. Make sure users have phone numbers.`);
        }

        console.log(`📱 Sending WhatsApp to ${users.length} users from ${collectionPath}`);

        // Send bulk messages
        return await sendBulkWhatsApp(users, messageData, options);
    } catch (error) {
        console.error("❌ Error sending WhatsApp to Firestore users:", error.message);
        throw new Error(error.message || "Failed to send WhatsApp to Firestore users");
    }
};


export const validatePhoneNumbers = (users) => {
    const valid = [];
    const invalid = [];

    users.forEach(user => {
        if (!user.phone) {
            invalid.push({ ...user, reason: "Missing phone number" });
        } else {
            // Basic validation for Indian numbers
            const cleaned = user.phone.replace(/[^0-9+]/g, "");
            if (cleaned.startsWith("+91") && cleaned.length === 13) {
                valid.push(user);
            } else if (/^\d{10}$/.test(cleaned)) {
                valid.push({ ...user, phone: `+91${cleaned}` });
            } else if (cleaned.startsWith("+") && cleaned.length >= 10) {
                valid.push(user);
            } else {
                invalid.push({ ...user, reason: "Invalid format" });
            }
        }
    });

    return { valid, invalid };
};

export default {
    sendBulkWhatsApp,
    sendWhatsAppToFirestoreUsers,
    validatePhoneNumbers
};
