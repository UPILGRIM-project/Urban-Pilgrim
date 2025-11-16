const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Email configuration from environment variables (matching index.js)
const gmailEmail = process.env.APP_GMAIL;
const gmailPassword = process.env.APP_GMAIL_PASSWORD;
const contactEmail = process.env.CONTACT_EMAIL;

// Email transporter configuration (matching index.js setup)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

// Submit Workshop Request
exports.submitWorkshopRequest = functions.https.onCall(async (data, context) => {
    try {
        // Optional user authentication (removed requirement for testing)
        console.log('Workshop request received:', { data });
        console.log("contenx from submit backend: ", context);

        const {
            workshop,
            variant,
            participants,
            name,
            userId,
            email,
            mobile,
            address,
            venue,
            venueAddress,
            preferredDate,
            preferredTime,
            additionalNotes
        } = data.data || data;

        // Validate required fields
        if (!workshop || !name || !email || !mobile || !venue || !venueAddress) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }

        // Generate unique request ID
        const requestId = `WR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create request document
        const requestData = {
            requestId,
            userId: userId || 'anonymous',
            workshop,
            variant,
            participants,
            customerInfo: {
                name,
                email,
                mobile,
                address
            },
            venue: {
                name: venue,
                address: venueAddress
            },
            preferredSchedule: {
                date: preferredDate,
                time: preferredTime
            },
            additionalNotes,
            status: 'pending',
            // createdAt: FieldValue.serverTimestamp(),
            // updatedAt: FieldValue.serverTimestamp()
        };

        // Save to Firestore
        await db.collection('workshopRequests').doc(requestId).set(requestData);

        // Send email to admin
        await sendAdminNotificationEmail(requestData);

        return {
            success: true,
            requestId,
            message: 'Workshop request submitted successfully'
        };

    } catch (error) {
        console.error('Error submitting workshop request:', error);
        throw new functions.https.HttpsError('internal', 'Failed to submit workshop request');
    }
});

// Handle Admin Response (Approve/Reject)
exports.handleWorkshopRequestResponse = functions.https.onRequest(async (req, res) => {
    try {
        const { requestId, action, adminNotes } = req.query;

        if (!requestId || !action || !['approve', 'reject'].includes(action)) {
            return res.status(400).send('Invalid parameters');
        }

        // Get request document
        const requestDoc = await db.collection('workshopRequests').doc(requestId).get();

        if (!requestDoc.exists) {
            return res.status(404).send('Request not found');
        }

        const requestData = requestDoc.data();

        // Update request status
        await db.collection('workshopRequests').doc(requestId).update({
            status: action === 'approve' ? 'approved' : 'rejected',
            adminNotes: adminNotes || '',
            // processedAt: FieldValue.serverTimestamp(),
            // updatedAt: FieldValue.serverTimestamp()
        });

        // Send email to customer
        await sendCustomerResponseEmail(requestData, action, adminNotes);

        // Return success page
        res.send(`
            <html>
                <head>
                    <title>Request ${action === 'approve' ? 'Approved' : 'Rejected'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                        .success { color: #10b981; }
                        .error { color: #ef4444; }
                        .container { text-align: center; }
                        .button { background: #c16a00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="${action === 'approve' ? 'success' : 'error'}">
                            Request ${action === 'approve' ? 'Approved' : 'Rejected'}
                        </h1>
                        <p>The workshop request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.</p>
                        <p>The customer has been notified via email.</p>
                        <a href="https://urbanpilgrim.in/admin" class="button">Back to Admin Panel</a>
                    </div>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('Error handling workshop request response:', error);
        res.status(500).send('Internal server error');
    }
});

// Send Admin Notification Email
async function sendAdminNotificationEmail(requestData) {
    const baseUrl = process.env.FUNCTIONS_EMULATOR  === 'true' || process.env.NODE_ENV === 'ghf'
        ? 'http://127.0.0.1:5002/urban-pilgrim/us-central1'
        : 'https://handleworkshoprequestresponse-w7fradofka-uc.a.run.app';
    // const baseUrl = `http://127.0.0.1:5002/urban-pilgrim/us-central1`;
    const approveUrl = `${baseUrl}/handleWorkshopRequestResponse?requestId=${requestData.requestId}&action=approve`;
    const rejectUrl = `${baseUrl}/handleWorkshopRequestResponse?requestId=${requestData.requestId}&action=reject`;

    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>New Workshop Request</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #c16a00, #d4822a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .info-section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #c16a00; }
                .button-container { text-align: center; margin: 20px 0; }
                .approve-btn { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 0 10px; display: inline-block; }
                .reject-btn { background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 0 10px; display: inline-block; }
                .details { margin: 10px 0; }
                .label { font-weight: bold; color: #c16a00; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏛️ Urban Pilgrim</h1>
                    <h2>New Workshop Request</h2>
                </div>
                
                <div class="content">
                    <div class="info-section">
                        <h3>Workshop Details</h3>
                        <div class="details">
                            <p><span class="label">Workshop:</span> ${requestData.workshop.title}</p>
                            <p><span class="label">Participants:</span> ${requestData.participants}</p>
                            ${requestData.variant ? `<p><span class="label">Variant:</span> ${requestData.variant.name}</p>` : ''}
                            <p><span class="label">Price:</span> ₹${Number(requestData.workshop.price || 0).toLocaleString("en-IN")}</p>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>Customer Information</h3>
                        <div class="details">
                            <p><span class="label">Name:</span> ${requestData.customerInfo.name}</p>
                            <p><span class="label">Email:</span> ${requestData.customerInfo.email}</p>
                            <p><span class="label">Mobile:</span> ${requestData.customerInfo.mobile}</p>
                            ${requestData.customerInfo.address ? `<p><span class="label">Address:</span> ${requestData.customerInfo.address}</p>` : ''}
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>Venue Details</h3>
                        <div class="details">
                            <p><span class="label">Venue Name:</span> ${requestData.venue.name}</p>
                            <p><span class="label">Full Address:</span> ${requestData.venue.address}</p>
                        </div>
                    </div>

                    ${requestData.preferredSchedule.date || requestData.preferredSchedule.time ? `
                    <div class="info-section">
                        <h3>Preferred Schedule</h3>
                        <div class="details">
                            ${requestData.preferredSchedule.date ? `<p><span class="label">Date:</span> ${requestData.preferredSchedule.date}</p>` : ''}
                            ${requestData.preferredSchedule.time ? `<p><span class="label">Time:</span> ${requestData.preferredSchedule.time}</p>` : ''}
                        </div>
                    </div>
                    ` : ''}

                    ${requestData.additionalNotes ? `
                    <div class="info-section">
                        <h3>Additional Notes</h3>
                        <p>${requestData.additionalNotes}</p>
                    </div>
                    ` : ''}

                    <div class="button-container">
                        <a href="${approveUrl}" class="approve-btn">✅ Approve Request</a>
                        <a href="${rejectUrl}" class="reject-btn">❌ Reject Request</a>
                    </div>

                    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                        Request ID: ${requestData.requestId}<br>
                        Submitted: ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOptions = {
        from: requestData.customerInfo.email,
        to: gmailEmail,
        subject: `New Workshop Request - ${requestData.workshop.title}`,
        html: emailHtml
    };

    await transporter.sendMail(mailOptions);
}

// Send Customer Response Email
async function sendCustomerResponseEmail(requestData, action, adminNotes) {
    const isApproved = action === 'approve';
    console.log('Sending customer response email for request:', requestData, action, adminNotes);
    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Workshop Request ${isApproved ? 'Approved' : 'Rejected'}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #c16a00, #d4822a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .status-approved { background: #10b981; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .status-rejected { background: #ef4444; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .info-section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #c16a00; }
                .button { background: #c16a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; }
                .details { margin: 10px 0; }
                .label { font-weight: bold; color: #c16a00; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏛️ Urban Pilgrim</h1>
                    <h2>Workshop Request Update</h2>
                </div>
                
                <div class="content">
                    <div class="${isApproved ? 'status-approved' : 'status-rejected'}">
                        <h2>${isApproved ? '✅ Request Approved!' : '❌ Request Rejected'}</h2>
                        <p>${isApproved ? 'Great news! Your workshop request has been approved.' : 'We regret to inform you that your workshop request has been rejected.'}</p>
                    </div>

                    <div class="info-section">
                        <h3>Workshop Details</h3>
                        <div class="details">
                            <p><span class="label">Workshop:</span> ${requestData.workshop.title}</p>
                            <p><span class="label">Participants:</span> ${requestData.participants}</p>
                            <p><span class="label">Venue:</span> ${requestData.venue.name}</p>
                            <p><span class="label">Address:</span> ${requestData.venue.address}</p>
                            ${requestData.preferredSchedule.date ? `<p><span class="label">Preferred Date:</span> ${requestData.preferredSchedule.date}</p>` : ''}
                            ${requestData.preferredSchedule.time ? `<p><span class="label">Preferred Time:</span> ${requestData.preferredSchedule.time}</p>` : ''}
                        </div>
                    </div>

                    ${adminNotes ? `
                    <div class="info-section">
                        <h3>Admin Notes</h3>
                        <p>${adminNotes}</p>
                    </div>
                    ` : ''}

                    ${isApproved ? `
                    <div style="text-align: center;">
                        <p><strong>You can now proceed to book this workshop!</strong></p>
                        <a href="https://urbanpilgrim.in/workshop/${requestData.workshop.title.replace(/\s+/g, '-').toLowerCase()}/details" class="button">Book Now</a>
                    </div>
                    ` : `
                    <div style="text-align: center;">
                        <p>You can submit a new request with different details if needed.</p>
                        <a href="https://urbanpilgrim.in/workshop/${requestData.workshop.title.replace(/\s+/g, '-').toLowerCase()}/details" class="button">Try Again</a>
                    </div>
                    `}

                    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                        Request ID: ${requestData.requestId}<br>
                        For any queries, contact us at support@urbanpilgrim.com
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOptions = {
        from: gmailEmail,
        to: requestData.customerInfo.email,
        subject: `Workshop Request ${isApproved ? 'Approved' : 'Rejected'} - ${requestData.workshop.title}`,
        html: emailHtml
    };

    await transporter.sendMail(mailOptions);
}

// Get Request Status by RequestId (for frontend to check)
exports.getWorkshopRequestStatus = functions.https.onCall(async (data, context) => {
    const { requestId } = data.data;
    console.log("Getting request status for requestId:", requestId);

    if (!requestId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with a valid requestId."
        );
    }

    try {
        const snapshot = await db.collection("workshopRequests")
            .where("requestId", "==", requestId)
            .get();

        if (snapshot.empty) {
            return { status: "not_found" };
        }

        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Error getting workshop request status:", error);
        throw new functions.https.HttpsError("internal", "Error fetching status");
    }
});

// Get Request Status by Workshop ID and User ID (for frontend to check)
exports.getWorkshopRequestStatusByWorkshop = functions.https.onCall(async (data, context) => {
    try {
        const { workshopId, userId } = data.data;
        console.log("Getting request status for workshop:", workshopId, "user:", userId);

        if (!workshopId || !userId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "The function must be called with valid workshopId and userId."
            );
        }

        // Query for requests by this user for this workshop
        const snapshot = await db.collection("workshopRequests")
            .where("workshop.id", "==", workshopId)
            .where("userId", "==", userId)
            .get();

        console.log("🚀🚀snapshot: ",snapshot);
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Error getting workshop request status by workshop:", error);
        throw new functions.https.HttpsError("internal", "Error fetching status");
    }
});

