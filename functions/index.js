const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const easyinvoice = require("easyinvoice");
const Razorpay = require("razorpay");
const fs = require("fs");
const path = require("path");
const twilio = require("twilio");
const sharp = require("sharp");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { generateInvoicePdfBuffer } = require("./invoicePdfKit");
const { generateOrganizerInvoicePdfBuffer, } = require("./invoiceOrganizerPdfKit");

const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const cors = require("cors")({ origin: true });

let main_logo = null;
try {
    const logoPath = path.join(__dirname, "urban_pilgrim_logo.png");
    const buf = fs.readFileSync(logoPath);
    // Keep it small to avoid easyinvoice/image issues
    const MAX_BYTES = 2000 * 1024; // 200 KB
    if (buf && buf.length <= MAX_BYTES) {
        main_logo = buf.toString("base64");
        console.log("Logo loaded successfully");
    } else {
        console.log("Logo too large or missing, skipping logo in invoice");
    }
} catch (e) {
    console.log("Logo load failed:", e.message);
}

// Initialize Firebase Admin
if (
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.NODE_ENV === "development"
) {
    const serviceAcc = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAcc),
    });
    console.log("🔥 Running in local emulator/development");
} else {
    admin.initializeApp();
    console.log("🚀 Firebase initialized for production");
}

const db = admin.firestore();
try {
    admin.firestore().settings({ ignoreUndefinedProperties: true });
} catch (e) {
    console.log(e);
}

const { FieldValue, Timestamp } = require("firebase-admin/firestore");

async function generateInvoicePdfBase64({
    invoiceNumber,
    issueDateISO,
    buyer,
    items,
    totalAmount,
    currency = "INR",
    company,
    logoBase64,
    signatureBase64,
}) {
    // Helpers to sanitize numbers and strings
    const toNumber = (v, def = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
    };
    const toPositiveInt = (v, def = 1) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : def;
    };

    const defaultGst = toNumber(process.env.DEFAULT_GST_PERCENT, 18);

    // Sanitize items for easyinvoice
    let products = (Array.isArray(items) ? items : []).map((it) => {
        const title = (it?.title ?? "Item").toString().slice(0, 200) || "Item";
        const price = toNumber(it?.price, 0);
        const quantity = toPositiveInt(it?.quantity, 1);
        const rawGst = it?.taxRate ?? it?.gstRate ?? defaultGst ?? 0;
        let gst = toNumber(rawGst, 0);
        if (gst < 0) gst = 0; // clamp
        if (gst > 100) gst = 100;

        // Normalize SAC/HSN (alphanumeric + hyphen only, max 32)
        let sac = (it?.sac || it?.hsn || "").toString();
        sac = sac.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 32);

        const descParts = [title];
        if (it?.mode) descParts.push(String(it.mode));
        if (it?.subscriptionType) descParts.push(String(it.subscriptionType));
        if (it?.occupancyType) descParts.push(String(it.occupancyType));
        if (sac) descParts.push(`SAC/HSN: ${sac}`);

        return {
            quantity,
            description: descParts.filter(Boolean).join(" • "),
            taxRate: gst,
            price,
        };
    });

    // Ensure at least one product; if not, create a summary line
    if (!products.length) {
        products = [
            {
                quantity: 1,
                description: "Program(s)",
                taxRate: 0,
                price: toNumber(totalAmount, 0),
            },
        ];
    }

    // Validate base64 logo (optional)
    const images = {};
    const isBase64 = (s) =>
        typeof s === "string" && /^[A-Za-z0-9+/=]+$/.test(s);
    if (logoBase64 && isBase64(logoBase64) && logoBase64.length <= 2_000_000) {
        images.logo = `data:image/png;base64,${logoBase64}`;
    }
    if (
        signatureBase64 &&
        isBase64(signatureBase64) &&
        signatureBase64.length <= 2_000_000
    ) {
        images.background = `data:image/png;base64,${signatureBase64}`; // optional watermark/signature
    }

    const data = {
        images,
        sender: {
            company: company?.name || "Urban Pilgrim",
            address: company?.address || "India",
            zip: company?.zip || "",
            city: company?.city || "",
            country: company?.country || "India",
            custom1: company?.gstin ? `GSTIN: ${company.gstin}` : undefined,
            custom2: company?.stateCode
                ? `State Code: ${company.stateCode}`
                : undefined,
        },
        client: {
            company: buyer?.name || buyer?.email || "Customer",
            address: buyer?.address || "",
            zip: buyer?.zip || "",
            city: buyer?.city || "",
            country: buyer?.country || "India",
            custom1: buyer?.email ? `Email: ${buyer.email}` : undefined,
            custom2: buyer?.gstin ? `GSTIN: ${buyer.gstin}` : undefined,
            custom3: buyer?.stateCode
                ? `State Code: ${buyer.stateCode}`
                : undefined,
        },
        information: {
            number: invoiceNumber,
            date: (issueDateISO
                ? new Date(issueDateISO)
                : new Date()
            ).toLocaleDateString("en-IN"),
        },
        products,
        bottomNotice: "Thank you for choosing Urban Pilgrim.",
        settings: {
            currency,
            locale: "en-IN",
            taxNotation: "gst",
        },
        // translate labels closer to Indian tax invoice
        translate: {
            invoice: "TAX INVOICE",
            number: "Invoice No.",
            date: "Invoice Date",
            products: "Items",
            quantity: "Qty",
            price: "Taxable Value",
            productTotal: "Taxable Value",
            subtotal: "Taxable Value",
            vat: "GST",
            total: "Total Amount",
        },
    };

    try {
        const result = await easyinvoice.createInvoice(data);
        return result?.pdf; // base64 string
    } catch (err) {
        console.error("easyinvoice.createInvoice failed", {
            message: err?.message,
        });
        throw err;
    }
}

// Helper function to create gift card image with coupon code overlay
async function createGiftCardWithCoupon(couponCode) {
    try {
        const inputImagePath = path.join(__dirname, "gift_card.jpg");
        const outputImagePath = path.join(
            __dirname,
            `gift_card_${couponCode}.jpg`
        );

        // Get image dimensions
        const metadata = await sharp(inputImagePath).metadata();
        const imageWidth = metadata.width || 800;
        const imageHeight = metadata.height || 600;

        // Create SVG overlay with coupon code text at 73% height from top
        const overlayYPosition = Math.floor(imageHeight * 0.73);

        const svgOverlay = `
        <svg width="${imageWidth}" height="${imageHeight}">
            <style>
                .coupon-label { fill: rgb(197, 112, 63); font-size: 20px; font-weight: 600; font-family: Arial; letter-spacing: 2px; text-transform: uppercase; }
                .coupon-code { fill: rgb(197, 112, 63); font-size: 56px; font-weight: bold; font-family: Arial; letter-spacing: 8px; }
            </style>
            <text x="${
                imageWidth / 2
            }" y="${overlayYPosition}" text-anchor="middle" class="coupon-label">YOUR COUPON CODE</text>
            <text x="${imageWidth / 2}" y="${
            overlayYPosition + 65
        }" text-anchor="middle" class="coupon-code">${couponCode}</text>
        </svg>`;

        // Composite the SVG overlay onto the image
        await sharp(inputImagePath)
            .composite([
                {
                    input: Buffer.from(svgOverlay),
                    top: 0,
                    left: 0,
                },
            ])
            .toFile(outputImagePath);

        console.log("✅ Gift card with coupon created:", outputImagePath);
        return outputImagePath;
    } catch (error) {
        console.error("Error creating gift card with coupon:", error);
        return null;
    }
}

async function addUserToProgram(
    db,
    organiserMeta,
    categoryKey,
    programTitle,
    programInfo,
    userInfo
) {
    try {
        const email = organiserMeta?.email;
        if (!email || !programTitle || !userInfo?.userId) {
            console.log("Missing required fields:", {
                email,
                programTitle,
                userId: userInfo?.userId,
            });
            return;
        }

        // 1) Find organizer by email in "organizers" collection
        const organizersRef = db.collection("organizers");
        const snapshot = await organizersRef
            .where("email", "==", email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log(
                `No organizer found with email: ${email}. Cannot add user to program.`
            );
            return;
        }

        const organizerDocRef = snapshot.docs[0].ref;
        const organizerData = snapshot.docs[0].data() || {};

        // 2) Get existing programs array
        let programs = Array.isArray(organizerData.programs)
            ? organizerData.programs
            : [];

        // 3) Find the program by matching title
        const programIndex = programs.findIndex(
            (p) => p.title === programTitle
        );

        if (programIndex === -1) {
            console.log(
                `Program "${programTitle}" not found for organizer ${email}. Cannot add user.`
            );
            return;
        }

        // 4) Get the program
        let program = programs[programIndex];

        // 5) Ensure users array exists
        if (!Array.isArray(program.users)) {
            program.users = [];
        }

        // 6) Build user slots array from programInfo
        const userSlots = [];
        const slotsArr = Array.isArray(programInfo?.slots)
            ? programInfo.slots
            : [];

        for (const slot of slotsArr) {
            userSlots.push({
                date: slot?.date || null,
                startTime: slot?.startTime || null,
                endTime: slot?.endTime || null,
                location: slot?.location || null,
                type: slot?.type || null,
                status: slot?.status || "pending",
            });
        }

        // 7) Check if user already exists in this program
        const existingUserIndex = program.users.findIndex(
            (u) => u.userId === userInfo.userId
        );

        if (existingUserIndex !== -1) {
            // User exists - merge their slots
            const existingUser = program.users[existingUserIndex];
            const existingSlots = Array.isArray(existingUser.slots)
                ? existingUser.slots
                : [];

            // Merge slots (avoid exact duplicates)
            const mergedSlots = [...existingSlots];
            for (const newSlot of userSlots) {
                const isDuplicate = existingSlots.some(
                    (s) =>
                        s.date === newSlot.date &&
                        s.startTime === newSlot.startTime &&
                        s.endTime === newSlot.endTime
                );
                if (!isDuplicate) {
                    mergedSlots.push(newSlot);
                }
            }

            // Update existing user
            program.users[existingUserIndex] = {
                userId: userInfo.userId,
                name: userInfo.name || existingUser.name || "",
                email: userInfo.email || existingUser.email || "",
                phone: userInfo.phone || existingUser.phone || null,
                slots: mergedSlots,
                updatedAt: new Date().toISOString(),
            };
        } else {
            // New user - add to users array
            program.users.push({
                userId: userInfo.userId,
                name: userInfo.name || "",
                email: userInfo.email || "",
                phone: userInfo.phone || null,
                slots: userSlots,
                addedAt: new Date().toISOString(),
            });
        }

        // 8) Update the program in the array
        programs[programIndex] = program;

        // 9) Save back to Firestore
        await organizerDocRef.update({
            programs: programs,
            updatedAt: new Date().toISOString(),
        });

        console.log(
            `Successfully added user ${userInfo.userId} to program "${programTitle}" for organizer ${email}`
        );
        return { success: true, organizerId: organizerDocRef.id };
    } catch (err) {
        console.error("addUserToProgram failed:", {
            email: organiserMeta?.email,
            programTitle,
            userId: userInfo?.userId,
            error: err?.message,
            stack: err?.stack,
        });
        throw err;
    }
}

exports.bookLiveSessionSlot = functions.https.onCall(async (data, context) => {
    const { sessionTitle, date, startTime, endTime, occupancyType, userId } =
        data.data || {};

    if (
        !sessionTitle ||
        !date ||
        !startTime ||
        !endTime ||
        !occupancyType ||
        !userId
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required parameters"
        );
    }

    const docRef = db
        .collection("pilgrim_sessions")
        .doc("pilgrim_sessions")
        .collection("sessions")
        .doc("liveSession");

    return await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Live sessions data not found"
            );
        }

        const dataObj = snap.data() || {};
        const slides = Array.isArray(dataObj.slides) ? [...dataObj.slides] : [];
        const idx = slides.findIndex((s) => {
            const title = (s?.liveSessionCard?.title || "").toString();
            return title === sessionTitle;
        });
        if (idx === -1) {
            throw new functions.https.HttpsError(
                "not-found",
                "Live session not found"
            );
        }

        const slide = { ...slides[idx] };
        const liveSlots = Array.isArray(slide.liveSlots)
            ? [...slide.liveSlots]
            : [];

        // Find the specific slot
        const slotIndex = liveSlots.findIndex(
            (slot) =>
                slot.date === date &&
                slot.startTime === startTime &&
                slot.endTime === endTime
        );

        if (slotIndex === -1) {
            throw new functions.https.HttpsError("not-found", "Slot not found");
        }

        const currentSlot = { ...liveSlots[slotIndex] };
        const occType = occupancyType.toLowerCase();

        // Determine capacity
        let maxCap = 1;
        if (occType === "couple" || occType === "twin") {
            maxCap = 2;
        } else if (occType === "group") {
            const gMax = Number(slide?.oneTimeSubscription?.groupMax || 0);
            if (!gMax || gMax <= 0) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "Group max not configured"
                );
            }
            maxCap = gMax;
        }

        // Check if slot is locked for different occupancy type
        const existingLock = currentSlot.lockedForType;
        if (existingLock && existingLock !== occType) {
            throw new functions.https.HttpsError(
                "failed-precondition",
                `Slot is locked for ${existingLock} bookings`
            );
        }

        const booked = Number(currentSlot.bookedCount || 0);
        if (booked >= maxCap) {
            throw new functions.https.HttpsError(
                "resource-exhausted",
                "Slot is full"
            );
        }

        // Update slot
        currentSlot.bookedCount = booked + 1;
        currentSlot.lockedForType = existingLock || occType; // Lock on first booking
        liveSlots[slotIndex] = currentSlot;

        slides[idx] = {
            ...slide,
            liveSlots,
            bookings: [
                ...(Array.isArray(slide.bookings) ? slide.bookings : []),
                {
                    userId,
                    at: new Date().toISOString(),
                    occupancyType: occType,
                    date,
                    startTime,
                    endTime,
                },
            ],
        };

        tx.update(docRef, { slides });
        return {
            success: true,
            bookedCount: currentSlot.bookedCount,
            maxCap,
            lockedForType: currentSlot.lockedForType,
        };
    });
});

exports.cancelLiveSessionSlot = functions.https.onCall(
    async (data, context) => {
        const {
            sessionTitle,
            date,
            startTime,
            endTime,
            occupancyType,
            userId,
        } = data.data || {};

        if (
            !sessionTitle ||
            !date ||
            !startTime ||
            !endTime ||
            !occupancyType
        ) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Missing required parameters"
            );
        }

        const docRef = db
            .collection("pilgrim_sessions")
            .doc("pilgrim_sessions")
            .collection("sessions")
            .doc("liveSession");

        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists)
                throw new functions.https.HttpsError(
                    "not-found",
                    "Live sessions data not found"
                );

            const dataObj = snap.data() || {};
            const slides = Array.isArray(dataObj.slides)
                ? [...dataObj.slides]
                : [];
            const idx = slides.findIndex(
                (s) => (s?.liveSessionCard?.title || "") === sessionTitle
            );
            if (idx === -1)
                throw new functions.https.HttpsError(
                    "not-found",
                    "Live session not found"
                );

            const slide = { ...slides[idx] };
            const liveSlots = Array.isArray(slide.liveSlots)
                ? [...slide.liveSlots]
                : [];

            const slotIndex = liveSlots.findIndex(
                (slot) =>
                    slot.date === date &&
                    slot.startTime === startTime &&
                    slot.endTime === endTime
            );

            if (slotIndex === -1)
                throw new functions.https.HttpsError(
                    "not-found",
                    "Slot not found"
                );

            const currentSlot = { ...liveSlots[slotIndex] };
            const booked = Number(currentSlot.bookedCount || 0);
            currentSlot.bookedCount = Math.max(0, booked - 1);

            // Remove lock if no more bookings
            if (currentSlot.bookedCount === 0) {
                delete currentSlot.lockedForType;
            }

            liveSlots[slotIndex] = currentSlot;

            slides[idx] = {
                ...slide,
                liveSlots,
                bookings: (Array.isArray(slide.bookings)
                    ? slide.bookings
                    : []
                ).filter(
                    (b) =>
                        !(
                            b.userId === userId &&
                            b.date === date &&
                            b.startTime === startTime &&
                            b.endTime === endTime &&
                            b.occupancyType === occupancyType.toLowerCase()
                        )
                ),
            };

            tx.update(docRef, { slides });
            return { success: true, bookedCount: currentSlot.bookedCount };
        });
    }
);

exports.bookGuideMonthlyWeeklySlot = functions.https.onCall(
    async (data, context) => {
        const { guideTitle, mode, rowIdx, tIdx, type, userId } =
            data.data || {};

        if (
            !guideTitle ||
            !mode ||
            rowIdx === undefined ||
            tIdx === undefined ||
            !type ||
            !userId
        ) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Missing required parameters"
            );
        }

        const modeKey = (mode || "").toLowerCase(); // 'online' | 'offline'
        if (!["online", "offline"].includes(modeKey)) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Invalid mode"
            );
        }

        const docRef = db
            .collection("pilgrim_guides")
            .doc("pilgrim_guides")
            .collection("guides")
            .doc("data");

        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "Guides data not found"
                );
            }

            const dataObj = snap.data() || {};
            const slides = Array.isArray(dataObj.slides)
                ? [...dataObj.slides]
                : [];
            const idx = slides.findIndex((s) => {
                const title = (
                    s?.guideCard?.title ||
                    s?.title ||
                    ""
                ).toString();
                return title === guideTitle;
            });
            if (idx === -1) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "Guide slide not found"
                );
            }

            const slide = { ...slides[idx] };
            const monthly = slide?.[modeKey]?.monthly;
            if (!monthly || !Array.isArray(monthly.weeklyPattern)) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "Weekly pattern not configured"
                );
            }

            if (!monthly.weeklyPattern[rowIdx]) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Row index out of range"
                );
            }
            const row = { ...monthly.weeklyPattern[rowIdx] };
            const times = Array.isArray(row.times) ? [...row.times] : [];
            if (!times[tIdx]) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Time index out of range"
                );
            }
            const timeItem = { ...times[tIdx] };

            // Enforce type consistency
            const timeType = timeItem.type || "individual";
            if (timeType !== type) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "Slot type mismatch"
                );
            }

            // Determine capacity
            let maxCap = 1;
            if (type === "couple") maxCap = 2;
            else if (type === "group") {
                const gMax = Number(slide?.[modeKey]?.monthly?.groupMax || 0);
                if (!gMax || gMax <= 0) {
                    throw new functions.https.HttpsError(
                        "failed-precondition",
                        "Group max not configured"
                    );
                }
                maxCap = gMax;
            }

            const booked = Number(timeItem.bookedCount || 0);
            if (booked >= maxCap) {
                throw new functions.https.HttpsError(
                    "resource-exhausted",
                    "Slot is full"
                );
            }

            // Increment booked count
            timeItem.bookedCount = booked + 1;
            times[tIdx] = timeItem;
            row.times = times;
            const pattern = [...monthly.weeklyPattern];
            pattern[rowIdx] = row;

            slides[idx] = {
                ...slide,
                [modeKey]: {
                    ...slide[modeKey],
                    monthly: {
                        ...monthly,
                        weeklyPattern: pattern,
                    },
                },
                bookings: [
                    ...(Array.isArray(slide.bookings) ? slide.bookings : []),
                    {
                        userId,
                        at: new Date().toISOString(),
                        mode: modeKey,
                        subscriptionType: "monthly",
                        rowIdx,
                        tIdx,
                        type,
                    },
                ],
            };

            tx.update(docRef, { slides });
            return { success: true, bookedCount: timeItem.bookedCount, maxCap };
        });
    }
);

exports.cancelGuideMonthlyWeeklySlot = functions.https.onCall(
    async (data, context) => {
        const { guideTitle, mode, rowIdx, tIdx, type, userId } =
            data.data || {};
        const modeKey = (mode || "").toLowerCase();
        if (
            !guideTitle ||
            !modeKey ||
            rowIdx === undefined ||
            tIdx === undefined ||
            !type
        ) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Missing required parameters"
            );
        }

        const docRef = db
            .collection("pilgrim_guides")
            .doc("pilgrim_guides")
            .collection("guides")
            .doc("data");

        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists)
                throw new functions.https.HttpsError(
                    "not-found",
                    "Guides data not found"
                );

            const dataObj = snap.data() || {};
            const slides = Array.isArray(dataObj.slides)
                ? [...dataObj.slides]
                : [];
            const idx = slides.findIndex(
                (s) => (s?.guideCard?.title || s?.title || "") === guideTitle
            );
            if (idx === -1)
                throw new functions.https.HttpsError(
                    "not-found",
                    "Guide slide not found"
                );

            const slide = { ...slides[idx] };
            const monthly = slide?.[modeKey]?.monthly;
            if (!monthly || !Array.isArray(monthly.weeklyPattern))
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "Weekly pattern not configured"
                );
            const row = { ...(monthly.weeklyPattern[rowIdx] || {}) };
            const times = Array.isArray(row.times) ? [...row.times] : [];
            const timeItem = { ...(times[tIdx] || {}) };

            if ((timeItem.type || "individual") !== type)
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "Slot type mismatch"
                );

            const booked = Number(timeItem.bookedCount || 0);
            timeItem.bookedCount = Math.max(0, booked - 1);
            times[tIdx] = timeItem;
            row.times = times;
            const pattern = [...monthly.weeklyPattern];
            pattern[rowIdx] = row;

            slides[idx] = {
                ...slide,
                [modeKey]: {
                    ...slide[modeKey],
                    monthly: {
                        ...monthly,
                        weeklyPattern: pattern,
                    },
                },
                bookings: (Array.isArray(slide.bookings)
                    ? slide.bookings
                    : []
                ).filter(
                    (b) =>
                        !(
                            b.userId === userId &&
                            b.mode === modeKey &&
                            b.subscriptionType === "monthly" &&
                            b.rowIdx === rowIdx &&
                            b.tIdx === tIdx &&
                            b.type === type
                        )
                ),
            };

            tx.update(docRef, { slides });
            return { success: true, bookedCount: timeItem.bookedCount };
        });
    }
);

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const gmailEmail = process.env.APP_GMAIL;
const gmailPassword = process.env.APP_GMAIL_PASSWORD;
const contactEmail = process.env.CONTACT_EMAIL;

function getTwilioClient() {
    try {
        const sid = process.env.TWILIO_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (!sid || !token) {
            console.error("Twilio credentials not configured");
            return null;
        }
        return twilio(sid, token);
    } catch (e) {
        console.error("Error getting Twilio client:", e);
        return null;
    }
}

function formatPhoneNumber(raw) {
    try {
        if (!raw) return null;
        let s = String(raw).replace(/[^0-9+]/g, "");
        // If already starts with +, assume E.164
        if (s.startsWith("+")) return s;
        // Handle common Indian numbers (10 digits) by prefixing +91
        if (/^\d{10}$/.test(s)) return "+91" + s;
        // If 12-13 digits without +, try prefix with +
        if (/^\d{11,13}$/.test(s)) return "+" + s;
        return null;
    } catch {
        return null;
    }
}

async function sendWhatsApp(toE164, body, useTemplate = false) {
    if (!toE164) return { ok: false, error: "No phone" };
    try {
        const client = getTwilioClient();
        if (!client)
            return { ok: false, error: "Twilio client not configured" };

        const messagingServiceSid =
            process.env.TWILIO_MESSAGING_SERVICE_SID || "";
        const envFrom = process.env.TWILIO_WHATSAPP_FROM || "";
        const from = envFrom
            ? envFrom.startsWith("whatsapp:")
                ? envFrom
                : `whatsapp:${envFrom}`
            : "whatsapp:+15558599523";

        let params = { to: `whatsapp:${toE164}` };

        if (messagingServiceSid) {
            params.messagingServiceSid = messagingServiceSid;
        } else {
            params.from = from;
        }
        console.log("body: ", body);

        if (useTemplate) {
            // send template
            params.contentSid = "HX142acb9807b604071eb5dd0fba816a01"; // your template SID
            params.contentVariables = JSON.stringify({
                1: body.name || "user",
                2: body.titles || "wellness",
                3: body.amount || 0,
                4: body.paymentId || "1234567890",
            });
        } else {
            // fallback free-text
            params.body = body;
        }

        const res = await client.messages.create(params);
        return { ok: true, sid: res.sid };
    } catch (err) {
        console.error("WhatsApp send error:", err);
        return { ok: false, error: err?.message };
    }
}

async function sendWhatsAppOTP(toE164, body, useTemplate = false) {
    if (!toE164) return { ok: false, error: "No phone" };
    try {
        const client = getTwilioClient();
        if (!client)
            return { ok: false, error: "Twilio client not configured" };

        const messagingServiceSid =
            process.env.TWILIO_MESSAGING_SERVICE_SID || "";
        const envFrom = process.env.TWILIO_WHATSAPP_FROM || "";
        const from = envFrom
            ? envFrom.startsWith("whatsapp:")
                ? envFrom
                : `whatsapp:${envFrom}`
            : "whatsapp:+15558599523";

        let params = { to: `whatsapp:${toE164}` };

        if (messagingServiceSid) {
            params.messagingServiceSid = messagingServiceSid;
        } else {
            params.from = from;
        }
        console.log("body: ", body);

        if (useTemplate) {
            // send template
            params.contentSid = "HX9c74a88c52f7a8dc13b1805f4fe489e6"; // your template SID
            params.contentVariables = JSON.stringify({
                1:
                    body ||
                    `Hi, your Urban Pilgrim verification code is ${body}.\nThis code will expire in 5 minutes.\n\n Urban Pilgrim`,
            });
        } else {
            // fallback free-text
            params.body = body;
        }

        const res = await client.messages.create(params);
        return { ok: true, sid: res.sid };
    } catch (err) {
        console.error("WhatsApp send error:", err);
        return { ok: false, error: err?.message };
    }
}

async function sendWhatsApp2(toE164, body, useTemplate = false) {
    if (!toE164) return { ok: false, error: "No phone" };
    try {
        const client = getTwilioClient();
        if (!client)
            return { ok: false, error: "Twilio client not configured" };

        const messagingServiceSid =
            process.env.TWILIO_MESSAGING_SERVICE_SID || "";
        const envFrom = process.env.TWILIO_WHATSAPP_FROM || "";
        const from = envFrom
            ? envFrom.startsWith("whatsapp:")
                ? envFrom
                : `whatsapp:${envFrom}`
            : "whatsapp:+15558599523";

        let params = { to: `whatsapp:${toE164}` };

        if (messagingServiceSid) {
            params.messagingServiceSid = messagingServiceSid;
        } else {
            params.from = from;
        }
        console.log("body: ", body);

        if (useTemplate) {
            // send template
            params.contentSid = "HXc4dd8c286a32c98e4fe55f60e6cf28f7"; // your template SID
            params.contentVariables = JSON.stringify({
                1: body.name,
                2: body.titles,
                3: body.mode,
                4: body.occupancyType,
            });
        } else {
            // fallback free-text
            params.body = body;
        }

        const res = await client.messages.create(params);
        return { ok: true, sid: res.sid };
    } catch (err) {
        console.error("WhatsApp send error:", err);
        return { ok: false, error: err?.message };
    }
}

async function createWhatsAppReminderDocs({
    userId,
    name,
    phoneE164,
    program,
    slots,
}) {
    try {
        if (!phoneE164 || !Array.isArray(slots) || slots.length === 0) {
            // Send immediate confirmation
            await sendWhatsApp(
                phoneE164,
                `Hi ${name}, thanks for registering for ${program.title}. We’ll notify you about upcoming sessions.`
            );
            return;
        }

        const remindersCol = db.collection("whatsapp_reminders");
        const batch = db.batch();
        const now = new Date();
        let createdCount = 0;

        for (const slot of slots) {
            const startStr = slot?.startTime || slot?.start_time;
            const endStr = slot?.endTime || slot?.end_time;
            if (!startStr) continue;
            const startDate = new Date(startStr);
            if (isNaN(startDate.getTime())) continue;

            const template = (minutes) =>
                `Reminder: Your Urban Pilgrim session "${program.title}" starts in ${minutes} minutes.\n` +
                `Date: ${new Date(slot.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                })}\n` +
                `Time: ${
                    startStr.split("T")[1]?.split("+")[0] || startStr
                } (Asia/Kolkata)\n` +
                `Mode: ${program.mode}${
                    program.occupancyType ? ` • ${program.occupancyType}` : ""
                }`;

            const remind60 = new Date(startDate.getTime() - 60 * 60 * 1000);
            const remind30 = new Date(startDate.getTime() - 30 * 60 * 1000);

            for (const m of [60, 30]) {
                const sendAtDate = m === 60 ? remind60 : remind30;
                if (sendAtDate.getTime() < now.getTime() - 60 * 1000) continue;

                const docRef = remindersCol.doc();
                batch.set(docRef, {
                    status: "pending",
                    createdAt: admin.firestore.Timestamp.now(),
                    sendAt: admin.firestore.Timestamp.fromDate(sendAtDate),
                    to: phoneE164,
                    userId,
                    name,
                    programTitle: program.title,
                    programMode: program?.mode || null,
                    occupancyType: program.occupancyType || null,
                    minutesBefore: m,
                    slot: {
                        date: slot.date,
                        startTime: startStr,
                        endTime: endStr || null,
                    },
                    message: template(m),
                });
                createdCount++;
            }
        }

        await batch.commit();
        console.log(
            `WA: reminder docs created { count: ${createdCount}, title: '${program.title}' }`
        );

        // 🔔 NEW: Send immediate confirmation
        await sendWhatsApp(
            phoneE164,
            `✅ Your Urban Pilgrim booking for "${program.title}" is confirmed! We’ll remind you before it starts.`
        );
    } catch (e) {
        console.error("Failed creating WhatsApp reminder docs:", e);
    }
}

// Sanitize a single content variable: remove newlines/tabs, collapse spaces, trim
// NOTE: Twilio Error 21656 means content variables CANNOT contain \n \r \t.
// Newlines must be baked into the Twilio template body itself, not passed as variables.
function sanitizeVariable(input) {
    if (input === null || input === undefined) return "";
    let s = String(input);
    // Replace newlines and tabs with a single space
    s = s.replace(/[\r\n\t]+/g, " ");
    // Collapse multiple spaces to single
    s = s.replace(/ {2,}/g, " ");
    // Trim
    s = s.trim();
    return s;
}

// Keep only allowed template variable keys and sanitize their values
function sanitizeVariablesObject(vars) {
    const allowed = ["1", "2", "3", "4"]; // "1"=name, "2"=message, "3"=extra paragraph, "4"=media var
    const out = {};
    if (!vars || typeof vars !== 'object') return out;
    for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
            out[k] = sanitizeVariable(vars[k]);
        }
    }
    return out;
}

async function sendBulkWhatsApp({
    users = [],
    messageText = "",
    contentSid = null,
    extraParagraph = "",
    batchSize = 10,
    delayMs = 1000
}) {
    if (!users || users.length === 0) {
        return { success: 0, failed: 0, errors: ["No users provided"] };
    }

    const client = getTwilioClient();
    if (!client) {
        return {
            success: 0,
            failed: users.length,
            errors: ["Twilio client not configured"]
        };
    }

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID_BULK;

    if (!messagingServiceSid) {
        return {
            success: 0,
            failed: users.length,
            errors: ["Messaging Service SID not configured"]
        };
    }

    if (!contentSid) {
        return {
            success: 0,
            failed: users.length,
            errors: ["contentSid is required for template messages"]
        };
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const promises = batch.map(async (user) => {
            const name = user.name || "User";
            const phone = formatPhoneNumber(user.phone);

            if (!phone) {
                results.failed++;
                results.errors.push(`Invalid phone for ${name}`);
                return;
            }

            try {
                // Build raw variables — support both plain string and { contentVariables: {...} } object
                let rawVars;
                if (messageText && typeof messageText === 'object' && messageText.contentVariables) {
                    // Media (or other object) template: merge name into provided vars
                    rawVars = { "1": name, ...messageText.contentVariables };
                } else {
                    rawVars = {
                        "1": name,
                        "2": String(messageText).replace("{name}", name)
                    };
                }

                // Sanitize and only keep allowed keys ("1", "2", "3")
                let variables = sanitizeVariablesObject(rawVars);

                // Validate {{2}} only if it was intentionally included in the payload
                if ("2" in variables && (!variables["2"] || variables["2"].length === 0)) {
                    results.failed++;
                    results.errors.push(`Failed for ${name}: template variable {{2}} is empty or invalid`);
                    console.error(`❌ Invalid contentVariables for ${name}:`, variables);
                    return;
                }

                console.log("📨 Sending with vars (sanitized):", variables);

                await client.messages.create({
                    messagingServiceSid,
                    to: `whatsapp:${phone}`,
                    contentSid,
                    contentVariables: JSON.stringify(variables)
                });

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(
                    `Failed for ${name}: ${err.message}`
                );
                console.error(`❌ Failed for ${name}`, err.message);
            }
        });

        await Promise.all(promises);

        if (i + batchSize < users.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return results;
}

// Exported Cloud Function for bulk WhatsApp messaging
exports.sendBulkWhatsAppMessages = functions.https.onCall(async (request) => {
    try {
        const { users, messageText, contentSid, extraParagraph = "" } = request.data;

        if (!users || !Array.isArray(users) || users.length === 0) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Users array is required"
            );
        }

        const result = await sendBulkWhatsApp({
            users,
            messageText,
            contentSid,
            extraParagraph
        });

        return { success: true, ...result };
    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError(
            "internal",
            error.message
        );
    }
});

exports.processWhatsappReminders = onSchedule(
    {
        schedule: "every minute",
        timeZone: "Asia/Kolkata",
        memory: "256MiB",
        timeoutSeconds: 300,
        region: "us-central1",
    },
    async () => {
        try {
            const nowTs = admin.firestore.Timestamp.now();
            const snap = await db
                .collection("whatsapp_reminders")
                .where("status", "==", "pending")
                .where("sendAt", "<=", nowTs)
                .limit(50)
                .get();

            if (snap.empty) return null;
            console.log(`Processing ${snap.size} WhatsApp reminders...`);

            for (const doc of snap.docs) {
                const data = doc.data();
                const body =
                    data.message ||
                    `Reminder: Your Urban Pilgrim session "${data.programTitle}" is starting soon.`;
                const res = await sendWhatsApp(data.to, body);
                if (res.ok) {
                    await doc.ref.update({
                        status: "sent",
                        sentAt: admin.firestore.Timestamp.now(),
                        sid: res.sid,
                    });
                } else {
                    await doc.ref.update({
                        status: "error",
                        error: res.error,
                        updatedAt: admin.firestore.Timestamp.now(),
                    });
                }
            }
            return null;
        } catch (err) {
            console.error("processWhatsappReminders error:", err);
            return null;
        }
    }
);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

exports.sendOtp = functions.https.onCall(async (data, context) => {
    console.log("data from sendOtp", data.data);
    const { email, whatsappNumber } = data.data;
    if (!email) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Email required"
        );
    }

    const Otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    const ExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db
        .collection("emailOtps")
        .doc(email)
        .set({ Otp, ExpiresAt, whatsappNumber });

    // Send OTP email
    await transporter.sendMail({
        from: gmailEmail,
        to: email,
        subject: "Your Urban Pilgrim Verification Code",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Urban Pilgrim OTP</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #2F6288 0%, #C5703F 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Urban Pilgrim</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your Wellness Journey Awaits</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #2F6288; margin: 0 0 10px 0; font-size: 24px;">Verification Code</h2>
                            <p style="color: #666; margin: 0; font-size: 16px;">Enter this code to complete your login</p>
                        </div>
                        
                        <!-- OTP Code -->
                        <div style="background: #f8f9fa; border: 2px dashed #C5703F; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                            <div style="font-size: 36px; font-weight: bold; color: #2F6288; letter-spacing: 8px; font-family: 'Courier New', monospace;">${Otp}</div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">This code will expire in <strong style="color: #C5703F;">5 minutes</strong></p>
                            <p style="color: #999; margin: 0; font-size: 13px;">If you didn't request this code, please ignore this email.</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="color: #999; margin: 0; font-size: 12px;">© 2025 Urban Pilgrim. All rights reserved.</p>
                        <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    });

    // Send OTP via WhatsApp
    try {
        const formattedNumber = formatPhoneNumber(whatsappNumber);
        if (formattedNumber) {
            // Use approved template with OTP as variable
            const result = await sendWhatsAppOTP(
                formattedNumber,
                `${Otp}`,
                true
            );
            if (result.ok) {
                console.log(
                    `WhatsApp OTP sent to ${formattedNumber}, SID: ${result.sid}`
                );
            } else {
                console.error("Failed to send WhatsApp OTP:", result.error);
            }
        } else {
            console.error("Invalid WhatsApp number format");
        }
    } catch (whatsappError) {
        console.error("Error sending WhatsApp OTP:", whatsappError);
    }

    return { success: true };
});

exports.verifyOtp = functions.https.onCall(async (data, context) => {
    console.log("data from verifyOtp", data.data);
    const { email, otp } = data.data;
    const doc = await db.collection("emailOtps").doc(email).get();

    if (!doc.exists)
        throw new functions.https.HttpsError("not-found", "OTP not found");

    console.log("OTP document found:", doc.data());
    const { Otp, ExpiresAt } = doc.data();
    console.log("OTP:", Otp, "ExpiresAt:", ExpiresAt);

    if (Date.now() > ExpiresAt)
        throw new functions.https.HttpsError(
            "deadline-exceeded",
            "OTP expired"
        );

    if (Number(Otp) !== Number(otp))
        throw new functions.https.HttpsError("invalid-argument", "Invalid OTP");
    console.log("OTP verified successfully");

    // Create or get Firebase Auth user
    let user;
    try {
        user = await admin.auth().getUserByEmail(email);
    } catch {
        user = await admin.auth().createUser({ email });
    }

    // Generate custom token
    console.log("Generating custom token for user:", user);
    const token = await admin.auth().createCustomToken(user.uid, {
        role: "user",
    });

    // Delete OTP after use
    await db.collection("emailOtps").doc(email).delete();

    return { token };
});

exports.sendAdminOtp = functions.https.onCall(async (data, context) => {
    console.log("data from sendAdminOtp", data.data);
    const { email } = data.data;
    if (!email)
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Email required"
        );

    // Check if email is authorized admin email
    const adminQuery = await db
        .collection("admins")
        .where("email", "==", email)
        .get();
    if (adminQuery.empty) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "This email is not authorized as an admin. Please contact the system administrator."
        );
    }

    // Check if admin is active
    const adminData = adminQuery.docs[0].data();
    if (adminData.isActive === false) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Admin account is deactivated. Please contact the system administrator."
        );
    }

    const Otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    const ExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.collection("adminOtps").doc(email).set({ Otp, ExpiresAt });

    // Send OTP email
    await transporter.sendMail({
        from: gmailEmail,
        to: email,
        subject: "Urban Pilgrim Admin Portal - Verification Code",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Urban Pilgrim Admin OTP</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Urban Pilgrim Admin</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Admin Portal Access</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 24px;">Admin Verification Code</h2>
                            <p style="color: #666666; margin: 0; font-size: 16px; line-height: 1.5;">Enter this code to access the admin dashboard</p>
                        </div>
                        
                        <!-- OTP Display -->
                        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                            <div style="font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 8px; margin-bottom: 10px;">${Otp}</div>
                            <p style="color: #1e40af; margin: 0; font-size: 14px; font-weight: 500;">This code expires in 5 minutes</p>
                        </div>
                        
                        <!-- Security Notice -->
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">🔒 Security Notice</p>
                            <p style="color: #92400e; margin: 5px 0 0 0; font-size: 13px;">This is an admin access code. Do not share this code with anyone. All admin access is logged and monitored.</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #666666; margin: 0; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; margin: 0; font-size: 12px;">© 2024 Urban Pilgrim. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    });

    return { success: true };
});

exports.verifyAdminOtp = functions.https.onCall(async (data, context) => {
    console.log("data from verifyAdminOtp", data.data);
    const { email, otp } = data.data;
    const doc = await db.collection("adminOtps").doc(email).get();

    if (!doc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "OTP not found or expired"
        );
    }

    const { Otp, ExpiresAt } = doc.data();

    if (Date.now() > ExpiresAt) {
        await db.collection("adminOtps").doc(email).delete();
        throw new functions.https.HttpsError(
            "deadline-exceeded",
            "OTP expired"
        );
    }

    if (parseInt(otp) !== Otp) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid OTP");
    }

    // Verify admin exists and get admin data
    const adminQuery = await db
        .collection("admins")
        .where("email", "==", email)
        .get();
    if (adminQuery.empty) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Admin not found in database"
        );
    }

    const adminData = adminQuery.docs[0].data();

    // Check if admin is active
    if (adminData.isActive === false) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Admin account is deactivated"
        );
    }

    // Get existing Firebase Auth user (only verify, don't create)
    let user;
    try {
        user = await admin.auth().getUserByEmail(email);
    } catch (error) {
        throw new functions.https.HttpsError(
            "not-found",
            "Admin user not found in Firebase Auth. Please contact system administrator."
        );
    }

    // Generate custom token with admin claims
    console.log("Generating custom token for admin:", user.uid);
    const token = await admin.auth().createCustomToken(user.uid, {
        role: "admin",
        permissions: adminData.permissions || [],
        adminLevel: adminData.level || "standard",
    });

    // Delete OTP after use
    await db.collection("adminOtps").doc(email).delete();

    return {
        token,
        adminData: {
            role: adminData.role || "admin",
            permissions: adminData.permissions || [],
            level: adminData.level || "standard",
            name: adminData.name,
        },
    };
});

exports.organizerLogin = functions.https.onCall(async (data, context) => {
    const { name, password } = data.data || {};

    if (!name || !password) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Organizer name and password are required"
        );
    }

    const organizerSnap = await db
        .collection("organizers")
        .where("name", "==", name)
        .limit(1)
        .get();

    if (organizerSnap.empty) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Invalid credentials"
        );
    }

    const organizerDoc = organizerSnap.docs[0];
    const organizerData = organizerDoc.data() || {};

    if (organizerData.isActive === false) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Organizer account is deactivated"
        );
    }

    const storedPassword = organizerData.password || "";
    const isValidPassword = storedPassword === password;

    if (!isValidPassword) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Invalid credentials"
        );
    }

    const organizerEmail = organizerData.email ||
        `organizer_${organizerDoc.id}@urbanpilgrim.local`;

    let user;
    try {
        user = await admin.auth().getUserByEmail(organizerEmail);
    } catch (error) {
        user = await admin.auth().createUser({
            email: organizerEmail,
            displayName: organizerData.name || name,
        });
    }

    const token = await admin.auth().createCustomToken(user.uid, {
        role: "organizer",
        organizerId: organizerDoc.id,
    });

    return {
        token,
        organizer: {
            id: organizerDoc.id,
            uid: user.uid,
            name: organizerData.name || name,
            email: organizerData.email || organizerEmail,
            role: "organizer",
        },
    };
});

exports.sendContactEmail = functions.https.onCall(async (data, context) => {
    const { name, email, message, phone } = data.data; // ✅ comes directly from frontend

    if (!name || !email || !message) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required fields"
        );
    }

    const mailOptions = {
        from: email,
        to: contactEmail,
        subject: `📩 New Contact Us Message from ${name}`,
        html: `
            <div style="line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background: #4CAF50; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold;">
                    New Contact Us Message
                </div>
                <div style="padding: 20px;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #4CAF50;">${email}</a></p>
                    <p><strong>Phone:</strong> ${phone || "Not Provided"}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
                    <p style="margin: 0;"><strong>Message:</strong></p>
                    <p style="background: #f9f9f9; padding: 10px; border-radius: 6px; white-space: pre-line;">
                        ${message}
                    </p>
                </div>
                <div style="background: #f1f1f1; padding: 10px; font-size: 12px; text-align: center; color: #555;">
                    This email was generated from your website's Contact Us form.
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent!" }; // return directly
    } catch (error) {
        console.error("Email error:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to send email"
        );
    }
});

exports.createOrder = functions.https.onCall(async (data, context) => {
    console.log("data from createOrder", data.data);
    const options = {
        amount: data.data.amount * 100, // paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (err) {
        throw new functions.https.HttpsError("internal", err.message);
    }
});

exports.confirmPayment = functions.https.onCall(async (data, context) => {
    try {
        const {
            userId,
            email,
            name,
            cartData,
            GiftCardCoupon,
            total,
            paymentResponse,
            formData,
            coupon,
        } = data.data;

        const adminEmail = "urbanpilgrim25@gmail.com";

        // ------------------------
        // 1) Save purchase in user's Firestore with expiration data
        // ------------------------
        const userRef = db
            .collection("users")
            .doc(userId)
            .collection("info")
            .doc("details");

        // Also save individual programs with expiration data
        const userProgramsRef = db
            .collection("users")
            .doc(userId)
            .collection("programs");
        const batch = db.batch();

        // Save to existing structure for compatibility
        batch.set(
            userRef,
            {
                yourPrograms: FieldValue.arrayUnion(
                    ...cartData.map((item) => ({
                        ...item,
                        purchasedAt: new Date().toISOString(),
                        paymentId: paymentResponse.razorpay_payment_id,
                        orderId: paymentResponse.razorpay_order_id,
                        totalAmountPaid: total, // Total amount paid by user (including GST, after discounts)
                    }))
                ),
            },
            { merge: true }
        );

        // Save individual programs with expiration tracking
        cartData.forEach((item) => {
            const programDoc = userProgramsRef.doc(item.id);
            batch.set(programDoc, {
                ...item,
                purchasedAt: new Date().toISOString(),
                paymentId: paymentResponse.razorpay_payment_id,
                orderId: paymentResponse.razorpay_order_id,
                totalAmountPaid: total, // Total amount paid by user (including GST, after discounts)
                // Include expiration data if present
                ...(item.subscriptionType && {
                    subscriptionType: item.subscriptionType,
                }),
                ...(item.expirationDate && {
                    expirationDate: item.expirationDate,
                }),
                isExpired: false,
            });
        });

        await batch.commit();

        // ------------------------
        // 1.5) Update coupon usage if coupon was applied
        // ------------------------
        if (coupon && coupon.code) {
            try {
                const couponsRef = db.collection("coupons");
                const couponQuery = await couponsRef
                    .where("code", "==", coupon.code)
                    .get();

                if (!couponQuery.empty) {
                    const couponDoc = couponQuery.docs[0];
                    const currentUsedCount = couponDoc.data().usedCount || 0;
                    const restrict = couponDoc.data().restrictToProgram || null;
                    // If coupon restricted to a specific program, ensure it's in cart
                    if (restrict && (restrict.id || restrict.title)) {
                        const match = (cartData || []).some((item) => {
                            const byId = restrict.id && item.id === restrict.id;
                            const byTitle =
                                restrict.title && item.title === restrict.title;
                            return byId || byTitle;
                        });
                        if (!match) {
                            console.log(
                                "Coupon restrictToProgram does not match any cart item, skipping usage update"
                            );
                            // Do not update usage if restriction not satisfied
                            return { success: true };
                        }
                    }

                    const nextCount = currentUsedCount + 1;
                    const isGiftCard = couponDoc.data().isGiftCard === true;
                    const usageLimit = couponDoc.data().usageLimit || 1;

                    if (isGiftCard && nextCount >= usageLimit) {
                        // Delete after single use
                        await couponDoc.ref.delete();
                        console.log(
                            `Deleted gift card coupon ${coupon.code} after redemption`
                        );
                    } else {
                        await couponDoc.ref.update({
                            usedCount: nextCount,
                            lastUsedAt: new Date(),
                            lastUsedBy: {
                                userId,
                                email,
                                name,
                                paymentId: paymentResponse.razorpay_payment_id,
                            },
                        });
                    }

                    console.log(
                        `Updated coupon ${coupon.code} usage count to ${
                            currentUsedCount + 1
                        }`
                    );
                }
            } catch (couponError) {
                console.error("Error updating coupon usage:", couponError);
                // Don't fail the entire payment for coupon update errors
            }
        }

        // ------------------------
        // 1.5.5) Handle Workshop Bookings
        // ------------------------
        const workshopItems = cartData.filter(
            (item) => item.type === "workshop" || item.category === "workshop"
        );

        for (const workshop of workshopItems) {
            try {
                console.log(
                    `Processing workshop booking for: ${workshop.title}`
                );

                // Create workshop booking document
                const workshopBookingId = `WB_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                const workshopBookingData = {
                    bookingId: workshopBookingId,
                    workshopId: workshop.id,
                    workshopTitle: workshop.title,
                    userId: userId,
                    userInfo: {
                        name: name,
                        email: email,
                        phone: formData?.whatsapp || formData?.phone || "",
                        address: formData?.address || "",
                    },
                    bookingDetails: {
                        participants: workshop.participants || 1,
                        selectedVariant: workshop.selectedVariant || "Standard",
                        totalPrice: workshop.price,
                        paymentId: paymentResponse.razorpay_payment_id,
                        orderId: paymentResponse.razorpay_order_id,
                    },
                    organizer: workshop.organizer || null,
                    status: "confirmed",
                    bookedAt: new Date().toISOString(),
                    createdAt: FieldValue.serverTimestamp(),
                };

                // Save workshop booking
                await db
                    .collection("workshopBookings")
                    .doc(workshopBookingId)
                    .set(workshopBookingData);

                // Add user to workshop participants
                const workshopRef = db.collection("workshops").doc(workshop.id);
                await workshopRef.update({
                    participants: FieldValue.arrayUnion({
                        userId: userId,
                        name: name,
                        email: email,
                        phone: formData?.whatsapp || formData?.phone || "",
                        bookingId: workshopBookingId,
                        bookedAt: new Date().toISOString(),
                        participantCount: workshop.participants || 1,
                        variant: workshop.selectedVariant || "Standard",
                    }),
                    // Update total participants count
                    totalParticipants: FieldValue.increment(
                        workshop.participants || 1
                    ),
                });

                // Send emails to organizer, admin, and user
                await sendWorkshopBookingEmails(workshopBookingData, formData);

                console.log(
                    `Workshop booking processed successfully: ${workshopBookingId}`
                );
            } catch (workshopError) {
                console.error(
                    `Error processing workshop booking for ${workshop.title}:`,
                    workshopError
                );
                // Don't fail the entire payment for workshop processing errors
            }
        }

        // ------------------------
        // 1.6) Send immediate WhatsApp confirmation to user
        // ------------------------
        try {
            const userPhone = formatPhoneNumber(
                formData?.whatsapp ||
                    formData?.phone ||
                    formData?.whatsappNumber ||
                    formData?.number ||
                    ""
            );
            if (userPhone) {
                const titles = (cartData || [])
                    .map((i) => i?.title)
                    .filter(Boolean)
                    .join(", ");
                const amountINR = Number(total || 0);
                const currency = "INR";
                const message = `Hi ${
                    name || "Pilgrim"
                }, your payment is successful. Booking confirmed for: ${titles}. Amount: ₹${amountINR.toLocaleString(
                    "en-IN"
                )} ${currency}. Payment ID: ${
                    paymentResponse?.razorpay_payment_id || ""
                }`;

                // Try template first (for business-initiated), fallback to free text
                let res = await sendWhatsApp(
                    userPhone,
                    {
                        name,
                        titles,
                        amount: amountINR.toLocaleString("en-IN"),
                        paymentId: paymentResponse?.razorpay_payment_id || "",
                    },
                    true
                );
                if (!res?.ok) {
                    console.warn(
                        "WA template send failed, falling back to free text:",
                        res?.error
                    );
                    await sendWhatsApp(userPhone, message, false);
                }
            } else {
                console.warn(
                    "No user WhatsApp/phone found in formData; skipping WA confirmation"
                );
            }

            // Optional admin notification
            const adminWa = formatPhoneNumber(process.env.ADMIN_WHATSAPP || "");
            if (adminWa) {
                const titles = (cartData || [])
                    .map((i) => i?.title)
                    .filter(Boolean)
                    .join(", ");
                const msg = `New order paid by ${
                    name || email
                }. Programs: ${titles}. Total: ₹${Number(
                    total || 0
                ).toLocaleString("en-IN")}. PaymentID: ${
                    paymentResponse?.razorpay_payment_id || ""
                }`;
                await sendWhatsApp(adminWa, msg, false);
            }
        } catch (waErr) {
            console.error("WA: failed to send immediate confirmation", waErr);
        }

        // ------------------------
        // 2) Update each program document
        // ------------------------
        for (const program of cartData) {
            try {
                let programRef;
                let updateData = {};
                console.log("program from loop: ", program);
                console.log(
                    "program.type raw:",
                    program.type,
                    typeof program.type
                );

                if (
                    program.type &&
                    program.type.toLowerCase().trim() === "guide"
                ) {
                    programRef = db
                        .collection("pilgrim_guides")
                        .doc("pilgrim_guides")
                        .collection("guides")
                        .doc("data");
                    console.log("programRef: ", programRef);
                    const guideSnap = await programRef.get();
                    console.log("guideSnap: ", guideSnap);
                    if (guideSnap.exists) {
                        // Use the correct field name 'slides' and match title from guideCard.title
                        const slides = guideSnap.data().slides || [];
                        const updatedSlides = slides.map((slide) => {
                            const slideTitle =
                                slide?.guideCard?.title || slide?.title;
                            if (slideTitle === program.title) {
                                // Append purchaser info — for monthly: one entry PER selected slot
                                const isMonthly =
                                    (
                                        program.subscriptionType || ""
                                    ).toLowerCase() === "monthly";
                                const hasSelectedSlots =
                                    isMonthly &&
                                    Array.isArray(program.selectedSlots) &&
                                    program.selectedSlots.length > 0;

                                const slotPurchases = hasSelectedSlots
                                    ? program.selectedSlots.map((sel) => ({
                                          uid: userId,
                                          name,
                                          email,
                                          purchasedAt: new Date().toISOString(),
                                          paymentId:
                                              paymentResponse.razorpay_payment_id,
                                          orderId:
                                              paymentResponse.razorpay_order_id,
                                          slot: {
                                              id: sel.id,
                                              date: sel.date,
                                              startTime: sel.startTime,
                                              endTime: sel.endTime,
                                              location: sel.location || "",
                                              type:
                                                  sel.type ||
                                                  program.occupancyType ||
                                                  "individual",
                                          },
                                          date: sel.date,
                                          mode: program.mode,
                                          subscriptionType:
                                              program.subscriptionType,
                                          ...formData,
                                      }))
                                    : [
                                          {
                                              uid: userId,
                                              name,
                                              email,
                                              purchasedAt:
                                                  new Date().toISOString(),
                                              paymentId:
                                                  paymentResponse.razorpay_payment_id,
                                              orderId:
                                                  paymentResponse.razorpay_order_id,
                                              slot: program.slot,
                                              date: program.date,
                                              mode: program.mode,
                                              subscriptionType:
                                                  program.subscriptionType,
                                              ...formData,
                                          },
                                      ];

                                const updatedSlide = {
                                    ...slide,
                                    purchasedUsers: [
                                        ...(slide.purchasedUsers || []),
                                        ...slotPurchases,
                                    ],
                                };

                                // Capacity updates and availability adjustments
                                try {
                                    const modeKey = (
                                        program.mode || ""
                                    ).toLowerCase(); // 'online' | 'offline'
                                    const subKey = program.subscriptionType; // 'monthly' | 'oneTime' | 'quarterly' etc.
                                    if (
                                        modeKey &&
                                        updatedSlide[modeKey] &&
                                        updatedSlide[modeKey][subKey] &&
                                        Array.isArray(
                                            updatedSlide[modeKey][subKey].slots
                                        )
                                    ) {
                                        const existingSlots =
                                            updatedSlide[modeKey][subKey].slots;
                                        let nextSlots = existingSlots;

                                        if (
                                            subKey === "monthly" &&
                                            Array.isArray(
                                                program.selectedSlots
                                            ) &&
                                            Array.isArray(
                                                updatedSlide[modeKey]?.monthly
                                                    ?.weeklyPattern
                                            )
                                        ) {
                                            // Increment bookedCount per selected weeklyPattern time with caps
                                            const wp = [
                                                ...(updatedSlide[modeKey]
                                                    .monthly.weeklyPattern ||
                                                    []),
                                            ];
                                            const gMax =
                                                Number(
                                                    updatedSlide[modeKey]
                                                        .monthly.groupMax || 0
                                                ) || 0;
                                            program.selectedSlots.forEach(
                                                (sel) => {
                                                    const r = Number(
                                                        sel.rowIdx
                                                    );
                                                    const t = Number(sel.tIdx);
                                                    const stype =
                                                        sel.type ||
                                                        "individual";
                                                    if (
                                                        !isNaN(r) &&
                                                        !isNaN(t) &&
                                                        wp[r] &&
                                                        Array.isArray(
                                                            wp[r].times
                                                        ) &&
                                                        wp[r].times[t]
                                                    ) {
                                                        const ti = {
                                                            ...(wp[r].times[
                                                                t
                                                            ] || {}),
                                                        };
                                                        let cap = 1;
                                                        if (stype === "couple")
                                                            cap = 2;
                                                        if (stype === "group")
                                                            cap =
                                                                gMax > 0
                                                                    ? gMax
                                                                    : 0;
                                                        const current = Number(
                                                            ti.bookedCount || 0
                                                        );
                                                        const next =
                                                            cap > 0
                                                                ? Math.min(
                                                                      cap,
                                                                      current +
                                                                          1
                                                                  )
                                                                : current + 1;
                                                        ti.bookedCount = next;
                                                        wp[r].times[t] = ti;
                                                    }
                                                }
                                            );
                                            updatedSlide[
                                                modeKey
                                            ].monthly.weeklyPattern = wp;
                                        } else if (
                                            program.date &&
                                            program.slot &&
                                            (program.slot.startTime ||
                                                program.slot.start_time)
                                        ) {
                                            // Capacity-based reservation for non-monthly (e.g., one-time)
                                            const sStart =
                                                program.slot.startTime ||
                                                program.slot.start_time;
                                            const sEnd =
                                                program.slot.endTime ||
                                                program.slot.end_time;
                                            // Key to track bookings per slot
                                            const sbKey = `${program.date}|${sStart}|${sEnd}`;
                                            const currentBookings =
                                                updatedSlide[modeKey][subKey]
                                                    .slotBookings &&
                                                typeof updatedSlide[modeKey][
                                                    subKey
                                                ].slotBookings === "object"
                                                    ? updatedSlide[modeKey][
                                                          subKey
                                                      ].slotBookings
                                                    : {};
                                            const currentLocks =
                                                updatedSlide[modeKey][subKey]
                                                    .slotLocks &&
                                                typeof updatedSlide[modeKey][
                                                    subKey
                                                ].slotLocks === "object"
                                                    ? updatedSlide[modeKey][
                                                          subKey
                                                      ].slotLocks
                                                    : {};
                                            const prevCount = Number(
                                                currentBookings[sbKey] || 0
                                            );
                                            // Each successful payment counts as ONE booking towards capacity
                                            const bookingIncrement = 1;
                                            // Determine capacity per slot from occupancyType and guide config
                                            let maxPerSlot = 2; // default couples capacity
                                            const occType = (
                                                program.occupancyType || ""
                                            )
                                                .toString()
                                                .toLowerCase();
                                            try {
                                                const occs = (
                                                    updatedSlide?.guideCard
                                                        ?.occupancies || []
                                                ).map((o) => ({
                                                    type: (o?.type || "")
                                                        .toString()
                                                        .toLowerCase(),
                                                    max: Number(o?.max || 0),
                                                }));
                                                if (occType) {
                                                    const match = occs.find(
                                                        (o) =>
                                                            o.type === occType
                                                    );
                                                    if (
                                                        match &&
                                                        match.max > 0
                                                    ) {
                                                        maxPerSlot = match.max;
                                                    } else if (
                                                        occType.includes(
                                                            "individual"
                                                        )
                                                    ) {
                                                        maxPerSlot = 1;
                                                    } else if (
                                                        occType.includes(
                                                            "couple"
                                                        ) ||
                                                        occType.includes("twin")
                                                    ) {
                                                        maxPerSlot = 2;
                                                    }
                                                }
                                            } catch (e) {
                                                console.log(
                                                    "capacity detection failed, using default 2:",
                                                    e?.message
                                                );
                                            }
                                            const newCount = Math.min(
                                                maxPerSlot,
                                                prevCount + bookingIncrement
                                            );
                                            // Record lock on first booking if none exists
                                            const existingLock =
                                                currentLocks[sbKey];
                                            if (!existingLock && occType) {
                                                currentLocks[sbKey] = occType;
                                            }
                                            // Do NOT remove slots from Firestore; keep the slots array unchanged.
                                            // Frontend will use slotBookings and slotLocks to disable or hide full slots.
                                            nextSlots = existingSlots;

                                            updatedSlide[modeKey][subKey] = {
                                                ...updatedSlide[modeKey][
                                                    subKey
                                                ],
                                                slotBookings: {
                                                    ...currentBookings,
                                                    [sbKey]: newCount,
                                                },
                                                slotLocks: { ...currentLocks },
                                            };
                                        }

                                        // Apply filtered slots back
                                        updatedSlide[modeKey][subKey] = {
                                            ...updatedSlide[modeKey][subKey],
                                            slots: nextSlots,
                                            // slotBookings retained if set above
                                        };
                                    }
                                } catch (slotErr) {
                                    console.error(
                                        "Error updating guide slots after reservation:",
                                        slotErr
                                    );
                                }

                                return updatedSlide;
                            }
                            return slide;
                        });
                        updateData = { slides: updatedSlides };
                    } else {
                        console.log("Guide not found");
                    }
                } else if (
                    program.type == "retreat" ||
                    program.category == "retreat" ||
                    (program.id && !program.type && !program.category)
                ) {
                    console.log(
                        "Processing retreat purchase for:",
                        program.title
                    );
                    programRef = db
                        .collection("pilgrim_retreat")
                        .doc("user-uid")
                        .collection("retreats")
                        .doc("data");
                    const retreatSnap = await programRef.get();
                    if (retreatSnap.exists) {
                        const retreatData = retreatSnap.data();
                        const updatedData = { ...retreatData };
                        console.log("RetreatData from backend: ", retreatData);

                        // Find and update the matching retreat by iterating through numbered keys
                        let retreatFound = false;
                        Object.keys(retreatData).forEach((key) => {
                            const retreat = retreatData[key];
                            console.log("Retreat from backend: ", retreat);
                            if (
                                retreat?.pilgrimRetreatCard?.title ===
                                program.title
                            ) {
                                console.log(
                                    "Found matching retreat, updating purchasedUsers"
                                );
                                updatedData[key] = {
                                    ...retreat,
                                    purchasedUsers: [
                                        ...(retreat.purchasedUsers || []),
                                        {
                                            uid: userId,
                                            name,
                                            email,
                                            purchasedAt:
                                                new Date().toISOString(),
                                            paymentId:
                                                paymentResponse.razorpay_payment_id,
                                            orderId:
                                                paymentResponse.razorpay_order_id,
                                            ...formData,
                                        },
                                    ],
                                };
                                retreatFound = true;
                            }
                        });

                        if (retreatFound) {
                            updateData = updatedData;
                            console.log("UpdateData for retreat: ", updateData);
                        } else {
                            console.log(
                                "No matching retreat found for title: ",
                                program.title
                            );
                        }
                    }
                } else if (
                    program.type == "live" ||
                    program.category == "live"
                ) {
                    programRef = db
                        .collection("pilgrim_sessions")
                        .doc("pilgrim_sessions")
                        .collection("sessions")
                        .doc("liveSession");
                    const liveSnap = await programRef.get();
                    if (liveSnap.exists) {
                        const slides = liveSnap.data().slides || [];
                        const updatedSlides = slides.map((slide) => {
                            if (
                                slide?.liveSessionCard?.title === program.title
                            ) {
                                // Add user to purchasedUsers array
                                const updatedSlide = {
                                    ...slide,
                                    purchasedUsers: [
                                        ...(slide.purchasedUsers || []),
                                        {
                                            uid: userId,
                                            name,
                                            email,
                                            purchasedAt:
                                                new Date().toISOString(),
                                            paymentId:
                                                paymentResponse.razorpay_payment_id,
                                            orderId:
                                                paymentResponse.razorpay_order_id,
                                            occupancyType:
                                                program.occupancyType,
                                            slots: program.slots,
                                            ...formData,
                                        },
                                    ],
                                };

                                // Handle slot booking and capacity management for live sessions
                                try {
                                    if (
                                        Array.isArray(program.slots) &&
                                        program.slots.length > 0
                                    ) {
                                        // Update liveSlots array with booking counts and locks
                                        let liveSlots = Array.isArray(
                                            updatedSlide.liveSlots
                                        )
                                            ? [...updatedSlide.liveSlots]
                                            : [];

                                        program.slots.forEach((bookedSlot) => {
                                            const slotKey = `${bookedSlot.date}|${bookedSlot.startTime}|${bookedSlot.endTime}`;

                                            // Find matching slot in liveSlots array
                                            const slotIndex =
                                                liveSlots.findIndex(
                                                    (slot) =>
                                                        slot.date ===
                                                            bookedSlot.date &&
                                                        slot.startTime ===
                                                            bookedSlot.startTime &&
                                                        slot.endTime ===
                                                            bookedSlot.endTime
                                                );

                                            if (slotIndex !== -1) {
                                                const currentSlot = {
                                                    ...liveSlots[slotIndex],
                                                };
                                                const currentBooked = Number(
                                                    currentSlot.bookedCount || 0
                                                );
                                                const occType = (
                                                    program.occupancyType || ""
                                                )
                                                    .toString()
                                                    .toLowerCase();

                                                // Determine capacity based on occupancy type
                                                let maxCapacity = 1; // default for individual
                                                if (
                                                    occType.includes(
                                                        "couple"
                                                    ) ||
                                                    occType.includes("twin")
                                                ) {
                                                    maxCapacity = 2;
                                                } else if (
                                                    occType.includes("group")
                                                ) {
                                                    const groupMax = Number(
                                                        updatedSlide
                                                            ?.oneTimeSubscription
                                                            ?.groupMax || 0
                                                    );
                                                    maxCapacity =
                                                        groupMax > 0
                                                            ? groupMax
                                                            : 1;
                                                }

                                                // Check if slot is already locked for different occupancy type
                                                const existingLock =
                                                    currentSlot.lockedForType;
                                                if (
                                                    existingLock &&
                                                    existingLock !== occType
                                                ) {
                                                    console.log(
                                                        `Slot ${slotKey} is locked for ${existingLock}, cannot book for ${occType}`
                                                    );
                                                    return; // Skip this slot
                                                }

                                                // Check capacity
                                                if (
                                                    currentBooked >= maxCapacity
                                                ) {
                                                    console.log(
                                                        `Slot ${slotKey} is full (${currentBooked}/${maxCapacity})`
                                                    );
                                                    return; // Skip this slot
                                                }

                                                // Update slot with new booking count and lock
                                                const newBookedCount = Math.min(
                                                    maxCapacity,
                                                    currentBooked + 1
                                                );
                                                liveSlots[slotIndex] = {
                                                    ...currentSlot,
                                                    bookedCount: newBookedCount,
                                                    lockedForType:
                                                        existingLock || occType, // Lock on first booking
                                                };

                                                console.log(
                                                    `Updated slot ${slotKey}: bookedCount=${newBookedCount}, lockedForType=${liveSlots[slotIndex].lockedForType}`
                                                );
                                            } else {
                                                console.log(
                                                    `Slot not found in liveSlots array: ${slotKey}`
                                                );
                                            }
                                        });

                                        // Update the slide with modified liveSlots
                                        updatedSlide.liveSlots = liveSlots;
                                    }
                                } catch (slotErr) {
                                    console.error(
                                        "Error updating live session slots after booking:",
                                        slotErr
                                    );
                                }

                                return updatedSlide;
                            }
                            return slide;
                        });
                        updateData = { slides: updatedSlides };
                    }
                } else if (
                    program.type == "recorded" ||
                    program.category == "recorded"
                ) {
                    programRef = db
                        .collection("pilgrim_sessions")
                        .doc("pilgrim_sessions")
                        .collection("sessions")
                        .doc("recordedSession");
                    const recordedSnap = await programRef.get();
                    if (recordedSnap.exists) {
                        const slides = recordedSnap.data().slides || [];
                        const updatedSlides = slides.map((slide) => {
                            if (
                                slide?.recordedProgramCard?.title ===
                                program.title
                            ) {
                                return {
                                    ...slide,
                                    purchasedUsers: [
                                        ...(slide.purchasedUsers || []),
                                        {
                                            uid: userId,
                                            name,
                                            email,
                                            purchasedAt:
                                                new Date().toISOString(),
                                            paymentId:
                                                paymentResponse.razorpay_payment_id,
                                            orderId:
                                                paymentResponse.razorpay_order_id,
                                            ...formData,
                                        },
                                    ],
                                };
                            }
                            return slide;
                        });
                        updateData = { slides: updatedSlides };
                    }
                }

                if (programRef && Object.keys(updateData).length > 0) {
                    await programRef.update(updateData);
                    console.log(
                        `Updated ${program.type || program.category} program: ${
                            program.title
                        }`
                    );
                }

                // 2.2) Save Organizer Record (arrays of objects)
                try {
                    const typeKey = (
                        (program.type || program.category || "") + ""
                    )
                        .toLowerCase()
                        .trim();
                    if (["guide", "retreat", "live"].includes(typeKey)) {
                        const organizer = {
                            // Try to infer organizer/guide information if present on program
                            email:
                                program?.meetGuide?.email ||
                                program?.organizer?.email ||
                                null,
                            number:
                                program?.meetGuide?.number ||
                                program?.organizer?.number ||
                                program?.organizer?.contactNumber ||
                                null,
                            title:
                                program?.meetGuide?.title ||
                                program?.organizer?.name ||
                                null,
                        };

                        // program array
                        const programArr = [
                            {
                                id: program.id || null,
                                title: program.title || null,
                                type: program.type || program.category || null,
                                category: program.category || null,
                                mode: program.mode || null,
                                occupancyType: program.occupancyType || null,
                                subscriptionType:
                                    program.subscriptionType || null,
                            },
                        ];

                        // user array
                        const userArr = [{ userId, name, email }];

                        // schedule dates + slots arrays
                        let scheduleDates = [];
                        let slots = [];
                        if (
                            Array.isArray(program.selectedSlots) &&
                            program.selectedSlots.length > 0
                        ) {
                            scheduleDates = Array.from(
                                new Set(
                                    program.selectedSlots
                                        .map((s) => s.date)
                                        .filter(Boolean)
                                )
                            );
                            slots = program.selectedSlots.map((s) => ({
                                id: s.id || null,
                                date: s.date || null,
                                startTime: s.startTime || s.start_time || null,
                                endTime: s.endTime || s.end_time || null,
                                location: s.location || null,
                                type: s.type || program.occupancyType || null,
                                status: "pending",
                            }));
                        } else if (program.date || program.slot) {
                            if (program.date) scheduleDates = [program.date];
                            if (
                                program.slot &&
                                (program.slot.startTime ||
                                    program.slot.start_time)
                            ) {
                                slots = [
                                    {
                                        date: program.date || null,
                                        startTime:
                                            program.slot.startTime ||
                                            program.slot.start_time ||
                                            null,
                                        endTime:
                                            program.slot.endTime ||
                                            program.slot.end_time ||
                                            null,
                                        type: program.occupancyType || null,
                                        status: "pending",
                                    },
                                ];
                            }
                        }

                        // Update organizer structure in 'organizers' collection
                        const organiserEmail = organizer?.email || null;
                        if (organiserEmail) {
                            // Get phone from formData
                            const rawPhone =
                                formData?.whatsapp ||
                                formData?.phone ||
                                formData?.whatsappNumber ||
                                formData?.number ||
                                null;

                            const programInfo = {
                                subscriptionType:
                                    program?.subscriptionType || null,
                                scheduleDates,
                                slots,
                            };
                            const userInfo = {
                                userId,
                                name,
                                email,
                                phone: rawPhone,
                            };
                            const adduserProgrammmm = await addUserToProgram(
                                db,
                                organizer,
                                typeKey,
                                program.title,
                                programInfo,
                                userInfo
                            );
                            console.log(
                                "Added user to program:",
                                adduserProgrammmm
                            );
                        } else {
                            console.log(
                                "No organiser email found; skipped addUserToProgram for",
                                program.title
                            );
                        }
                    }
                } catch (orgErr) {
                    console.error(
                        "Failed saving organizer record for program",
                        program?.title,
                        orgErr
                    );
                }
            } catch (err) {
                console.error(`Error updating program ${program.title}:`, err);
            }
        }

        // ------------------------
        // 2.5) Send WhatsApp notifications + schedule reminders (Guide monthly & one-time)
        // ------------------------
        try {
            const rawPhone =
                formData?.whatsapp ||
                formData?.phone ||
                formData?.whatsappNumber ||
                formData?.number ||
                null;
            const phoneE164 = formatPhoneNumber(rawPhone);
            console.log("WA: normalized phone", { rawPhone, phoneE164 });
            if (phoneE164) {
                for (const program of cartData) {
                    const typeKey = (
                        (program.type || program.category || "") + ""
                    )
                        .toLowerCase()
                        .trim();
                    const sub = (program.subscriptionType || "").toLowerCase();
                    const isMonthly = sub === "monthly";

                    // Build slots array for reminders
                    let slots = [];
                    if (
                        isMonthly &&
                        Array.isArray(program.selectedSlots) &&
                        program.selectedSlots.length > 0
                    ) {
                        slots = program.selectedSlots
                            .map((s) => ({
                                date: s.date,
                                startTime: s.startTime || s.start_time,
                                endTime: s.endTime || s.end_time,
                            }))
                            .filter((s) => s.date && s.startTime);
                    } else if (
                        program.slot &&
                        (program.slot.startTime || program.slot.start_time)
                    ) {
                        slots = [
                            {
                                date: program.date,
                                startTime:
                                    program.slot.startTime ||
                                    program.slot.start_time,
                                endTime:
                                    program.slot.endTime ||
                                    program.slot.end_time,
                            },
                        ];
                    }

                    // Send immediate confirmation message (generic "session")
                    const confirmMsg = isMonthly
                        ? `Hi ${
                              name || "Pilgrim"
                          }, ✅ Your monthly session for "${
                              program.title
                          }" has been booked successfully. We'll remind you 60 and 30 minutes before each session here on WhatsApp.\nMode: ${
                              program.mode
                          }${
                              program.occupancyType
                                  ? ` • ${program.occupancyType}`
                                  : ""
                          }`
                        : `Hi ${name || "Pilgrim"}, ✅ Your session "${
                              program.title
                          }" has been booked successfully. We'll remind you 60 and 30 minutes before the session here on WhatsApp.\nMode: ${
                              program.mode ?? "Offline"
                          }${
                              program.occupancyType
                                  ? ` • ${program.occupancyType}`
                                  : ""
                          }`;

                    const waRes = await sendWhatsApp2(
                        phoneE164,
                        {
                            name: name || "Pilgrim",
                            titles: program.title || name,
                            mode: program.mode ?? "Offline",
                            occupancyType: program.occupancyType
                                ? ` • ${program.occupancyType}`
                                : "",
                        },
                        true
                    );
                    console.log("WA: confirmation send result", {
                        ok: waRes?.ok,
                        error: waRes?.error,
                    });

                    // Fallback: if immediate send fails, schedule an immediate reminder (+1 minute)
                    if (!waRes?.ok) {
                        try {
                            await db.collection("whatsapp_reminders").add({
                                status: "pending",
                                createdAt: Timestamp.now(),
                                sendAt: Timestamp.fromDate(
                                    new Date(Date.now() + 60 * 1000)
                                ),
                                to: phoneE164,
                                userId,
                                name,
                                programTitle: program.title,
                                programMode: program.mode,
                                occupancyType: program.occupancyType || null,
                                minutesBefore: 0,
                                slot: slots?.[0]
                                    ? {
                                          date: slots[0].date,
                                          startTime: slots[0].startTime || null,
                                          endTime: slots[0].endTime || null,
                                      }
                                    : null,
                                message: confirmMsg,
                                kind: "instant-fallback",
                            });
                            console.log(
                                "WA: scheduled instant fallback reminder (+1m)"
                            );
                        } catch (e) {
                            console.error(
                                "WA: failed to schedule instant fallback",
                                e
                            );
                        }
                    }

                    // Create reminder docs for scheduled job
                    if (Array.isArray(slots) && slots.length > 0) {
                        await createWhatsAppReminderDocs({
                            userId,
                            name,
                            phoneE164,
                            program: {
                                title: program.title,
                                mode: program.mode,
                                occupancyType: program.occupancyType,
                            },
                            slots,
                        });
                        console.log("WA: reminder docs created", {
                            count: slots.length * 2,
                            title: program.title,
                        });
                    } else {
                        console.log("WA: no slots for reminders", {
                            title: program.title,
                            typeKey,
                            sub,
                        });
                    }
                }
            } else {
                console.log("WA: no valid phone number found in formData");
            }
        } catch (waErr) {
            console.error("WhatsApp notification scheduling failed:", waErr);
        }

        // ------------------------
        // 3) Send Emails with Dual Invoice System
        // ------------------------
        // Setup email transporter using OAuth2Client (defined later in function)
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        // Build invoice(s) for attachment based on listingType
        let invoiceAttachments = [];

        // Helper function to calculate commission splits
        const getCommissionSplit = (item) => {
            const type = (item.type || item.category || "")
                .toLowerCase()
                .trim();
            const listingType =
                item.listingType ||
                item.guideCard?.listingType ||
                item.pilgrimRetreatCard?.listingType ||
                item.liveSessionCard?.listingType ||
                item.recordedProgramCard?.listingType ||
                "Listing";

            if (listingType === "Own") {
                return { adminShare: 100, organizerShare: 0 };
            }

            // Listing type commission structure
            switch (type) {
                case "retreat":
                    return { adminShare: 15, organizerShare: 85 };
                case "guide":
                    return { adminShare: 12.5, organizerShare: 87.5 };
                case "workshop":
                    return { adminShare: 12.5, organizerShare: 87.5 };
                case "live":
                    return { adminShare: 100, organizerShare: 0 };
                case "recorded":
                    return { adminShare: 100, organizerShare: 0 };
                default:
                    return { adminShare: 100, organizerShare: 0 };
            }
        };

        // Process each item to determine if dual invoices are needed
        const itemsNeedingDualInvoices = [];
        const itemsNeedingSingleInvoice = [];

        (Array.isArray(cartData) ? cartData : []).forEach((item, idx) => {
            const listingType =
                item.listingType ||
                item.guideCard?.listingType ||
                item.pilgrimRetreatCard?.listingType ||
                item.liveSessionCard?.listingType ||
                item.recordedProgramCard?.listingType ||
                "Listing";
            const commission = getCommissionSplit(item);

            // Extract GST from component-specific nested structures
            let gstRate = 0;
            if (
                item?.gstRate !== undefined ||
                item?.gst !== undefined ||
                item?.GST !== undefined
            ) {
                // Direct GST rate (backward compatibility)
                gstRate = Number(item?.gstRate || item?.gst || item?.GST || 0);
            } else if (item?.guideCard?.gst !== undefined) {
                // GuideForm component
                gstRate = Number(item.guideCard.gst || 0);
            } else if (item?.pilgrimRetreatCard?.gst !== undefined) {
                // RetreatsForm component
                gstRate = Number(item.pilgrimRetreatCard.gst || 0);
            } else if (item?.liveSessionCard?.gst !== undefined) {
                // LiveSessions2 component
                gstRate = Number(item.liveSessionCard.gst || 0);
            } else if (item?.recordedProgramCard?.gst !== undefined) {
                // RecordedSession2 component
                gstRate = Number(item.recordedProgramCard.gst || 0);
            } else if (item?.gst !== undefined) {
                // WorkshopForm component (flat structure)
                gstRate = Number(item.gst || 0);
            } else {
                // Fallback to default GST
                gstRate = Number(process.env.DEFAULT_GST_PERCENT || 18);
            }

            const safeItem = {
                title: (item?.title || `Program ${idx + 1}`)
                    .toString()
                    .slice(0, 200),
                price: Number(item?.price || 0) || 0,
                quantity: Number(item?.quantity || 1) || 1,
                mode: item?.mode || undefined,
                subscriptionType: item?.subscriptionType || undefined,
                occupancyType: item?.occupancyType || undefined,
                gstRate: gstRate,
                discount: item?.monthly?.discount || 0,
                sac:
                    (item?.sac || item?.hsn || "").toString().slice(0, 32) ||
                    undefined,
                listingType,
                commission,
                GiftCardCoupon: GiftCardCoupon?.discount || 0,
                organizer: item?.organizer || item?.meetGuide || null,
            };
            console.log("safeItem: ", safeItem);

            if (listingType === "Listing" && commission.organizerShare > 0) {
                itemsNeedingDualInvoices.push(safeItem);
            } else {
                itemsNeedingSingleInvoice.push(safeItem);
            }
        });

        // invoice system
        try {
            const invoiceNumber = `UP-${(
                paymentResponse?.razorpay_order_id || "ORDER"
            )
                .toString()
                .slice(-8)}-${(paymentResponse?.razorpay_payment_id || "PAY")
                .toString()
                .slice(-6)}`;

            // Guard logo size/presence (skip if huge or missing)
            const maxLogoLen = 2_000_000; // ~2MB base64 chars
            const logoB64 =
                typeof main_logo === "string" &&
                main_logo.length > 0 &&
                main_logo.length <= maxLogoLen
                    ? main_logo
                    : null;

            // Generate single invoice for "Own" items and recorded/live sessions (HTML -> PDF)
            if (itemsNeedingSingleInvoice.length > 0) {
                try {
                    const singleTotal = itemsNeedingSingleInvoice.reduce(
                        (sum, item) =>
                            sum +
                            Number(item.price || 0) *
                                Number(item.quantity || 1),
                        0
                    );
                    const htmlData = {
                        company: {
                            name: process.env.COMPANY_NAME || "Urban Pilgrim",
                            address: process.env.COMPANY_ADDRESS || "India",
                            email:
                                process.env.COMPANY_EMAIL ||
                                process.env.APP_GMAIL ||
                                "",
                            phone: process.env.COMPANY_PHONE || "",
                            cin: process.env.COMPANY_CIN || "",
                            website:
                                process.env.COMPANY_WEBSITE ||
                                "urbanpilgrim.in",
                        },
                        customer: {
                            name:
                                name ||
                                formData?.fullName ||
                                email ||
                                formData?.email ||
                                "Customer",
                            address: `${formData?.address || ""} ${
                                formData?.city || ""
                            } ${formData?.zip || ""}`.trim(),
                            state: formData?.state || "",
                            placeOfSupply: formData?.state || "",
                        },
                        provider: {
                            gstin: process.env.COMPANY_GSTIN || "",
                            name: process.env.COMPANY_NAME || "Urban Pilgrim",
                            address: process.env.COMPANY_ADDRESS || "India",
                            state: process.env.COMPANY_STATE || "",
                        },
                        invoiceNumber: `${invoiceNumber}-ADMIN`,
                        invoiceDate: new Date().toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        }),
                        items: itemsNeedingSingleInvoice.map((it) => {
                            const gross =
                                Number(it.price || 0) *
                                Number(it.quantity || 1);
                            const taxRate = Number(it.gstRate || 0);
                            const igstAmount = gross * (taxRate / 100);
                            return {
                                title: `${it.title}`,
                                sac: it.sac || "",
                                gross: gross,
                                discount: 0,
                                taxableValue: gross,
                                igst: igstAmount,
                                GiftCardCoupon: it?.GiftCardCoupon || 0,
                            };
                        }),
                        totalAmount: singleTotal,
                    };
                    const pdfBuffer = await generateInvoicePdfBuffer(htmlData);
                    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
                        invoiceAttachments.push({
                            filename: `${invoiceNumber}-ADMIN.pdf`,
                            content: pdfBuffer,
                            contentType: "application/pdf",
                        });
                    } else {
                        console.warn(
                            "Single invoice generation returned empty buffer"
                        );
                    }
                } catch (singleErr) {
                    console.error(
                        "Single invoice generation failed (continuing):",
                        singleErr?.message || singleErr
                    );
                }
            }

            // Generate dual invoices for "Listing" items that need commission split
            for (const item of itemsNeedingDualInvoices) {
                const itemTotal = item.price * item.quantity;
                const adminAmount =
                    (itemTotal * item.commission.adminShare) / 100;
                const organizerAmount =
                    (itemTotal * item.commission.organizerShare) / 100;

                console.log("------");
                console.log("item", item);
                console.log("itemTotal", itemTotal);
                console.log("adminAmount", adminAmount);
                console.log("organizerAmount", organizerAmount);
                console.log("------");

                // Admin invoice (commission share) via HTML -> PDF
                try {
                    const htmlDataAdmin = {
                        company: {
                            name: process.env.COMPANY_NAME || "Urban Pilgrim",
                            address: process.env.COMPANY_ADDRESS || "India",
                            email:
                                process.env.COMPANY_EMAIL ||
                                process.env.APP_GMAIL ||
                                "",
                            phone: process.env.COMPANY_PHONE || "",
                            cin: process.env.COMPANY_CIN || "",
                            website:
                                process.env.COMPANY_WEBSITE ||
                                "urbanpilgrim.in",
                        },
                        customer: {
                            name:
                                name ||
                                formData?.fullName ||
                                email ||
                                formData?.email ||
                                "Customer",
                            address: `${formData?.address || ""} ${
                                formData?.city || ""
                            } ${formData?.zip || ""}`.trim(),
                            state: formData?.state || "",
                            placeOfSupply: formData?.state || "",
                        },
                        provider: {
                            gstin: process.env.COMPANY_GSTIN || "",
                            name: process.env.COMPANY_NAME || "Urban Pilgrim",
                            address: process.env.COMPANY_ADDRESS || "India",
                            state: process.env.COMPANY_STATE || "",
                        },
                        invoiceNumber: `${invoiceNumber}-ADMIN-${item.title.slice(
                            0,
                            10
                        )}`,
                        invoiceDate: new Date().toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        }),
                        items: [
                            {
                                title: `${item.title} - Admin Commission (${item.commission.adminShare}%)`,
                                sac: item.sac || "",
                                gross: adminAmount,
                                taxableValue: adminAmount,
                                igst:
                                    adminAmount *
                                    (Number(item.gstRate || 0) / 100),
                                discount: item?.discount || 0,
                                GiftCardCoupon:
                                    ((item?.GiftCardCoupon || 0) *
                                        item.commission.adminShare) /
                                    100,
                            },
                        ],
                        totalAmount: adminAmount,
                    };
                    const adminPdf = await generateInvoicePdfBuffer(
                        htmlDataAdmin
                    );
                    console.log(
                        "Admin invoice buffer length:",
                        adminPdf?.length
                    );

                    if (adminPdf && Buffer.isBuffer(adminPdf)) {
                        invoiceAttachments.push({
                            filename: `${invoiceNumber}-ADMIN-${item.title.slice(
                                0,
                                10
                            )}.pdf`,
                            content: adminPdf,
                            contentType: "application/pdf",
                        });
                    } else {
                        console.log("Admin invoice failed");
                    }
                } catch (adminInvErr) {
                    console.error(
                        "Admin invoice generation failed (continuing):",
                        adminInvErr?.message || adminInvErr
                    );
                }

                // Organizer invoice (their share) - will be sent separately to organizer
                if (item.organizer && item.organizer.email) {
                    try {
                        const htmlDataOrg = {
                            company: {
                                name:
                                    process.env.COMPANY_NAME || "Urban Pilgrim",
                                address: process.env.COMPANY_ADDRESS || "India",
                                email:
                                    process.env.COMPANY_EMAIL ||
                                    process.env.APP_GMAIL ||
                                    "",
                                phone: process.env.COMPANY_PHONE || "",
                                cin: process.env.COMPANY_CIN || "",
                                website:
                                    process.env.COMPANY_WEBSITE ||
                                    "urbanpilgrim.in",
                            },
                            customer: {
                                name:
                                    name ||
                                    formData?.fullName ||
                                    email ||
                                    formData?.email ||
                                    "Customer",
                                address: `${formData?.address || ""} ${
                                    formData?.city || ""
                                } ${formData?.zip || ""}`.trim(),
                                state: formData?.state || "",
                                placeOfSupply: formData?.state || "",
                            },
                            provider: {
                                name:
                                    item.organizer.name ||
                                    item.organizer.title ||
                                    "Service Provider",
                                address: item.organizer.address || "",
                            },
                            invoiceNumber: `${invoiceNumber}-ORG-${item.title.slice(
                                0,
                                10
                            )}`,
                            invoiceDate: new Date().toLocaleDateString(
                                "en-IN",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }
                            ),
                            items: [
                                {
                                    title: `${item.title} - Organizer Share (${item.commission.organizerShare}%)`,
                                    gross: organizerAmount,
                                    taxableValue: organizerAmount,
                                    igst:
                                        organizerAmount *
                                        (Number(item.gstRate || 0) / 100),
                                    discount: item?.discount || 0,
                                    GiftCardCoupon:
                                        ((item?.GiftCardCoupon || 0) *
                                            item.commission.organizerShare) /
                                        100,
                                },
                            ],
                            totalAmount: organizerAmount,
                        };
                        const organizerInvoice =
                            await generateOrganizerInvoicePdfBuffer(
                                htmlDataOrg
                            );

                        console.log(
                            "organizer invoice buffer length: ",
                            organizerInvoice?.length
                        );

                        // Add organizer invoice to user's email attachments (for dual invoice email)
                        if (
                            organizerInvoice &&
                            Buffer.isBuffer(organizerInvoice)
                        ) {
                            invoiceAttachments.push({
                                filename: `${invoiceNumber}-ORG-${item.title.slice(
                                    0,
                                    10
                                )}.pdf`,
                                content: organizerInvoice,
                                contentType: "application/pdf",
                            });

                            // Send separate organizer invoice to organizer
                            try {
                                await transporter.sendMail({
                                    from: gmailEmail,
                                    to: item.organizer.email || adminEmail,
                                    subject: `Payment Receipt - ${item.title} (Organizer Share)`,
                                    html: `
                                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                            <h2 style="color: #2F6288;">Payment Receipt - Organizer Share</h2>
                                            <p>Dear ${
                                                item.organizer.name ||
                                                item.organizer.title ||
                                                "Organizer"
                                            },</p>
                                            <p>You have received a booking for <strong>${
                                                item.title
                                            }</strong>.</p>
                                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                                <h3>Booking Details:</h3>
                                                <p><strong>Customer:</strong> ${name}</p>
                                                <p><strong>Program:</strong> ${
                                                    item.title
                                                }</p>
                                                <p><strong>Your Share:</strong> ₹${organizerAmount.toFixed(
                                                    2
                                                )} (${
                                        item.commission.organizerShare
                                    }%)</p>
                                                <p><strong>Payment ID:</strong> ${
                                                    paymentResponse?.razorpay_payment_id
                                                }</p>
                                            </div>
                                            <p>Please find your payment receipt attached.</p>
                                            <p>Best regards,<br>Urban Pilgrim Team</p>
                                        </div>
                                    `,
                                    attachments: [
                                        {
                                            filename: `${invoiceNumber}-ORG-${item.title.slice(
                                                0,
                                                10
                                            )}.pdf`,
                                            content: Buffer.from(
                                                organizerInvoice,
                                                "base64"
                                            ),
                                            contentType: "application/pdf",
                                        },
                                    ],
                                });
                                console.log(
                                    `Organizer invoice sent to: ${item.organizer.email}`
                                );
                            } catch (emailError) {
                                console.error(
                                    "Failed to send organizer invoice:",
                                    emailError
                                );
                            }
                        } else {
                            console.log("Organizer invoice failed");
                        }
                    } catch (orgInvErr) {
                        console.error(
                            "Organizer invoice generation failed (continuing):",
                            orgInvErr?.message || orgInvErr
                        );
                    }
                }
            }
        } catch (e) {
            console.error(
                "Invoice generation failed (non-blocking) primary attempt:",
                e
            );
            // Fallback: retry minimal invoice without logo and with single summarized line
            try {
                const invoiceNumber = `UP-${(
                    paymentResponse?.razorpay_order_id || "ORDER"
                )
                    .toString()
                    .slice(-8)}-${(
                    paymentResponse?.razorpay_payment_id || "PAY"
                )
                    .toString()
                    .slice(-6)}-MIN`;
                const summaryItem = [
                    {
                        title: `${
                            Array.isArray(cartData) ? cartData.length : 0
                        } Program(s)`,
                        price: Number(total || 0) || 0,
                        quantity: 1,
                    },
                ];
                const pdfBase64 = await generateInvoicePdfBase64({
                    invoiceNumber,
                    issueDateISO: new Date().toISOString(),
                    buyer: {
                        name: name || formData?.fullName || "",
                        email: email || formData?.email || "",
                    },
                    items: summaryItem,
                    totalAmount: Number(total || 0),
                    currency: "INR",
                    company: {
                        name: process.env.COMPANY_NAME || "Urban Pilgrim",
                        country: process.env.COMPANY_COUNTRY || "India",
                    },
                    logoBase64: null,
                });
                if (pdfBase64) {
                    invoiceAttachments.push({
                        filename: `${invoiceNumber}.pdf`,
                        content: Buffer.from(pdfBase64, "base64"),
                        contentType: "application/pdf",
                    });
                }
            } catch (e2) {
                console.error(
                    "Invoice fallback generation failed (still non-blocking):",
                    e2
                );
            }
        }

        // Enhanced program list with monthly slot details
        const programList = cartData
            .map((p) => {
                let programDetails = `<strong>${p.title}</strong> (₹${p.price} x${p.quantity})`;

                // Add monthly slot details if available
                if (
                    p.selectedSlots &&
                    Array.isArray(p.selectedSlots) &&
                    p.selectedSlots.length > 0
                ) {
                    programDetails += `<br><small style="color: #666; margin-left: 10px;">`;
                    programDetails += `📅 ${p.selectedSlots.length} sessions scheduled`;

                    // Show occupancy type and status
                    if (p.occupancyType) {
                        const occupancyLabel =
                            p.occupancyType.charAt(0).toUpperCase() +
                            p.occupancyType.slice(1);
                        programDetails += ` • ${occupancyLabel} booking`;

                        if (p.occupancyType === "group") {
                            if (p.status === "waiting") {
                                programDetails += ` • ⏳ Waiting for minimum participants`;
                            } else if (p.status === "active") {
                                programDetails += ` • ✅ Active`;
                            }
                        } else {
                            programDetails += ` • ✅ Confirmed`;
                        }
                    }

                    programDetails += `</small>`;
                }

                return programDetails;
            })
            .join("<br><br>");

        // Email to user
        await transporter.sendMail({
            from: gmailEmail,
            to: email,
            subject: "Purchase Confirmed - Urban Pilgrim",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Purchase Confirmation</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #2F6288 0%, #C5703F 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Urban Pilgrim</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your Wellness Journey Begins</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 20px 30px 40px;">
                            <h2 style="color: #2F6288; text-align: center; margin: 20px 0; font-size: 24px;">Purchase Confirmed!</h2>
                            <p style="color: #666; text-align: center; margin: 0 0 30px 0; font-size: 16px;">Hi ${name}, thank you for choosing Urban Pilgrim for your Wellness journey.</p>
                            
                            <!-- Purchase Details -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <h3 style="color: #2F6288; margin: 0 0 15px 0; font-size: 18px;">📋 Purchase Details</h3>
                                <div style="border-left: 4px solid #C5703F; padding-left: 15px; margin: 15px 0;">
                                    <p style="color: #333; margin: 0; font-size: 15px; line-height: 1.6;">${programList}</p>
                                </div>
                                
                                <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px;">
                                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                                        <span style="color: #666; font-size: 14px;">Total Amount:</span>
                                        <span style="color: #2F6288; font-weight: bold; font-size: 18px;">₹${total}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                                        <span style="color: #666; font-size: 14px;">Payment ID:</span>
                                        <span style="color: #666; font-size: 14px; font-family: monospace;">${
                                            paymentResponse.razorpay_payment_id
                                        }</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                                        <span style="color: #666; font-size: 14px;">Purchase Date:</span>
                                        <span style="color: #666; font-size: 14px;">${new Date().toLocaleDateString(
                                            "en-IN"
                                        )}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${
                                cartData.some(
                                    (p) =>
                                        p.selectedSlots &&
                                        p.selectedSlots.length > 0
                                )
                                    ? `
                            <!-- Monthly Schedule Details -->
                            <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
                                <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">📅 Your Session Schedule</h3>
                                ${cartData
                                    .filter(
                                        (p) =>
                                            p.selectedSlots &&
                                            p.selectedSlots.length > 0
                                    )
                                    .map(
                                        (program) => `
                                    <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #1976d2;">
                                        <h4 style="color: #2F6288; margin: 0 0 10px 0; font-size: 16px;">${
                                            program.title
                                        }</h4>
                                        <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
                                            <strong>Mode:</strong> ${
                                                program.mode
                                            } • 
                                            <strong>Type:</strong> ${
                                                program.occupancyType
                                                    ? program.occupancyType
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                      program.occupancyType.slice(
                                                          1
                                                      )
                                                    : "Individual"
                                            }
                                        </p>
                                        ${
                                            program.occupancyType === "group" &&
                                            program.status === "waiting"
                                                ? `
                                            <div style="background: #fff3cd; padding: 8px 12px; border-radius: 4px; margin: 8px 0;">
                                                <small style="color: #856404;">⏳ <strong>Group Status:</strong> Waiting for minimum participants (7 days). You'll be notified once confirmed.</small>
                                            </div>
                                        `
                                                : ""
                                        }
                                        <div style="margin-top: 10px;">
                                            <strong style="color: #333;">Sessions (${
                                                program.selectedSlots.length
                                            }):</strong>
                                            <div style="margin-top: 8px;">
                                                ${program.selectedSlots
                                                    .map(
                                                        (slot, index) => `
                                                    <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; margin: 4px 0; font-size: 13px;">
                                                        <strong>Session ${
                                                            index + 1
                                                        }:</strong> ${new Date(
                                                            slot.date
                                                        ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                weekday: "long",
                                                                month: "short",
                                                                day: "numeric",
                                                            }
                                                        )} 
                                                        at ${
                                                            slot.startTime
                                                                .split("T")[1]
                                                                ?.split(
                                                                    "+"
                                                                )[0] ||
                                                            slot.startTime
                                                        } - ${
                                                            slot.endTime
                                                                .split("T")[1]
                                                                ?.split(
                                                                    "+"
                                                                )[0] ||
                                                            slot.endTime
                                                        }
                                                    </div>
                                                `
                                                    )
                                                    .join("")}
                                            </div>
                                        </div>
                                    </div>
                                `
                                    )
                                    .join("")}
                            </div>
                            `
                                    : ""
                            }
                            
                            ${
                                itemsNeedingDualInvoices.length > 0
                                    ? `
                            <!-- Invoice Information for Listing Items -->
                            <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
                                <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">📄 Invoice Information</h3>
                                <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;">
                                    You have purchased programs through our platform. Please find attached:
                                </p>
                                <ul style="color: #333; margin: 10px 0; padding-left: 20px; font-size: 14px;">
                                    ${
                                        itemsNeedingSingleInvoice.length > 0
                                            ? "<li><strong>Admin Invoice:</strong> For programs managed directly by Urban Pilgrim</li>"
                                            : ""
                                    }
                                    ${
                                        itemsNeedingDualInvoices.length > 0
                                            ? "<li><strong>Organizer Invoices:</strong> For programs managed by individual organizers</li>"
                                            : ""
                                    }
                                </ul>
                                <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
                                    <em>Note: Each invoice shows the respective service provider details for your records.</em>
                                </p>
                            </div>
                            `
                                    : ""
                            }
                            
                            <!-- Next Steps -->
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="https://urbanpilgrim.in/userdashboard" style="display: inline-block; background: linear-gradient(135deg, #2F6288, #C5703F); color: #ffffff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(47, 98, 136, 0.3);">View Your Dashboard</a>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <p style="color: #666; margin: 0; font-size: 14px;">Need help? Contact us at <a href="mailto:urbanpilgrim25@gmail.com" style="color: #C5703F;">urbanpilgrim25@gmail.com</a></p>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; margin: 0; font-size: 12px;">© 2024 Urban Pilgrim. All rights reserved.</p>
                            <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">Thank you for being part of our Wellness community.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            attachments: invoiceAttachments,
        });

        // Create admin-only invoice attachments (only admin invoices, not organizer invoices)
        const adminInvoiceAttachments = invoiceAttachments.filter(
            (attachment) =>
                attachment.filename.includes("-ADMIN") ||
                !attachment.filename.includes("-ORG")
        );

        // Email to admin
        await transporter.sendMail({
            from: gmailEmail,
            to: adminEmail,
            subject: "New Purchase Alert - Urban Pilgrim",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Purchase Alert</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 25px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">New Purchase Alert</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Urban Pilgrim Admin Dashboard</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <h3 style="color: #2E7D32; margin: 0 0 15px 0; font-size: 18px;">Customer Information</h3>
                                <p style="color: #333; margin: 5px 0; font-size: 15px;"><strong>Name:</strong> ${name}</p>
                                <p style="color: #333; margin: 5px 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #4CAF50;">${email}</a></p>
                            </div>
                            
                            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">Purchase Details</h3>
                                <p style="color: #333; margin: 10px 0; font-size: 15px; line-height: 1.6;">${programList}</p>
                                <div style="border-top: 1px solid #ffeaa7; padding-top: 15px; margin-top: 15px;">
                                    <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Total Amount: ₹${total}</strong></p>
                                    <p style="color: #666; margin: 5px 0; font-size: 14px;">Payment ID: <code style="background: #f1f1f1; padding: 2px 6px; border-radius: 4px;">${
                                        paymentResponse.razorpay_payment_id
                                    }</code></p>
                                    <p style="color: #666; margin: 5px 0; font-size: 14px;">Date: ${new Date().toLocaleString(
                                        "en-IN"
                                    )}</p>
                                </div>
                            </div>
                            
                            <div style="text-align: center; margin: 25px 0;">
                                <p style="color: #666; margin: 0; font-size: 14px;">Please follow up with the customer for session scheduling if required.</p>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; margin: 0; font-size: 12px;">Urban Pilgrim Admin Notification System</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            attachments: adminInvoiceAttachments,
        });

        // ------------------------
        // 4) Google Calendar for live sessions
        // ------------------------
        // Reuse oAuth2Client defined earlier for email setup
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        const organizerCalendar = adminEmail; // urbanpilgrim25@gmail.com
        console.log("cart Data:", cartData);

        for (const program of cartData) {
            console.log("program type: ", program.type || program.category);
            if (
                (program.type === "live" || program.category === "live") &&
                program.slots?.length
            ) {
                for (const slot of program.slots) {
                    const startDateTime = new Date(
                        `${slot.date}T${slot.startTime}:00`
                    );
                    const endDateTime = new Date(
                        `${slot.date}T${slot.endTime}:00`
                    );

                    console.log("organizer data:", program);
                    const event = {
                        summary: program.title,
                        description: `Live session booking for ${program.title}
                                        Persons: ${program.persons}
                                        Join here: ${program?.organizer?.googleMeetLink}`,
                        location: program?.organizer?.googleMeetLink,
                        start: {
                            dateTime: startDateTime.toISOString(),
                            timeZone: "Asia/Kolkata",
                        },
                        end: {
                            dateTime: endDateTime.toISOString(),
                            timeZone: "Asia/Kolkata",
                        },
                        attendees: [
                            { email },
                            { email: adminEmail },
                            { email: program?.organizer?.email },
                        ],
                    };

                    const createdEvent = await calendar.events.insert({
                        calendarId: organizerCalendar,
                        resource: event,
                        sendUpdates: "all",
                    });

                    // const meetLink = createdEvent.data.conferenceData?.entryPoints?.[0]?.uri;
                    const meetLink = program?.organizer?.googleMeetLink;
                    console.log("Google Meet Link:", meetLink);

                    const mailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Live Session Booking</title>
                        </head>
                        <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, #2F6288 0%, #C5703F 100%); padding: 25px 20px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Live Session Confirmed</h1>
                                    <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${program.title}</p>
                                </div>
                                
                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0;">
                                        <div style="margin: 15px 0;">
                                            <span style="color: #666; font-size: 14px; display: block; margin-bottom: 5px;">Date</span>
                                            <span style="color: #333; font-size: 16px; font-weight: bold;">${slot.date}</span>
                                        </div>
                                        <div style="margin: 15px 0;">
                                            <span style="color: #666; font-size: 14px; display: block; margin-bottom: 5px;">Time</span>
                                            <span style="color: #333; font-size: 16px; font-weight: bold;">${slot.startTime} - ${slot.endTime}</span>
                                        </div>
                                        <div style="margin: 15px 0;">
                                            <span style="color: #666; font-size: 14px; display: block; margin-bottom: 5px;">Participants</span>
                                            <span style="color: #333; font-size: 16px; font-weight: bold;">${program.persons}</span>
                                        </div>
                                        <div style="margin: 15px 0;">
                                            <span style="color: #666; font-size: 14px; display: block; margin-bottom: 5px;">🔗 Meeting Link</span>
                                            <a href="${meetLink}" target="_blank" style="color: #C5703F; font-size: 16px; font-weight: bold; text-decoration: none;">${meetLink}</a>
                                        </div>
                                    </div>
                                    
                                    <div style="background: linear-gradient(135deg, #2F6288, #C5703F); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                                        <p style="color: #ffffff; margin: 0; font-size: 14px;">Calendar invite has been sent to all participants</p>
                                    </div>
                                </div>
                                
                                <!-- Footer -->
                                <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
                                    <p style="color: #999; margin: 0; font-size: 12px;">Urban Pilgrim Live Sessions</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    // Mail send to admin
                    await transporter.sendMail({
                        from: gmailEmail,
                        to: adminEmail,
                        subject: `🎯 Live Session Booked - ${program.title}`,
                        html: mailHtml,
                    });
                }
                console.log("All live session events created successfully");
            }

            // ------------------------
            // 5) Google Calendar for guide sessions
            // ------------------------
            if (
                (program.type === "guide" || program.category === "guide") &&
                program.slot &&
                program.date
            ) {
                // Debug: Log program data for guide calendar
                console.log("=== GUIDE CALENDAR DEBUG ===");
                console.log("Program data:", JSON.stringify(program, null, 2));
                console.log("Program date:", program.date);
                console.log(
                    "Program slot:",
                    JSON.stringify(program.slot, null, 2)
                );

                // Build local datetime strings and validate range
                const durationMin = Number(
                    program?.slot?.duration || program?.duration || 60
                );

                // Handle different time formats - check if already in RFC3339 format
                let startTime = program.slot.startTime || program.slot.time;
                let endTime = program.slot.endTime;

                let startLocal, endLocal;

                // Check if startTime is already in RFC3339 format (contains 'T' and timezone)
                if (
                    startTime &&
                    startTime.includes("T") &&
                    startTime.includes("+")
                ) {
                    // Already in RFC3339 format
                    startLocal = startTime;
                    endLocal = endTime || startTime;
                } else {
                    // Convert from simple time format
                    startLocal = `${program.date}T${startTime}:00+05:30`;
                    endLocal = endTime
                        ? `${program.date}T${endTime}:00+05:30`
                        : `${program.date}T${startTime}:00+05:30`;
                }

                // Validate and fix end time if needed
                const toMs = (s) => new Date(s).getTime();
                if (!endTime || toMs(endLocal) <= toMs(startLocal)) {
                    const duration = Number(
                        program.slot.duration || program.duration || 60
                    );
                    const endMs =
                        new Date(startLocal).getTime() + duration * 60 * 1000;
                    endLocal = new Date(endMs)
                        .toISOString()
                        .replace("Z", "+05:30");
                }

                console.log("Processed startLocal:", startLocal);
                console.log("Processed endLocal:", endLocal);

                // Occupancy type label for event/email
                const occRaw = (program.occupancyType || "individual")
                    .toString()
                    .toLowerCase();
                const typeLabel = occRaw
                    ? occRaw.charAt(0).toUpperCase() + occRaw.slice(1)
                    : "Individual";

                // Build Google Calendar event for organizer calendar
                const guideEvent = {
                    summary: `Guide Session: ${program.title}`,
                    description: `Urban Pilgrim — Guide session booking for ${
                        program.title
                    }\nMode: ${program.mode}\nType: ${typeLabel}\nDate: ${
                        program.date
                    }\nTime: ${startTime}${endTime ? ` - ${endTime}` : ""}`,
                    location:
                        program.mode === "Offline"
                            ? program.slot.location || "In-person Session"
                            : program?.organizer?.googleMeetLink || "Online",
                    start: { dateTime: startLocal, timeZone: "Asia/Kolkata" },
                    end: { dateTime: endLocal, timeZone: "Asia/Kolkata" },
                    attendees: [
                        { email },
                        { email: adminEmail },
                        { email: program?.organizer?.email },
                    ],
                    source: {
                        title: "Urban Pilgrim",
                        url: "https://urbanpilgrim.in",
                    },
                };

                console.log(
                    "Google Calendar Insert Payload:",
                    JSON.stringify(guideEvent, null, 2)
                );
                console.log("=== END GUIDE CALENDAR DEBUG ===");

                // Insert calendar event only for Online mode; do not block on failure
                if (calendar) {
                    try {
                        console.log(
                            "Attempting calendar insert with calendarId:",
                            organizerCalendar
                        );
                        const result = await calendar.events.insert({
                            calendarId: organizerCalendar,
                            resource: guideEvent,
                            sendUpdates: "all",
                        });
                        console.log(
                            "Guide calendar insert successful:",
                            result.data.id
                        );
                    } catch (e) {
                        console.error(
                            "Guide calendar insert failed:",
                            e?.message || e
                        );
                        console.error("Calendar ID used:", organizerCalendar);
                        console.error(
                            "Event payload that failed:",
                            JSON.stringify(guideEvent, null, 2)
                        );
                        // Don't throw error - just log it so payment can continue
                    }
                }

                // Enhanced email template for monthly bookings with all slots
                const meetLink = program?.organizer?.googleMeetLink || "";

                // Generate slots HTML for monthly bookings
                let slotsHtml = "";
                let calendarEventsToCreate = [];

                if (
                    program.selectedSlots &&
                    Array.isArray(program.selectedSlots) &&
                    program.selectedSlots.length > 0
                ) {
                    // Monthly booking - show all selected slots
                    slotsHtml = `
                        <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 10px; padding: 16px; margin: 16px 0;">
                            <h3 style="color: #1976d2; margin: 0 0 12px 0; font-size: 16px;">📅 Monthly Session Schedule (${program.selectedSlots.length} sessions)</h3>
                            <div style="display: grid; gap: 8px;">
                    `;

                    program.selectedSlots.forEach((slot, index) => {
                        const slotDate = new Date(slot.date).toLocaleDateString(
                            "en-US",
                            {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            }
                        );

                        slotsHtml += `
                            <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #1976d2;">
                                <strong>Session ${
                                    index + 1
                                }:</strong> ${slotDate}<br>
                                <span style="color: #666;">⏰ ${
                                    slot.startTime
                                } - ${slot.endTime} (Asia/Kolkata)</span>
                                ${
                                    program.mode === "Online" && meetLink
                                        ? `<br><span style="color: #1976d2;">🔗 <a href="${meetLink}" target="_blank">Join Meeting</a></span>`
                                        : ""
                                }
                            </div>
                        `;

                        // Prepare calendar events for each slot
                        calendarEventsToCreate.push({
                            summary: `${program.title} - Session ${index + 1}`,
                            description: `Urban Pilgrim — Guide session booking for ${
                                program.title
                            }\nMode: ${
                                program.mode
                            }\nType: ${typeLabel}\nSession ${index + 1} of ${
                                program.selectedSlots.length
                            }`,
                            location:
                                program.mode === "Offline"
                                    ? slot.location || "In-person Session"
                                    : meetLink,
                            start: {
                                dateTime: slot.startTime,
                                timeZone: "Asia/Kolkata",
                            },
                            end: {
                                dateTime: slot.endTime,
                                timeZone: "Asia/Kolkata",
                            },
                            attendees: [
                                { email },
                                { email: adminEmail },
                                { email: program?.organizer?.email },
                            ],
                            source: {
                                title: "Urban Pilgrim",
                                url: "https://urbanpilgrim.in",
                            },
                        });
                    });

                    slotsHtml += `
                            </div>
                            <div style="margin-top: 12px; padding: 8px; background: #f0f8ff; border-radius: 4px;">
                                <small style="color: #1976d2;">
                                    <strong>Booking Status:</strong> 
                                    ${
                                        program.occupancyType === "group"
                                            ? program.status === "waiting"
                                                ? "⏳ Waiting for minimum participants (7 days)"
                                                : "✅ Active - Sessions will begin as scheduled"
                                            : "✅ Confirmed - Sessions start immediately"
                                    }
                                </small>
                            </div>
                        </div>
                    `;
                } else {
                    // Single session booking
                    slotsHtml = `
                        <div style="background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 16px;">
                            <p style="margin: 6px 0; color: #333;"><strong>Date:</strong> ${
                                program.date
                            }</p>
                            <p style="margin: 6px 0; color: #333;"><strong>Time:</strong> ${
                                program.slot.time
                            }${
                        program.slot.endTime ? ` - ${program.slot.endTime}` : ""
                    } (Asia/Kolkata)</p>
                            ${
                                program.mode === "Online" && meetLink
                                    ? `<p style="margin: 6px 0; color: #333;"><strong>Meet Link:</strong> <a href="${meetLink}" target="_blank" style="color: #1976d2;">${meetLink}</a></p>`
                                    : ""
                            }
                        </div>
                    `;
                }

                const guideMailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Guide Session Booking</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; background: #f6f9fc; margin: 0; padding: 0;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <div style="background: linear-gradient(135deg, #2F6288 0%, #C5703F 100%); padding: 25px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                                    ${
                                        program.selectedSlots &&
                                        program.selectedSlots.length > 1
                                            ? "Booking Confirmation - Pilgrim Guide Session"
                                            : "Guide Session Booked"
                                    }
                                </h1>
                                <p style="color: #e6f0f7; margin: 6px 0 0 0; font-size: 14px;">Urban Pilgrim • Organizer Notification</p>
                            </div>
                            <div style="padding: 24px;">
                                <p style="color: #333; margin: 0 0 14px 0; font-size: 14px;">
                                    ${
                                        program.selectedSlots &&
                                        program.selectedSlots.length > 1
                                            ? `A new monthly guide session package has been booked with ${program.selectedSlots.length} sessions.`
                                            : "A new guide session has been booked."
                                    }
                                </p>
                                
                                <div style="background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                                    <h3 style="color: #2F6288; margin: 0 0 12px 0; font-size: 16px;">📋 Booking Details</h3>
                                    <p style="margin: 6px 0; color: #333;"><strong>Program:</strong> ${
                                        program.title
                                    }</p>
                                    <p style="margin: 6px 0; color: #333;"><strong>Mode:</strong> ${
                                        program.mode
                                    }</p>
                                    <p style="margin: 6px 0; color: #333;"><strong>Occupancy:</strong> ${typeLabel}</p>
                                    <p style="margin: 6px 0; color: #333;"><strong>Customer:</strong> ${email}</p>
                                    <p style="margin: 6px 0; color: #333;"><strong>Booking Date:</strong> ${new Date().toLocaleDateString(
                                        "en-US",
                                        {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        }
                                    )}</p>
                                </div>
                                
                                ${slotsHtml}
                                
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 12px; margin-top: 16px;">
                                    <p style="margin: 0; color: #856404; font-size: 13px;">
                                        <strong>📝 Note:</strong> Calendar events have been created for ${
                                            program.selectedSlots &&
                                            program.selectedSlots.length > 1
                                                ? "all sessions"
                                                : "this session"
                                        }. 
                                        Please ensure your availability for the scheduled times.
                                    </p>
                                </div>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
                                <p style="color: #999; margin: 0; font-size: 12px;">Urban Pilgrim Guide Sessions • Organizer Dashboard</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                // Create calendar events for all monthly slots
                if (calendar && calendarEventsToCreate.length > 0) {
                    console.log(
                        `Creating ${calendarEventsToCreate.length} calendar events for monthly sessions...`
                    );

                    for (let i = 0; i < calendarEventsToCreate.length; i++) {
                        try {
                            const eventResult = await calendar.events.insert({
                                calendarId: organizerCalendar,
                                resource: calendarEventsToCreate[i],
                                sendUpdates: "all",
                            });
                            console.log(
                                `Calendar event ${i + 1} created successfully:`,
                                eventResult.data.id
                            );
                        } catch (e) {
                            console.error(
                                `Failed to create calendar event ${i + 1}:`,
                                e?.message || e
                            );
                        }
                    }
                }

                // Mail to admin (organizer)
                await transporter.sendMail({
                    from: `Urban Pilgrim <${gmailEmail}>`,
                    to: adminEmail,
                    subject: `🧘‍♀️ Urban Pilgrim • ${
                        program.selectedSlots &&
                        program.selectedSlots.length > 1
                            ? "Monthly Sessions"
                            : "Guide Session"
                    } Booked - ${program.title}`,
                    html: guideMailHtml,
                });

                console.log("Guide session emails sent successfully");
            }
        }

        // ------------------------
        // 6) Send notifications to retreat guides/organizers
        // ------------------------
        try {
            for (const program of cartData) {
                // Check if this is a retreat program
                if (
                    program.type === "retreat" ||
                    program.category === "retreat" ||
                    (program.title &&
                        program.title.toLowerCase().includes("retreat"))
                ) {
                    console.log(
                        `Processing retreat notification for: ${program.title}`
                    );

                    // Get retreat guide contact information from meetGuide field
                    const meetGuide = program.meetGuide;
                    if (meetGuide && (meetGuide.email || meetGuide.number)) {
                        const guideEmail = meetGuide.email;
                        const guidePhone = meetGuide.number;
                        const guideName = meetGuide?.email
                            ? meetGuide.email
                                  .split("@")[0] // take part before "@"
                                  .replace(/[\d\W_]+/g, "") // remove digits & special chars
                                  .replace(/^./, (c) => c.toUpperCase()) // capitalize first letter
                            : "Guide";

                        // Prepare notification content
                        const customerInfo = `${name} (${email})`;
                        const retreatTitle = program.title;
                        const bookingDate = new Date().toLocaleDateString(
                            "en-US",
                            {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            }
                        );
                        const paymentId = paymentResponse.razorpay_payment_id;

                        // Send email notification to retreat guide
                        if (guideEmail) {
                            try {
                                const guideEmailHtml = `
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta charset="utf-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <title>New Retreat Booking</title>
                                    </head>
                                    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
                                        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                            <div style="background: linear-gradient(135deg, #2F6288 0%, #1e4a66 100%); color: white; padding: 30px 20px; text-align: center;">
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🧘‍♀️ New Retreat Booking</h1>
                                                <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Urban Pilgrim</p>
                                            </div>
                                            
                                            <div style="padding: 30px 20px;">
                                                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                                    Dear ${guideName},
                                                </p>
                                                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                                    You have received a new booking for your retreat program!
                                                </p>
                                                
                                                <div style="background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                                                    <h3 style="color: #2F6288; margin: 0 0 15px 0; font-size: 18px;">📋 Booking Details</h3>
                                                    <p style="margin: 8px 0; color: #333;"><strong>Retreat Program:</strong> ${retreatTitle}</p>
                                                    <p style="margin: 8px 0; color: #333;"><strong>Customer:</strong> ${customerInfo}</p>
                                                    <p style="margin: 8px 0; color: #333;"><strong>Booking Date:</strong> ${bookingDate}</p>
                                                    <p style="margin: 8px 0; color: #333;"><strong>Payment ID:</strong> ${paymentId}</p>
                                                </div>
                                                
                                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 20px;">
                                                    <p style="margin: 0; color: #856404; font-size: 14px;">
                                                        <strong>📝 Next Steps:</strong> Please reach out to the customer to coordinate retreat details, 
                                                        including location, schedule, and any specific requirements.
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                                                <p style="color: #999; margin: 0; font-size: 12px;">Urban Pilgrim Retreat Bookings • Guide Notification</p>
                                            </div>
                                        </div>
                                    </body>
                                    </html>
                                `;

                                await transporter.sendMail({
                                    from: `Urban Pilgrim <${gmailEmail}>`,
                                    to: guideEmail,
                                    subject: `🧘‍♀️ New Retreat Booking - ${retreatTitle}`,
                                    html: guideEmailHtml,
                                });

                                console.log(
                                    `Retreat booking email sent to guide: ${guideEmail}`
                                );
                            } catch (emailError) {
                                console.error(
                                    "Failed to send retreat booking email to guide:",
                                    emailError
                                );
                            }
                        }

                        // Send WhatsApp notification to retreat guide
                        if (guidePhone) {
                            try {
                                // Format phone number for WhatsApp (ensure it starts with country code)
                                let formattedPhone = guidePhone
                                    .toString()
                                    .replace(/\D/g, ""); // Remove non-digits
                                if (
                                    !formattedPhone.startsWith("91") &&
                                    formattedPhone.length === 10
                                ) {
                                    formattedPhone = "91" + formattedPhone; // Add India country code
                                }
                                if (!formattedPhone.startsWith("+")) {
                                    formattedPhone = "+" + formattedPhone;
                                }

                                const whatsappMessage =
                                    `🧘‍♀️ *New Retreat Booking*\n\n` +
                                    `*Retreat:* ${retreatTitle}\n` +
                                    `*Customer:* ${customerInfo}\n` +
                                    `*Booking Date:* ${bookingDate}\n` +
                                    `*Payment ID:* ${paymentId}\n\n` +
                                    `Please coordinate with the customer for retreat details.\n\n` +
                                    `_Urban Pilgrim Team_`;

                                const waRes = await sendWhatsApp(
                                    formattedPhone,
                                    whatsappMessage,
                                    false
                                );

                                if (waRes?.ok) {
                                    console.log(
                                        `Retreat booking WhatsApp sent to guide: ${formattedPhone}`
                                    );
                                } else {
                                    console.error(
                                        "Failed to send retreat booking WhatsApp to guide:",
                                        waRes?.error
                                    );
                                }
                            } catch (whatsappError) {
                                console.error(
                                    "Failed to send retreat booking WhatsApp to guide:",
                                    whatsappError
                                );
                            }
                        }

                        console.log(
                            `Retreat notifications processed for ${retreatTitle}`
                        );
                    } else {
                        console.log(
                            `No guide contact information found for retreat: ${program.title}`
                        );
                    }
                }
            }
        } catch (retreatNotificationError) {
            console.error(
                "Error sending retreat notifications:",
                retreatNotificationError
            );
            // Don't fail the entire payment for notification errors
        }

        return {
            success: true,
            message: "Payment confirmed",
            programsWithExpiration: cartData.filter(
                (item) => item.expirationDate
            ).length,
            totalPrograms: cartData.length,
        };
    } catch (error) {
        console.error("confirmPayment Error:", error);
        return { status: "error", message: error.message };
    }
});

exports.cleanupExpiredSubscriptions = onSchedule(
    {
        schedule: "0 2 * * *", // Daily at 2 AM UTC
        timeZone: "UTC",
        memory: "256MiB",
        timeoutSeconds: 540,
    },
    async (event) => {
        console.log("Starting expired subscription cleanup...");

        try {
            const now = new Date();
            const batch = db.batch();
            let cleanupCount = 0;

            // Get all users
            const usersSnapshot = await db.collection("users").get();

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userProgramsRef = db
                    .collection("users")
                    .doc(userId)
                    .collection("programs");
                const programsSnapshot = await userProgramsRef.get();

                for (const programDoc of programsSnapshot.docs) {
                    const program = programDoc.data();

                    // Check if program has expiration date and is expired
                    if (program.expirationDate) {
                        const expirationDate = new Date(program.expirationDate);

                        if (now > expirationDate) {
                            console.log(
                                `Removing expired subscription: ${program.title} for user ${userId}`
                            );
                            batch.delete(programDoc.ref);
                            cleanupCount++;
                        }
                    }
                }
            }

            // Commit all deletions
            if (cleanupCount > 0) {
                await batch.commit();
                console.log(
                    `Successfully cleaned up ${cleanupCount} expired subscriptions`
                );
            } else {
                console.log("No expired subscriptions found");
            }

            return { success: true, cleanupCount };
        } catch (error) {
            console.error("Error during subscription cleanup:", error);
            throw error;
        }
    }
);

exports.manualCleanupExpiredSubscriptions = onRequest(
    {
        cors: true,
        memory: "256MiB",
        timeoutSeconds: 540,
    },
    async (req, res) => {
        try {
            // Verify admin access (you can add authentication here)
            const { adminKey } = req.body;
            if (adminKey !== process.env.ADMIN_CLEANUP_KEY) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            console.log("Manual cleanup triggered...");

            const now = new Date();
            const batch = db.batch();
            let cleanupCount = 0;

            // Get all users
            const usersSnapshot = await db.collection("users").get();

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userProgramsRef = db
                    .collection("users")
                    .doc(userId)
                    .collection("programs");
                const programsSnapshot = await userProgramsRef.get();

                for (const programDoc of programsSnapshot.docs) {
                    const program = programDoc.data();

                    // Check if program has expiration date and is expired
                    if (program.expirationDate) {
                        const expirationDate = new Date(program.expirationDate);

                        if (now > expirationDate) {
                            console.log(
                                `Removing expired subscription: ${program.title} for user ${userId}`
                            );
                            batch.delete(programDoc.ref);
                            cleanupCount++;
                        }
                    }
                }
            }

            // Commit all deletions
            if (cleanupCount > 0) {
                await batch.commit();
            }

            res.json({
                success: true,
                message: `Cleaned up ${cleanupCount} expired subscriptions`,
                cleanupCount,
            });
        } catch (error) {
            console.error("Error during manual cleanup:", error);
            res.status(500).json({
                error: "Cleanup failed",
                details: error.message,
            });
        }
    }
);

exports.checkUserSubscriptionStatus = functions.https.onCall(
    async (data, context) => {
        try {
            const { uid } = context.auth;
            if (!uid) {
                throw new functions.https.HttpsError(
                    "unauthenticated",
                    "User not authenticated"
                );
            }

            const now = new Date();
            const userProgramsRef = db
                .collection("users")
                .doc(uid)
                .collection("programs");
            const programsSnapshot = await userProgramsRef.get();

            const activePrograms = [];
            const expiredPrograms = [];
            const batch = db.batch();

            for (const programDoc of programsSnapshot.docs) {
                const program = { id: programDoc.id, ...programDoc.data() };

                if (program.expirationDate) {
                    const expirationDate = new Date(program.expirationDate);

                    if (now > expirationDate) {
                        // Mark as expired and remove
                        expiredPrograms.push(program);
                        batch.delete(programDoc.ref);
                    } else {
                        // Still active
                        activePrograms.push(program);
                    }
                } else {
                    // One-time purchase, never expires
                    activePrograms.push(program);
                }
            }

            // Remove expired subscriptions
            if (expiredPrograms.length > 0) {
                await batch.commit();
            }

            return {
                activePrograms,
                expiredPrograms: expiredPrograms.map((p) => ({
                    id: p.id,
                    title: p.title,
                })),
                message:
                    expiredPrograms.length > 0
                        ? `${expiredPrograms.length} expired subscription(s) removed`
                        : "All subscriptions are active",
            };
        } catch (error) {
            console.error("Error checking subscription status:", error);
            throw new functions.https.HttpsError(
                "internal",
                "Failed to check subscription status"
            );
        }
    }
);

exports.createGiftCardOrder = functions.https.onCall(async (data, context) => {
    console.log("data from createGiftCardOrder", data.data);
    const { amount } = data.data || {};
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Valid amount required"
        );
    }
    const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: `gift_${Date.now()}`,
        notes: { type: "gift_card" },
    };
    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (err) {
        throw new functions.https.HttpsError("internal", err.message);
    }
});

function generateCouponCode(len = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++)
        out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

exports.confirmGiftCardPayment = functions.https.onCall(
    async (data, context) => {
        try {
            const {
                purchaserEmail,
                purchaserName,
                programTitle,
                programType,
                programId,
                amount,
                paymentResponse,
            } = data.data || {};
            if (!purchaserEmail || !amount || !paymentResponse) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Missing required fields"
                );
            }

            // Generate unique code (retry small number of times if collision)
            const couponsRef = db.collection("coupons");
            let code = generateCouponCode(10);
            for (let i = 0; i < 3; i++) {
                const exists = await couponsRef
                    .where("code", "==", code)
                    .limit(1)
                    .get();
                if (exists.empty) break;
                code = generateCouponCode(10);
            }

            const couponDoc = {
                code,
                discountType: "fixed",
                discountValue: amount,
                programType: programType || "any",
                // Restrict to a specific program by title/id if provided
                restrictToProgram: {
                    id: programId || null,
                    title: programTitle || null,
                },
                minOrderAmount: 0,
                maxDiscount: amount,
                usageLimit: 1,
                usedCount: 0,
                isActive: true,
                isGiftCard: true,
                description: `Gift card for ${
                    programTitle || "Urban Pilgrim program"
                }`,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsedAt: null,
                lastUsedBy: null,
            };

            await couponsRef.add(couponDoc);

            // Create personalized gift card image with coupon code
            const personalizedGiftCardPath = await createGiftCardWithCoupon(
                code
            );

            // Email code to purchaser with gift card image
            const html = `
            <div style="font-family: Arial, sans-serif; line-height:1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color:#2F6288;">Your Urban Pilgrim Gift Card</h2>
                <p>Hi ${purchaserName || "Pilgrim"},</p>
                <p>Thank you for your purchase. Here is your gift card:</p>
                
                <!-- Gift Card Image with Coupon Code Overlay -->
                <div style="margin: 20px auto; max-width: 500px; text-align: center;">
                    <img src="cid:giftCardImage" alt="Gift Card" style="width: 100%; display: block; border-radius: 12px;" />
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Value:</strong> ₹${amount}</p>
                    ${
                        programTitle
                            ? `<p style="margin: 0 0 10px 0;"><strong>Applicable Program:</strong> ${programTitle}</p>`
                            : ""
                    }
                    <p style="margin: 0;"><strong>How to use:</strong> Apply this code in the cart's coupon field during checkout.</p>
                    <p style="margin: 10px 0 0 0; color: #dc3545; font-weight: 600;">⚠️ This code can be used only once.</p>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    Thank you for choosing Urban Pilgrim. We look forward to serving you!
                </p>
            </div>
        `;

            // Use personalized gift card image or fallback to original
            const giftCardImagePath =
                personalizedGiftCardPath ||
                path.join(__dirname, "gift_card.jpg");
            const giftCardAttachment = fs.existsSync(giftCardImagePath)
                ? [
                      {
                          filename: "gift_card.jpg",
                          path: giftCardImagePath,
                          cid: "giftCardImage",
                      },
                  ]
                : [];

            console.log("gift card attachment: ", giftCardAttachment);

            await transporter.sendMail({
                from: gmailEmail,
                to: purchaserEmail,
                subject: "Your Urban Pilgrim Gift Card",
                html,
                attachments: giftCardAttachment,
            });

            return { success: true, code };
        } catch (err) {
            console.error("confirmGiftCardPayment error:", err);
            throw new functions.https.HttpsError("internal", err.message);
        }
    }
);

// New function for gift card program purchases (from gift card details page)
exports.createGiftCardProgramOrder = functions.https.onCall(
    async (data, context) => {
        console.log("data from createGiftCardProgramOrder", data.data);
        const { amount, giftCardType, quantity = 1 } = data.data || {};
        if (!amount || amount <= 0 || !giftCardType) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Valid amount and gift card type required"
            );
        }

        const totalAmount = amount * quantity;
        const options = {
            amount: totalAmount * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: `gift_program_${Date.now()}`,
            notes: {
                type: "gift_card_program",
                giftCardType: giftCardType,
                quantity: quantity.toString(),
            },
        };

        try {
            const order = await razorpay.orders.create(options);
            return order;
        } catch (err) {
            throw new functions.https.HttpsError("internal", err.message);
        }
    }
);

// Function to map gift card types to program types for coupon restrictions
function getGiftCardProgramType(giftCardType) {
    const typeMapping = {
        "wellness-retreat": "retreat",
        "wellness-program": "live",
        "pilgrim-guide": "guide",
        // Updated mappings for your actual categories
        "pilgrim retreat": "retreat",
        "pilgrim wellness program": "live",
        "pilgrim guide": "guide",
    };
    return typeMapping[giftCardType] || "any";
}

// Function to get program type description for email
function getGiftCardDescription(giftCardType) {
    const descriptions = {
        "wellness-retreat": "Wellness Retreats",
        "wellness-program": "Wellness Programs & Live Sessions",
        "pilgrim-guide": "Pilgrim Guide Services",
        // Updated descriptions for your actual categories
        "pilgrim retreat": "Pilgrim Retreats",
        "pilgrim wellness program": "Pilgrim Wellness Programs & Live Sessions",
        "pilgrim guide": "Pilgrim Guide Services",
    };
    return descriptions[giftCardType] || "Urban Pilgrim Services";
}

exports.confirmGiftCardProgramPayment = functions.https.onCall(
    async (data, context) => {
        try {
            const {
                purchaserEmail,
                purchaserName,
                giftCardType,
                giftCardTitle,
                amount,
                quantity = 1,
                paymentResponse,
            } = data.data || {};

            if (
                !purchaserEmail ||
                !amount ||
                !giftCardType ||
                !paymentResponse
            ) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Missing required fields"
                );
            }

            const totalAmount = amount * quantity;
            const programType = getGiftCardProgramType(giftCardType);
            const programDescription = getGiftCardDescription(giftCardType);

            // Generate unique code (retry small number of times if collision)
            const couponsRef = db.collection("coupons");
            let code = generateCouponCode(10);
            for (let i = 0; i < 3; i++) {
                const exists = await couponsRef
                    .where("code", "==", code)
                    .limit(1)
                    .get();
                if (exists.empty) break;
                code = generateCouponCode(10);
            }

            const couponDoc = {
                code,
                discountType: "fixed",
                discountValue: totalAmount,
                programType: programType, // 'retreat', 'live', 'guide', or 'any'
                minOrderAmount: 0,
                maxDiscount: totalAmount,
                usageLimit: 1,
                usedCount: 0,
                isActive: true,
                isGiftCard: true,
                giftCardType: giftCardType,
                description: `Gift card for ${programDescription}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsedAt: null,
                lastUsedBy: null,
            };

            await couponsRef.add(couponDoc);

            // Create personalized gift card image with coupon code
            const personalizedGiftCardPath = await createGiftCardWithCoupon(
                code
            );

            // Enhanced email with program type information and gift card image
            const html = `
            <div style="font-family: Arial, sans-serif; line-height:1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color:#2F6288;">Your Urban Pilgrim Gift Card</h2>
                <p>Hi ${purchaserName || "Pilgrim"},</p>
                <p>Thank you for your purchase. Here is your gift card:</p>
                
                <!-- Gift Card Image with Coupon Code Overlay -->
                <div style="margin: 20px auto; max-width: 500px; text-align: center;">
                    <img src="cid:giftCardImage" alt="Gift Card" style="width: 100%; display: block; border-radius: 12px;" />
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2F6288; margin-top: 0;">Gift Card Details:</h3>
                    <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${
                        giftCardTitle || programDescription
                    }</p>
                    <p style="margin: 0 0 10px 0;"><strong>Value:</strong> ₹${totalAmount.toLocaleString(
                        "en-IN"
                    )}</p>
                    ${
                        quantity > 1
                            ? `<p style="margin: 0 0 10px 0;"><strong>Quantity:</strong> ${quantity}</p>`
                            : ""
                    }
                    <p style="margin: 0 0 10px 0;"><strong>Valid for:</strong> ${programDescription}</p>
                    <p style="margin: 0;"><strong>Usage:</strong> One-time use only</p>
                </div>
                
                <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #2F6288; margin-top: 0;">How to Use:</h4>
                    <ol style="color: #666; padding-left: 20px; margin: 0;">
                        <li>Add ${programDescription.toLowerCase()} to your cart</li>
                        <li>Enter the coupon code: <strong>${code}</strong></li>
                        <li>Enjoy your discount!</li>
                    </ol>
                    <p style="margin: 10px 0 0 0; color: #dc3545; font-weight: 600;">⚠️ This code can be used only once.</p>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px; text-align: center;">
                    Thank you for choosing Urban Pilgrim! 🙏
                </p>
            </div>
        `;

            // Use personalized gift card image or fallback to original
            const giftCardImagePath =
                personalizedGiftCardPath ||
                path.join(__dirname, "gift_card.jpg");
            const giftCardAttachment = fs.existsSync(giftCardImagePath)
                ? [
                      {
                          filename: "gift_card.jpg",
                          path: giftCardImagePath,
                          cid: "giftCardImage",
                      },
                  ]
                : [];

            console.log("gift card attachment (program): ", giftCardAttachment);

            await transporter.sendMail({
                from: gmailEmail,
                to: purchaserEmail,
                subject: `🎁 Your ${
                    giftCardTitle || programDescription
                } Gift Card - ₹${totalAmount.toLocaleString("en-IN")}`,
                html,
                attachments: giftCardAttachment,
            });

            return { success: true, code, programType, totalAmount };
        } catch (err) {
            console.error("confirmGiftCardProgramPayment error:", err);
            throw new functions.https.HttpsError("internal", err.message);
        }
    }
);

exports.sendWhatsappReminder = functions.https.onCall(async (data, context) => {
    try {
        const { phoneNumber, message } = data.data;
        const client = getTwilioClient();
        if (!client) throw new Error("Twilio client not configured");
        const res = await client.messages.create({
            from: "whatsapp:+14155238886",
            to: `whatsapp:${phoneNumber}`,
            body: message,
        });

        return { success: true, sid: res.sid };
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        return { success: false, error: error.message };
    }
});

exports.sendInstantWhatsappOnCreate = onDocumentCreated(
    "whatsapp_reminders/{id}",
    async (event) => {
        try {
            const snap = event.data; // DocumentSnapshot
            const data = snap?.data() || {};
            // Only handle instant-fallback or minutesBefore 0 within 2 minutes window
            const now = new Date();
            const sendAt = data.sendAt?.toDate ? data.sendAt.toDate() : null;
            const isInstant =
                data.kind === "instant-fallback" || data.minutesBefore === 0;
            if (!isInstant) return null;
            if (!sendAt || sendAt.getTime() > now.getTime() + 2 * 60 * 1000)
                return null;

            const body =
                data.message ||
                `Reminder: Your Urban Pilgrim session "${data.programTitle}" is starting soon.`;
            const res = await sendWhatsApp(data.to, body);
            if (res.ok) {
                await snap.ref.update({
                    status: "sent",
                    sentAt: admin.firestore.Timestamp.now(),
                    sid: res.sid,
                });
            } else {
                await snap.ref.update({
                    status: "error",
                    error: res.error,
                    updatedAt: admin.firestore.Timestamp.now(),
                });
            }
            return null;
        } catch (e) {
            console.error("sendInstantWhatsappOnCreate error:", e);
            return null;
        }
    }
);

exports.processBookingLifecycle = onSchedule(
    {
        schedule: "0 9 * * *", // Daily at 9 AM
        timeZone: "Asia/Kolkata",
        memory: "256MiB",
        timeoutSeconds: 540,
    },
    async (event) => {
        try {
            console.log("Starting booking lifecycle processing...");

            const today = new Date().toISOString().slice(0, 10);

            // Process group bookings that have completed waiting period
            await processGroupWaitingPeriods(today);

            // Cleanup expired bookings
            await cleanupExpiredBookings(today);

            console.log("Booking lifecycle processing completed successfully");
            return null;
        } catch (error) {
            console.error("Error in booking lifecycle processing:", error);
            throw error;
        }
    }
);

async function processGroupWaitingPeriods(today) {
    try {
        // Find all group bookings where waiting period has ended
        const waitingBookings = await db
            .collection("carts")
            .where("occupancyType", "==", "group")
            .where("status", "==", "waiting")
            .where("waitingPeriodEnd", "<=", today)
            .get();

        console.log(
            `Found ${waitingBookings.size} group bookings with ended waiting periods`
        );

        for (const bookingDoc of waitingBookings.docs) {
            const booking = bookingDoc.data();
            const bookingId = bookingDoc.id;

            // Count total bookings for the same slots and program
            const slotBookingCount = await getSlotBookingCount(booking);

            console.log(
                `Group booking ${bookingId}: ${slotBookingCount}/${booking.minPersons} minimum required`
            );

            if (slotBookingCount >= booking.minPersons) {
                // Minimum reached - activate the group
                await bookingDoc.ref.update({
                    status: "active",
                    actualStartDate: today,
                    updatedAt: new Date(),
                });

                console.log(
                    `Group booking ${bookingId} activated - minimum persons reached`
                );

                // Send activation email
                await sendGroupActivationEmail(booking);
            } else {
                // Minimum not reached - process refund
                await processGroupRefund(booking, bookingDoc.ref);
                console.log(
                    `Group booking ${bookingId} refunded - minimum persons not reached`
                );
            }
        }
    } catch (error) {
        console.error("Error processing group waiting periods:", error);
        throw error;
    }
}

async function cleanupExpiredBookings(today) {
    try {
        // Find all bookings that have expired
        const expiredBookings = await db
            .collection("carts")
            .where("endDate", "<", today)
            .where("status", "in", ["active"])
            .get();

        console.log(
            `Found ${expiredBookings.size} expired bookings to cleanup`
        );

        for (const bookingDoc of expiredBookings.docs) {
            const booking = bookingDoc.data();
            const bookingId = bookingDoc.id;

            // Mark as completed
            await bookingDoc.ref.update({
                status: "completed",
                completedDate: today,
                updatedAt: new Date(),
            });

            console.log(
                `Booking ${bookingId} marked as completed and slots freed up`
            );

            // Send completion notification
            await sendBookingCompletionEmail(booking);
        }
    } catch (error) {
        console.error("Error cleaning up expired bookings:", error);
        throw error;
    }
}

async function getSlotBookingCount(booking) {
    try {
        // Count bookings for the same program, mode, and occupancy type
        const bookings = await db
            .collection("carts")
            .where("occupancyType", "==", booking.occupancyType)
            .where("title", "==", booking.title)
            .where("mode", "==", booking.mode)
            .where("status", "in", ["waiting", "active"])
            .get();

        let count = 0;
        const targetSlotKeys =
            booking.selectedSlots?.map(
                (slot) => `${slot.date}-${slot.startTime}-${slot.endTime}`
            ) || [];

        bookings.forEach((doc) => {
            const data = doc.data();
            if (data.selectedSlots) {
                const hasMatchingSlot = data.selectedSlots.some((slot) => {
                    const slotKey = `${slot.date}-${slot.startTime}-${slot.endTime}`;
                    return targetSlotKeys.includes(slotKey);
                });

                if (hasMatchingSlot) {
                    count++;
                }
            }
        });

        return count;
    } catch (error) {
        console.error("Error getting slot booking count:", error);
        return 0;
    }
}

async function processGroupRefund(booking, bookingRef) {
    try {
        // Update booking status
        await bookingRef.update({
            status: "refunded",
            refundDate: new Date().toISOString().slice(0, 10),
            refundReason: "Minimum group size not reached",
            updatedAt: new Date(),
        });

        console.log(`Refund processed for booking ${bookingRef.id}:`, {
            amount: booking.price,
            customerEmail: booking.customerEmail,
            reason: "Minimum group size not reached",
        });

        // Send refund notification email
        await sendRefundNotificationEmail(booking);

        // Here you would integrate with Razorpay to process actual refund
        // await processRazorpayRefund(booking.paymentId, booking.price);
    } catch (error) {
        console.error("Error processing group refund:", error);
        throw error;
    }
}

async function sendGroupActivationEmail(booking) {
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2F6288;">🎉 Your Group Session is Now Active!</h2>
                <p>Hi there,</p>
                <p>Great news! Your group booking for <strong>${
                    booking.title
                }</strong> has reached the minimum number of participants and is now active.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2F6288;">Booking Details:</h3>
                    <p><strong>Program:</strong> ${booking.title}</p>
                    <p><strong>Mode:</strong> ${booking.mode}</p>
                    <p><strong>Start Date:</strong> ${
                        booking.actualStartDate || booking.startDate
                    }</p>
                    <p><strong>End Date:</strong> ${booking.endDate}</p>
                    <p><strong>Sessions:</strong> ${
                        booking.selectedSlots?.length || 0
                    } slots</p>
                </div>
                
                ${
                    booking.selectedSlots && booking.selectedSlots.length > 0
                        ? `
                <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1976d2;">📅 Your Session Schedule:</h3>
                    ${booking.selectedSlots
                        .map(
                            (slot, index) => `
                        <div style="background: white; padding: 10px; border-radius: 4px; margin: 8px 0; border-left: 3px solid #1976d2;">
                            <strong>Session ${index + 1}:</strong> ${new Date(
                                slot.date
                            ).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}<br>
                            <span style="color: #666;">⏰ ${
                                slot.startTime.split("T")[1]?.split("+")[0] ||
                                slot.startTime
                            } - ${
                                slot.endTime.split("T")[1]?.split("+")[0] ||
                                slot.endTime
                            } (Asia/Kolkata)</span>
                            ${
                                booking.mode === "Online" &&
                                booking.organizerEmail
                                    ? '<br><span style="color: #1976d2;">🔗 Online session - Calendar invite sent</span>'
                                    : ""
                            }
                        </div>
                    `
                        )
                        .join("")}
                </div>
                `
                        : ""
                }
                
                <p>Your sessions will begin as scheduled. Please check your calendar for session timings.</p>
                <p>Thank you for choosing Urban Pilgrim!</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from Urban Pilgrim.<br>
                        For support, contact us at support@urbanpilgrim.in
                    </p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: gmailEmail,
            to: booking.customerEmail,
            subject: `🎉 Your Group Session "${booking.title}" is Now Active!`,
            html,
        });

        console.log(`Group activation email sent to ${booking.customerEmail}`);
    } catch (error) {
        console.error("Error sending group activation email:", error);
    }
}

async function sendRefundNotificationEmail(booking) {
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2F6288;">Refund Processed - Group Session</h2>
                <p>Hi there,</p>
                <p>We're writing to inform you that your group booking for <strong>${booking.title}</strong> did not reach the minimum number of participants required.</p>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3 style="margin-top: 0; color: #856404;">Refund Details:</h3>
                    <p><strong>Program:</strong> ${booking.title}</p>
                    <p><strong>Amount:</strong> ₹${booking.price}</p>
                    <p><strong>Refund Date:</strong> ${booking.refundDate}</p>
                    <p><strong>Reason:</strong> Minimum group size not reached</p>
                </div>
                
                <p>Your refund will be processed within 5-7 business days to your original payment method.</p>
                <p>We apologize for any inconvenience caused. Please feel free to explore our other programs!</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from Urban Pilgrim.<br>
                        For support, contact us at support@urbanpilgrim.in
                    </p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: gmailEmail,
            to: booking.customerEmail,
            subject: `Refund Processed - ${booking.title}`,
            html,
        });

        console.log(
            `Refund notification email sent to ${booking.customerEmail}`
        );
    } catch (error) {
        console.error("Error sending refund notification email:", error);
    }
}

async function sendBookingCompletionEmail(booking) {
    try {
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2F6288;">🎊 Congratulations on Completing Your Journey!</h2>
                <p>Hi there,</p>
                <p>Congratulations on successfully completing your <strong>${
                    booking.title
                }</strong> program with Urban Pilgrim!</p>
                
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3 style="margin-top: 0; color: #155724;">Program Completed:</h3>
                    <p><strong>Program:</strong> ${booking.title}</p>
                    <p><strong>Mode:</strong> ${booking.mode}</p>
                    <p><strong>Duration:</strong> ${booking.startDate} to ${
            booking.endDate
        }</p>
                    <p><strong>Sessions Completed:</strong> ${
                        booking.selectedSlots?.length || 0
                    }</p>
                </div>
                
                ${
                    booking.selectedSlots && booking.selectedSlots.length > 0
                        ? `
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">📋 Sessions You Completed:</h3>
                    ${booking.selectedSlots
                        .map(
                            (slot, index) => `
                        <div style="background: white; padding: 8px 12px; border-radius: 4px; margin: 6px 0; border-left: 3px solid #28a745;">
                            <strong>Session ${index + 1}:</strong> ${new Date(
                                slot.date
                            ).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                            <span style="color: #666; margin-left: 10px;">✅ Completed</span>
                        </div>
                    `
                        )
                        .join("")}
                </div>
                `
                        : ""
                }
                
                <p>We hope you had a transformative experience. Your dedication to personal growth is truly inspiring!</p>
                <p>Feel free to explore our other programs to continue your journey with us.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from Urban Pilgrim.<br>
                        We'd love to hear about your experience! Reply to share your feedback.
                    </p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: gmailEmail,
            to: booking.customerEmail,
            subject: `🎊 Congratulations! You've completed "${booking.title}"`,
            html,
        });

        console.log(`Completion email sent to ${booking.customerEmail}`);
    } catch (error) {
        console.error("Error sending completion email:", error);
    }
}

// Workshop booking email notifications
async function sendWorkshopBookingEmails(bookingData, formData) {
    const { workshopTitle, userInfo, bookingDetails, organizer, bookingId } =
        bookingData;

    try {
        // Email HTML template
        const createEmailHTML = (
            recipient,
            isOrganizer = false,
            isAdmin = false
        ) => `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Workshop Booking Confirmation</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #c16a00, #d4822a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                    .info-section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #c16a00; }
                    .details { margin: 10px 0; }
                    .label { font-weight: bold; color: #c16a00; }
                    .status-confirmed { background: #10b981; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏛️ Urban Pilgrim</h1>
                        <h2>${
                            isOrganizer
                                ? "New Workshop Booking"
                                : isAdmin
                                ? "Workshop Booking Notification"
                                : "Workshop Booking Confirmed"
                        }</h2>
                    </div>
                    
                    <div class="content">
                        <div class="status-confirmed">
                            <h2>✅ Booking Confirmed!</h2>
                            <p>${
                                isOrganizer
                                    ? "You have a new participant for your workshop."
                                    : isAdmin
                                    ? "A new workshop booking has been made."
                                    : "Your workshop booking has been confirmed."
                            }</p>
                        </div>

                        <div class="info-section">
                            <h3>Workshop Details</h3>
                            <div class="details">
                                <p><span class="label">Workshop:</span> ${workshopTitle}</p>
                                <p><span class="label">Participants:</span> ${
                                    bookingDetails.participants
                                }</p>
                                <p><span class="label">Variant:</span> ${
                                    bookingDetails.selectedVariant
                                }</p>
                                <p><span class="label">Total Amount:</span> ₹${Number(
                                    bookingDetails.totalPrice
                                ).toLocaleString("en-IN")}</p>
                                <p><span class="label">Booking ID:</span> ${bookingId}</p>
                                <p><span class="label">Payment ID:</span> ${
                                    bookingDetails.paymentId
                                }</p>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>${
                                isOrganizer || isAdmin
                                    ? "Participant Information"
                                    : "Your Information"
                            }</h3>
                            <div class="details">
                                <p><span class="label">Name:</span> ${
                                    userInfo.name
                                }</p>
                                <p><span class="label">Email:</span> ${
                                    userInfo.email
                                }</p>
                                <p><span class="label">Phone:</span> ${
                                    userInfo.phone
                                }</p>
                                ${
                                    userInfo.address
                                        ? `<p><span class="label">Address:</span> ${userInfo.address}</p>`
                                        : ""
                                }
                            </div>
                        </div>

                        ${
                            organizer && (isOrganizer || isAdmin)
                                ? `
                        <div class="info-section">
                            <h3>Organizer Information</h3>
                            <div class="details">
                                <p><span class="label">Name:</span> ${
                                    organizer.name ||
                                    organizer.title ||
                                    "Not specified"
                                }</p>
                                <p><span class="label">Email:</span> ${
                                    organizer.email ||
                                    organizer.em ||
                                    "Not specified"
                                }</p>
                                <p><span class="label">Phone:</span> ${
                                    organizer.phone ||
                                    organizer.number ||
                                    "Not specified"
                                }</p>
                            </div>
                        </div>
                        `
                                : ""
                        }

                        ${
                            !isOrganizer && !isAdmin
                                ? `
                        <div style="text-align: center; margin: 20px 0;">
                            <p><strong>Next Steps:</strong></p>
                            <p>The workshop organizer will contact you soon with venue details and schedule confirmation.</p>
                            <p>Please keep this booking confirmation for your records.</p>
                        </div>
                        `
                                : ""
                        }

                        ${
                            isOrganizer
                                ? `
                        <div style="text-align: center; margin: 20px 0;">
                            <p><strong>Action Required:</strong></p>
                            <p>Please contact the participant to confirm venue details, schedule, and any specific requirements.</p>
                        </div>
                        `
                                : ""
                        }

                        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                            Booking Date: ${new Date().toLocaleString()}<br>
                            For any queries, contact us at support@urbanpilgrim.com
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email to user
        if (userInfo.email) {
            await transporter.sendMail({
                from: gmailEmail,
                to: userInfo.email,
                subject: `Workshop Booking Confirmed - ${workshopTitle}`,
                html: createEmailHTML("user", false, false),
            });
            console.log(
                `Workshop booking confirmation sent to user: ${userInfo.email}`
            );
        }

        // Send email to organizer
        if (organizer) {
            // Handle different organizer data structures
            const organizerEmail = organizer.email || organizer.em || null;
            const organizerPhone = organizer.phone || organizer.number || null;

            if (organizerEmail) {
                await transporter.sendMail({
                    from: gmailEmail,
                    to: organizerEmail,
                    subject: `New Workshop Booking - ${workshopTitle}`,
                    html: createEmailHTML("organizer", true, false),
                });
                console.log(
                    `Workshop booking notification sent to organizer: ${organizerEmail}`
                );
            } else {
                console.log(
                    "No organizer email found, skipping organizer notification"
                );
            }
        }

        // Send email to admin
        const adminEmail = "urbanpilgrim25@gmail.com";
        await transporter.sendMail({
            from: gmailEmail,
            to: adminEmail,
            subject: `Workshop Booking Alert - ${workshopTitle}`,
            html: createEmailHTML("admin", false, true),
        });
        console.log(
            `Workshop booking notification sent to admin: ${adminEmail}`
        );
    } catch (error) {
        console.error("Error sending workshop booking emails:", error);
        // Don't throw error to avoid failing the payment
    }
}

exports.whatsappWebhook = onRequest(async (req, res) => {
    try {
        const incomingMsg = (req.body.Body || "").trim().toLowerCase();
        const from = req.body.From; // "whatsapp:+91XXXXXXXXXX"

        if (incomingMsg === "yes" && from) {
            const client = getTwilioClient();
            if (!client) {
                console.error("❌ whatsappWebhook: Twilio client not configured");
                res.sendStatus(200);
                return;
            }

            // Read the follow-up message set by admin before the blast
            const settingsSnap = await admin
                .firestore()
                .doc("admin/whatsapp_settings")
                .get();
            const followUpMessage =
                settingsSnap.data()?.followUpMessage ||
                "Thank you for your interest! Here are the full details of our latest Urban Pilgrim offering. Visit https://urbanpilgrim.in to explore. — Urban Pilgrim Team";

            const envFrom = process.env.TWILIO_WHATSAPP_FROM || "";
            const senderNumber = envFrom
                ? envFrom.startsWith("whatsapp:")
                    ? envFrom
                    : `whatsapp:${envFrom}`
                : "whatsapp:+917888399232";

            await client.messages.create({
                from: senderNumber,
                to: from,
                body: followUpMessage,
            });

            console.log(`✅ whatsappWebhook: follow-up sent to ${from}`);
        } else {
            console.log(`ℹ️ whatsappWebhook: ignored reply "${incomingMsg}" from ${from}`);
        }
    } catch (err) {
        console.error("❌ whatsappWebhook error:", err.message);
    }

    // Always 200 — Twilio retries on any other status
    res.sendStatus(200);
});

// ========== WORKSHOP REQUEST SYSTEM ==========
const workshopFunctions = require("./workshopRequests");

// Export workshop functions
exports.submitWorkshopRequest = workshopFunctions.submitWorkshopRequest;
exports.handleWorkshopRequestResponse = workshopFunctions.handleWorkshopRequestResponse;
exports.getWorkshopRequestStatus = workshopFunctions.getWorkshopRequestStatus;
exports.getWorkshopRequestStatusByWorkshop = workshopFunctions.getWorkshopRequestStatusByWorkshop;
