import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { addToCart } from "../../features/cartSlice.js";
import { showSuccess, showError } from "../../utils/toast.js";

export default function MonthlyCalendarModal({
  isOpen,
  onClose,
  sessionData,
  selectedPlan,
  mode,
  availableSlots = [],
  occupancyType = "",
  userMonthlySlots = [],
  slotBookings = {},
  quantity = 1,
  onAddToCart,
  cartItems = [],
}) {
  // Dynamic mode with default fallback
  const dynamicMode = mode || "Online";

  // Dynamic occupancy type with default fallback
  const dynamicOccupancyType = (occupancyType || "individual").toLowerCase();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotsMulti, setSelectedSlotsMulti] = useState([]);
  const [localSlots, setLocalSlots] = useState([]);
  const [view, setView] = useState("monthly");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const user = useSelector(
    (state) => state.auth?.user || state.user?.currentUser || null,
  );

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // cleanup
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const plan = sessionData?.[dynamicMode?.toLowerCase()]?.[selectedPlan] || {};
  const sessionsPerMonth = Number(plan.sessionsCount || 0);
  const remainingSessions = sessionsPerMonth - userMonthlySlots.length;

  // Get slots already in cart for this program
  const slotsInCart = cartItems
    .filter(
      (item) =>
        item.title === sessionData?.guideCard?.title &&
        item.subscriptionType === "monthly" &&
        item.mode === dynamicMode,
    )
    .flatMap((item) => item.selectedSlots || [])
    .map((slot) => `${slot.date}-${slot.startTime}-${slot.endTime}`);

  // Count how many sessions user has already added to cart
  const sessionsInCart = slotsInCart.length;
  const remainingSessionsAfterCart = Math.max(
    0,
    sessionsPerMonth - userMonthlySlots.length - sessionsInCart,
  );

  // Helpers to normalize time and keys across various formats
  const normalizeTime = (t) => {
    if (!t) return "";
    // RFC3339: 2025-09-26T10:00:00+05:30 -> 10:00
    if (typeof t === "string" && t.includes("T")) {
      const timePart = t.split("T")[1] || "";
      const hhmm = timePart.split(/[+Z]/)[0]?.slice(0, 5) || "";
      return hhmm;
    }
    // HH:MM:SS -> HH:MM
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0, 5);
    // Already HH:MM
    return t;
  };

  // Group progress helpers (distinct purchasers, min/max, first purchase)
  const getGroupConfig = () => {
    const occ = (dynamicOccupancyType || "").toLowerCase();
    if (occ !== "group") return null;
    const occFromGuide =
      sessionData?.guideCard?.occupancies?.find(
        (oc) => (oc.type || "").toLowerCase() === "group",
      ) || {};
    const minPersons =
      Number(
        occFromGuide.min || sessionData?.guideCard?.groupMinPersons || 2,
      ) || 2;
    const maxPersons =
      Number(
        occFromGuide.max || sessionData?.guideCard?.groupMaxPersons || 10,
      ) || 10;

    // Prefer backend aggregated purchaser records if available
    const modeKey = (mode || "").toLowerCase();
    const monthlyCfg = sessionData?.[modeKey]?.monthly || null;
    if (monthlyCfg && Array.isArray(monthlyCfg.groupPurchaserRecords)) {
      const purchasedCount = monthlyCfg.groupPurchaserRecords.length;
      const firstPurchaseDate = monthlyCfg.groupFirstPurchaseAt
        ? new Date(monthlyCfg.groupFirstPurchaseAt)
        : null;
      let daysLeft = null;
      if (firstPurchaseDate) {
        const now = new Date();
        const elapsedMs = now.getTime() - firstPurchaseDate.getTime();
        const left = 7 - Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
        daysLeft = Math.max(0, left);
      }
      return {
        minPersons,
        maxPersons,
        purchasedCount,
        firstPurchaseDate,
        daysLeft,
      };
    }

    // Distinct purchasers for this guide/mode/monthly group (dedupe by uid/email)
    const purchasers = (sessionData?.purchasedUsers || []).filter(
      (u) =>
        (u?.subscriptionType || "").toLowerCase() === "monthly" &&
        (u?.mode || "").toLowerCase() === (dynamicMode || "").toLowerCase() &&
        (u?.slot?.type || u?.occupancyType || "").toLowerCase() === "group",
    );
    const seen = new Set();
    let purchasedCount = 0;
    purchasers.forEach((p) => {
      // Build a robust purchaser key to avoid counting multiple slots from same purchase
      const uid = (p?.uid || p?.userId || p?.id || "").toString();
      const email = (p?.email || p?.customerEmail || "").toLowerCase();
      const phone = (p?.phone || p?.whatsapp || p?.contact || "").toString();
      // If purchaser identity missing, fallback to payment/order identifiers from the same purchase
      const pay = (p?.paymentId || p?.razorpay_payment_id || "").toString();
      const order = (p?.orderId || p?.razorpay_order_id || "").toString();
      let key =
        [uid, email, phone].filter(Boolean).join("|") ||
        [pay, order].filter(Boolean).join("|");

      // FINAL fallback: collapse entries purchased within the same short time window (assume same purchaser)
      // This handles data models where only per-slot records exist without purchaser IDs
      if (!key) {
        const ts = p?.purchasedAt || p?.createdAt || p?.bookingDate || null;
        if (ts) {
          const t = new Date(ts).getTime();
          // 60-minute bucket window to group multi-slot purchases as one purchaser
          const bucket = Math.floor(t / (60 * 60 * 1000));
          // Also include guide title/mode to avoid cross-program collisions
          const guideTitle = (
            sessionData?.guideCard?.title || ""
          ).toLowerCase();
          const modeKey = (dynamicMode || "").toLowerCase();
          key = `bucket:${bucket}|${guideTitle}|${modeKey}`;
        }
      }
      if (key && !seen.has(key)) {
        seen.add(key);
        purchasedCount++;
      }
    });
    const firstPurchaseDate =
      purchasers.length > 0
        ? new Date(
            Math.min(
              ...purchasers.map((p) =>
                new Date(
                  p.purchasedAt || p.bookingDate || p.createdAt || Date.now(),
                ).getTime(),
              ),
            ),
          )
        : null;

    // Countdown days left (7-day window from first purchase)
    let daysLeft = null;
    if (firstPurchaseDate) {
      const now = new Date();
      const elapsedMs = now.getTime() - firstPurchaseDate.getTime();
      const left = 7 - Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      daysLeft = Math.max(0, left);
    }

    return {
      minPersons,
      maxPersons,
      purchasedCount,
      firstPurchaseDate,
      daysLeft,
    };
  };

  const makeSlotKey = (s) => {
    const date = s.date;
    const start = normalizeTime(s.startTime || s.time);
    const end = normalizeTime(s.endTime || s.end || "");
    return `${date}-${start}-${end}`;
  };

  // Index bookings from Firestore purchases to ensure UI reflects persisted state
  const purchasedIndex = useMemo(() => {
    const idx = {};
    const users = sessionData?.purchasedUsers || [];
    try {
      users.forEach((u) => {
        // Only consider monthly purchases for this guide/mode
        if (
          !u?.subscriptionType ||
          (u.subscriptionType || "").toLowerCase() !== "monthly"
        )
          return;
        if (
          dynamicMode &&
          u?.mode &&
          (u.mode || "").toLowerCase() !== (dynamicMode || "").toLowerCase()
        )
          return;
        const slot = u?.slot || {};
        if (!slot?.date || !(slot.startTime || slot.time)) return;
        const key = `${slot.date}|${normalizeTime(slot.startTime || slot.time)}|${normalizeTime(slot.endTime || slot.end)}`;
        idx[key] = (idx[key] || 0) + 1;
      });
    } catch (e) {
      console.warn("Failed to build purchasedIndex", e);
    }
    return idx;
  }, [sessionData?.purchasedUsers, dynamicMode]);

  // Build a normalized set of cart slot keys for reliable matching
  const slotsInCartNormalized = cartItems
    .filter(
      (item) =>
        item.title === sessionData?.guideCard?.title &&
        item.subscriptionType === "monthly" &&
        item.mode === dynamicMode,
    )
    .flatMap((item) => item.selectedSlots || [])
    .map((s) => makeSlotKey(s));

  // Has current user already purchased this monthly plan for group?
  const hasPurchasedGroupMonthly = useMemo(() => {
    if (
      !sessionData?.purchasedUsers ||
      !Array.isArray(sessionData.purchasedUsers)
    )
      return false;
    const meUid = user?.uid;
    const meEmail = (user?.email || "").toLowerCase();
    return sessionData.purchasedUsers.some((u) => {
      const isMonthly = (u?.subscriptionType || "").toLowerCase() === "monthly";
      const modeMatch =
        !u?.mode || !dynamicMode
          ? true
          : (u.mode || "").toLowerCase() === (dynamicMode || "").toLowerCase();
      const isGroup =
        (u?.slot?.type || u?.occupancyType || "").toLowerCase() === "group";
      const isMe =
        (meUid && u?.uid === meUid) ||
        (!!meEmail && (u?.email || "").toLowerCase() === meEmail);
      return isMonthly && modeMatch && isGroup && isMe;
    });
  }, [sessionData?.purchasedUsers, dynamicMode, user?.uid, user?.email]);

  // Get slot capacity information based on occupancy type
  const getSlotCapacityInfo = (slot) => {
    const slotKey = makeSlotKey(slot);

    // Count actual bookings from slotBookings prop (try multiple key shapes) and Firestore purchases index
    const bookingsKey1 = `${slot.date}|${slot.startTime || slot.time}|${slot.endTime}`;
    const bookingsKey2 = `${slot.date}|${normalizeTime(slot.startTime || slot.time)}|${normalizeTime(slot.endTime)}`;
    const actualBookingsArray =
      slotBookings[bookingsKey1] || slotBookings[bookingsKey2] || [];
    const purchasedCount =
      purchasedIndex[bookingsKey2] || purchasedIndex[bookingsKey1] || 0;

    // Count items in current user's cart for this slot (normalized)
    const cartCount = slotsInCartNormalized.filter(
      (cartSlot) => cartSlot === slotKey,
    ).length;

    // For individual bookings, check if slot is reserved by anyone
    let individualBookingCount = 0;
    if (occupancyType.toLowerCase() === "individual") {
      // Check multiple sources for individual bookings:
      // 1. actualBookings from slotBookings prop (from database)
      // 2. userMonthlySlots (current user's existing bookings)
      // 3. Check if slot appears in any individual booking in slotBookings

      const isSlotBookedByCurrentUser = userMonthlySlots.some((userSlot) => {
        const userKey = makeSlotKey(userSlot);
        return userKey === slotKey;
      });

      const isSlotBookedByOthers =
        (Array.isArray(actualBookingsArray)
          ? actualBookingsArray.length
          : Number(actualBookingsArray || 0)) > 0 || purchasedCount > 0;

      // For individual slots, if it's booked by anyone (including current user), count as 1
      individualBookingCount =
        isSlotBookedByCurrentUser || isSlotBookedByOthers ? 1 : 0;
    }

    const occupancy = dynamicOccupancyType.toLowerCase();
    let maxCapacity, displayText, isFull, currentBookings;

    if (occupancy === "group") {
      // Capacity is based on distinct purchasers, not per-slot bookings
      const cfg = getGroupConfig();
      maxCapacity = cfg?.maxPersons || 10;
      const distinctPurchasers = cfg?.purchasedCount || 0;
      // Count current user's pending cart only once if group plan is already in cart
      const cartAdds = isGroupPlanInCart() ? 1 : 0;

      // Reopen logic: if 7 days passed since first purchase and min not met, ignore past purchases
      let ignorePurchased = false;
      if (cfg?.firstPurchaseDate) {
        const now = new Date();
        const elapsed = now.getTime() - cfg.firstPurchaseDate.getTime();
        const expired = elapsed >= 7 * 24 * 60 * 60 * 1000;
        if (expired && distinctPurchasers < (cfg?.minPersons || 0)) {
          ignorePurchased = true;
        }
      }
      currentBookings = (ignorePurchased ? 0 : distinctPurchasers) + cartAdds;
      displayText = `${currentBookings}/${maxCapacity}`;
      isFull = currentBookings >= maxCapacity;
    } else if (occupancy === "couple") {
      // For couple: max is always 2 (1 couple = 2 people)
      maxCapacity = 2;
      currentBookings =
        (Array.isArray(actualBookingsArray)
          ? actualBookingsArray.length
          : Number(actualBookingsArray || 0)) +
        purchasedCount +
        cartCount;
      displayText = `${currentBookings}/${maxCapacity}`;
      isFull = currentBookings >= 2;
    } else {
      // For individual: max is 1, once booked it's reserved
      maxCapacity = 1;
      currentBookings = individualBookingCount + cartCount;
      displayText = currentBookings >= 1 ? "Reserved" : "Available";
      isFull = currentBookings >= 1;
    }

    return { currentBookings, maxCapacity, displayText, isFull };
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots();
    }
  }, [isOpen, availableSlots, dynamicMode, selectedPlan]);

  // Auto-select all slots for group occupancy
  useEffect(() => {
    if (
      dynamicOccupancyType.toLowerCase() === "group" &&
      localSlots.length > 0
    ) {
      // Auto-select all available slots for group
      const availableGroupSlots = localSlots.filter((slot) =>
        isSlotVisible(slot),
      );
      setSelectedSlotsMulti(availableGroupSlots);
    }
  }, [localSlots, dynamicOccupancyType]);

  const fetchAvailableSlots = async () => {
    if (availableSlots.length > 0) {
      const processedSlots = availableSlots.map((slot, index) => ({
        id: slot.id || `monthly-${slot.date}-${slot.startTime}-${index}`,
        date: slot.date,
        time: slot.startTime,
        endTime: slot.endTime,
        location: slot.location || "",
        available: true,
        type: slot.type || "individual",
        rowIdx: slot.rowIdx,
        tIdx: slot.tIdx,
        duration: 60,
      }));

      setLocalSlots(processedSlots);
    }
  };

  const resetModal = () => {
    setView("monthly");
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedSlotsMulti([]);
  };

  const handleCloseModal = () => {
    resetModal();
    onClose();
  };

  // Monthly booking restrictions
  const canSelectMoreSlots = () => {
    return selectedSlotsMulti.length < remainingSessionsAfterCart;
  };

  // Check if a slot should be visible based on occupancy type and bookings
  const isSlotVisible = (slot) => {
    const slotKey = `${slot.date}-${slot.startTime}-${slot.endTime}`;
    const capacityInfo = getSlotCapacityInfo(slot);

    // For group: show slots unless full capacity reached based on distinct purchasers
    if (dynamicOccupancyType.toLowerCase() === "group") {
      return !capacityInfo.isFull;
    }

    // For couple: show slots unless 2/2 (full)
    if (dynamicOccupancyType.toLowerCase() === "couple") {
      return !capacityInfo.isFull;
    }

    // For individual: hide if slot is reserved by anyone (including the current user)
    if (dynamicOccupancyType.toLowerCase() === "individual") {
      // If reserved, do not show at all
      if (capacityInfo.isFull) return false;
      return true; // Show if available
    }

    return true;
  };

  // Check if group plan already added to cart
  const isGroupPlanInCart = () => {
    return (
      dynamicOccupancyType.toLowerCase() === "group" &&
      cartItems.some(
        (item) =>
          item.title === sessionData?.guideCard?.title &&
          item.subscriptionType === "monthly" &&
          item.mode === dynamicMode &&
          item.occupancyType?.toLowerCase() === "group",
      )
    );
  };

  const hasSlotOnDate = (date) => {
    const dateStr =
      typeof date === "string" ? date : date.toISOString().slice(0, 10);
    // Only check userMonthlySlots (actual booked slots), not selectedSlotsMulti (current selection)
    return userMonthlySlots.some((slot) => slot.date === dateStr);
  };

  const handleAddMonthlyToCart = async () => {
    try {
      if (!sessionData) {
        showError("Missing session data");
        return;
      }

      // Check if group plan already in cart
      if (isGroupPlanInCart()) {
        showError("Group monthly plan already added to cart");
        return;
      }

      // Check if user has reached session limit (not applicable for group)
      if (
        remainingSessionsAfterCart <= 0 &&
        dynamicOccupancyType.toLowerCase() !== "group"
      ) {
        showError("You have reached your monthly session limit");
        return;
      }

      const modeKey = dynamicMode?.toLowerCase();
      const subscriptionKey = selectedPlan;
      const planData = sessionData?.[modeKey]?.[subscriptionKey] || {};

      // Get price based on occupancy type from plan data structure
      let pricePerSession = 0;
      const occupancy = dynamicOccupancyType.toLowerCase();

      if (
        sessionData?.guideCard?.occupancies &&
        Array.isArray(sessionData.guideCard.occupancies)
      ) {
        const matchingOccupancy = sessionData.guideCard.occupancies.find(
          (occ) => occ.type && occ.type.toLowerCase() === occupancy,
        );

        if (matchingOccupancy && matchingOccupancy.price) {
          pricePerSession = Number(matchingOccupancy.price) || 0;
        } else {
          // Fallback to plan price
          pricePerSession = Number(planData.price) || 0;
        }
      } else {
        // Fallback to plan price
        pricePerSession = Number(planData.price) || 0;
      }

      // Determine monthly discount percent from Firestore structure
      // Primary path: sessionData.slides[0]?.[modeKey]?.monthly?.discount (e.g., "00", "10")
      const slidesRoot = sessionData?.slides?.[0] || sessionData?.slides || {};
      const discountFromSlides =
        slidesRoot?.[modeKey]?.monthly?.discount ??
        slidesRoot?.online?.monthly?.discount ??
        slidesRoot?.offline?.monthly?.discount ??
        null;
      const discountFromPlan = planData?.discount ?? null;
      const monthlyDiscountPercent = discountFromSlides ?? discountFromPlan;
      const monthlyDiscountPercentNum =
        monthlyDiscountPercent != null ? Number(monthlyDiscountPercent) : null;

      let finalSlots = [];
      let cartItemId = "";

      // Individual/Couple/Group: Use selected slots
      if (selectedSlotsMulti.length === 0) {
        showError("Please select at least one slot");
        setLoading(false);
        return;
      }

      // Additional validations for Individual/Couple occupancy: enforce exact required count if available
      {
        const occLower = (dynamicOccupancyType || "").toLowerCase();
        if (occLower === "individual" || occLower === "couple") {
          // Required sessions left to pick in this add-to-cart action
          const requiredCount = Math.max(
            0,
            sessionsPerMonth - userMonthlySlots.length - sessionsInCart,
          );

          // Count available selectable slots right now for this occupancy
          const availableSelectable = localSlots.filter((s) => {
            const typeOk = (s.type || "individual").toLowerCase() === occLower;
            return typeOk && isSlotVisible(s);
          }).length;

          if (availableSelectable < requiredCount) {
            showError("There are not enough slots to book");
            setLoading(false);
            return;
          }

          if (
            requiredCount > 0 &&
            selectedSlotsMulti.length !== requiredCount
          ) {
            showError(`Please add ${sessionsPerMonth} sessions per month`);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);

      // Group gating rules: 7-day window and capacity
      if ((dynamicOccupancyType || "").toLowerCase() === "group") {
        const cfg = getGroupConfig();
        if (cfg) {
          const distinctPurchasers = cfg.purchasedCount || 0;
          const now = new Date();
          if (cfg.firstPurchaseDate) {
            const expired =
              now.getTime() - cfg.firstPurchaseDate.getTime() >=
              7 * 24 * 60 * 60 * 1000;
            if (expired) {
              if (distinctPurchasers >= (cfg.minPersons || 0)) {
                showError("Enrollment closed for this group");
                setLoading(false);
                return;
              }
              // else reopened; proceed
            }
          }
          if (distinctPurchasers >= (cfg.maxPersons || 10)) {
            showError("Group is full");
            setLoading(false);
            return;
          }
        }
      }

      // Helper function to convert to RFC3339 format with timezone
      const formatToRFC3339 = (date, time) => {
        if (!date || !time) return null;
        // Create datetime string and add IST timezone
        const dateTimeStr = `${date}T${time}:00+05:30`;
        return dateTimeStr;
      };

      finalSlots = selectedSlotsMulti
        .map((s) => ({
          id: s.id || `slot-${Date.now()}-${Math.random()}`,
          date: s.date || "",
          startTime: formatToRFC3339(s.date, s.time || s.startTime) || "",
          endTime: formatToRFC3339(s.date, s.endTime) || "",
          location: s.location || "",
          type: s.type || "monthly",
          // Include pattern indices so backend can update weeklyPattern counts
          rowIdx: s.rowIdx,
          tIdx: s.tIdx,
        }))
        .filter((slot) => slot.date && slot.startTime && slot.endTime); // Remove invalid slots

      // Validate we have valid slots after filtering
      if (finalSlots.length === 0) {
        showError("Invalid slot data. Please try selecting slots again.");
        setLoading(false);
        return;
      }

      cartItemId = `${sessionData?.guideCard?.title || "guide"}-monthly-${dynamicOccupancyType}-${Date.now()}`;

      // Calculate booking lifecycle dates
      const bookingDate = new Date();
      const bookingDateStr = bookingDate.toISOString().slice(0, 10);

      let startDate, endDate, waitingPeriodEnd;

      if (occupancy === "group") {
        // Group: 7-day waiting period, then 1 month from start
        waitingPeriodEnd = new Date(
          bookingDate.getTime() + 7 * 24 * 60 * 60 * 1000,
        );
        startDate = new Date(waitingPeriodEnd.getTime() + 24 * 60 * 60 * 1000); // Day after waiting period
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month from start
      } else {
        // Individual/Couple: Immediate start, 1 month duration
        startDate = bookingDate;
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        waitingPeriodEnd = null;
      }

      const cartItem = {
        id: cartItemId,
        title: sessionData?.guideCard?.title || "Monthly Session",
        price: Number(pricePerSession) * (occupancy === "couple" ? 2 : 1), // Couple is priced as 1x2
        gst: sessionData?.guideCard?.gst || 0,
        persons: 1,
        image: sessionData?.guideCard?.thumbnail || "",
        quantity: quantity || 1,
        type: "guide",
        mode: dynamicMode,
        subscriptionType: selectedPlan,
        occupancyType: occupancyType || "individual",
        organizer: sessionData?.organizer || {},
        calendarId:
          sessionData?.organizer?.calendarId ||
          sessionData?.organizer?.email ||
          "primary",
        // Include monthly discount so CartPage can apply it
        monthly:
          monthlyDiscountPercent != null
            ? { discount: String(monthlyDiscountPercent) }
            : undefined,
        // Add fields needed for Google Calendar event creation
        summary: sessionData?.guideCard?.title || "Monthly Session",
        description: `${sessionData?.guideCard?.title || "Monthly Session"} - ${dynamicOccupancyType} booking confirmed via Urban Pilgrim`,
        timeZone: "Asia/Kolkata",
        customerEmail: user?.email || "",
        organizerEmail: sessionData?.organizer?.email || "",
        selectedSlots: finalSlots,
        // Booking lifecycle management
        bookingDate: bookingDateStr,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        waitingPeriodEnd: waitingPeriodEnd
          ? waitingPeriodEnd.toISOString().slice(0, 10)
          : null,
        status: occupancy === "group" ? "waiting" : "active",
        minPersons:
          sessionData?.guideCard?.occupancies?.find(
            (occ) => occ.type.toLowerCase() === occupancy,
          )?.min || (occupancy === "group" ? 2 : 1),
        maxPersons:
          sessionData?.guideCard?.occupancies?.find(
            (occ) => occ.type.toLowerCase() === occupancy,
          )?.max || (occupancy === "group" ? 10 : 1),
        // Use first slot as primary slot for backend compatibility (similar to CalendarModal)
        slot:
          finalSlots.length > 0
            ? {
                id: finalSlots[0].id,
                date: finalSlots[0].date,
                startTime: finalSlots[0].startTime, // Already in RFC3339 format
                endTime: finalSlots[0].endTime, // Already in RFC3339 format
                location: finalSlots[0].location || "",
                type: finalSlots[0].type || "monthly",
              }
            : {
                id: `default-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                startTime: formatToRFC3339(
                  new Date().toISOString().slice(0, 10),
                  "09:00",
                ),
                endTime: formatToRFC3339(
                  new Date().toISOString().slice(0, 10),
                  "10:00",
                ),
                location: "",
                type: "monthly",
              },
        date:
          finalSlots.length > 0
            ? finalSlots[0].date
            : new Date().toISOString().slice(0, 10),
        timestamp: new Date().toISOString(),
      };

      // Prefer parent handler if provided; otherwise fallback to Redux dispatch
      try {
        if (typeof onAddToCart === "function") {
          await onAddToCart(cartItem);
        } else {
          dispatch(addToCart(cartItem));
        }

        const slotCount = finalSlots.length;
        const message = `${slotCount} session(s) added to cart! Remaining: ${remainingSessionsAfterCart - slotCount}`;

        showSuccess(message);
        handleCloseModal();
      } catch (addToCartError) {
        console.error("Error in onAddToCart/dispatch:", addToCartError);
        showError(
          `Failed to add to cart: ${addToCartError.message || "Unknown error"}`,
        );
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Error adding monthly booking to cart:", err);
      showError(`Failed to add to cart: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next 30 days from today (rolling monthly period)
  const getNext30Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }

    return days;
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

    // Handle both Date objects and day numbers
    let dateStr;
    if (day instanceof Date) {
      dateStr = day.toISOString().slice(0, 10);
    } else {
      dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return localSlots.some((slot) => {
      // Check date and availability
      if (slot.date !== dateStr || !slot.available) return false;

      // Check occupancy type match
      const slotType = (slot.type || "individual").toLowerCase();
      const selectedOccupancy = (
        dynamicOccupancyType || "individual"
      ).toLowerCase();

      return slotType === selectedOccupancy;
    });
  };

  const getSlotsForDate = (dateStr) => {
    const slotsForDate = localSlots.filter(
      (slot) => slot.date === dateStr && slot.available,
    );
    const selectedOccupancy = (
      dynamicOccupancyType || "individual"
    ).toLowerCase();

    const filteredSlots = slotsForDate.filter((slot) => {
      const slotType = (slot.type || "individual").toLowerCase();
      return slotType === selectedOccupancy;
    });

    return filteredSlots;
  };

  const handleDateClick = (day) => {
    if (!day || !hasAvailableSlots(day)) return;

    // Handle both Date objects and day numbers
    let dateStr;
    if (day instanceof Date) {
      dateStr = day.toISOString().slice(0, 10);
    } else {
      dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    setSelectedDate(dateStr);
  };

  const handleSlotSelect = (slot) => {
    const isSelected = selectedSlotsMulti.some((s) => s.id === slot.id);

    if (isSelected) {
      // Remove the slot if already selected
      setSelectedSlotsMulti((prev) => prev.filter((s) => s.id !== slot.id));
      return;
    }

    // Check if can select more slots
    if (!canSelectMoreSlots()) {
      showError(
        `You can only select up to ${sessionsPerMonth} sessions per month`,
      );
      return;
    }

    // Check if user already has a booked slot on this date
    if (hasSlotOnDate(slot.date)) {
      showError("You already have a booked slot on this date");
      return;
    }

    // Check if user already selected a slot on this date
    const hasSelectedSlotOnDate = selectedSlotsMulti.some(
      (s) => s.date === slot.date,
    );
    if (hasSelectedSlotOnDate) {
      showError("You can only select one slot per day");
      return;
    }

    // Add the slot to selection
    setSelectedSlotsMulti((prev) => [...prev, slot]);
  };

  const handleSlotRemove = (slotToRemove) => {
    setSelectedSlotsMulti((prev) =>
      prev.filter((slot) => slot.id !== slotToRemove.id),
    );
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Memoized group progress for header info box
  const groupProgress = useMemo(() => {
    if ((dynamicOccupancyType || "").toLowerCase() !== "group") return null;
    const cfg = getGroupConfig();
    return cfg
      ? {
          purchasedCount: cfg.purchasedCount,
          maxPersons: cfg.maxPersons,
          minPersons: cfg.minPersons,
          daysLeft: cfg.daysLeft,
          firstPurchaseDate: cfg.firstPurchaseDate,
        }
      : null;
  }, [
    sessionData?.guideCard?.occupancies,
    sessionData?.guideCard?.groupMaxPersons,
    sessionData?.guideCard?.groupMinPersons,
    sessionData?.purchasedUsers,
    dynamicOccupancyType,
    dynamicMode,
  ]);

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={handleCloseModal}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* White modal - scrollable container */}
      <div 
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Monthly Booking Calendar
            </h2>
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                {dynamicMode} - Monthly Plan
                {(dynamicOccupancyType || "").toLowerCase() !== "group" && (
                  <span>({sessionsPerMonth} sessions per month) </span>
                )}
              </p>
              <p className="text-sm font-medium text-blue-600 mt-1">
                Occupancy:{" "}
                {dynamicOccupancyType
                  ? dynamicOccupancyType.charAt(0).toUpperCase() +
                    dynamicOccupancyType.slice(1).toLowerCase()
                  : "Single/Individual"}
              </p>
              {(dynamicOccupancyType || "").toLowerCase() === "group" && (
                <p className="text-xs text-orange-600 mt-1">
                  A group can be made if minimum{" "}
                  {groupProgress?.minPersons || 0} persons are enrolled
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleCloseModal}
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
              {/* Session Counter */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                {(dynamicOccupancyType || "").toLowerCase() === "group" ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        Group Purchased: {groupProgress?.purchasedCount || 0} /{" "}
                        {groupProgress?.maxPersons || 0}
                      </p>
                      {(() => {
                        const cfg = getGroupConfig();
                        if (cfg?.firstPurchaseDate) {
                          return (
                            <p className="text-xs text-blue-700 mt-1">
                              Days left: {cfg?.daysLeft ?? 0}
                            </p>
                          );
                        }
                        return (
                          <p className="text-xs text-blue-700 mt-1">
                            A 7-day window starts when the first person
                            purchases.
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        Sessions Selected: {selectedSlotsMulti.length} /{" "}
                        {sessionsPerMonth}
                      </p>
                      <p className="text-xs text-blue-600">
                        Already Booked: {userMonthlySlots.length} sessions this
                        month
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly View with right-side slot panel */}
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
                    {getDaysInMonth(currentDate).map((day, index) => {
                      const hasSlots = hasAvailableSlots(day);
                      const dateStr = day
                        ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        : "";
                      const hasUserSlot = day ? hasSlotOnDate(dateStr) : false;

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(day)}
                          disabled={!day || !hasSlots || hasUserSlot}
                          className={`p-2 text-center text-sm rounded transition-colors ${
                            !day
                              ? "invisible"
                              : hasUserSlot
                                ? "bg-green-100 text-green-800 cursor-not-allowed"
                                : hasSlots
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                                  : "text-gray-300 cursor-not-allowed"
                          }`}
                        >
                          {day}
                          {hasUserSlot && <div className="text-xs">Booked</div>}
                        </button>
                      );
                    })}
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
                        {dynamicOccupancyType.toLowerCase() === "group"
                          ? "Group slots are auto selected, you do not need to select any slots  "
                          : `Select a date on the calendar to view and pick slots. You can select up to ${remainingSessionsAfterCart} more session(s).`}
                      </p>
                      {sessionsInCart > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {sessionsInCart} session(s) already in cart
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">
                          Slots on{" "}
                          {new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </h4>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="text-sm text-[#2F6288] hover:underline"
                        >
                          Clear date
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {(() => {
                          const visibleSlots = getSlotsForDate(
                            selectedDate,
                          ).filter((slot) => isSlotVisible(slot));
                          if (visibleSlots.length === 0) {
                            return (
                              <div className="text-sm text-gray-600">
                                All slots are booked for this date
                              </div>
                            );
                          }
                          return visibleSlots.map((slot) => {
                            const isSelected = selectedSlotsMulti.some(
                              (s) => s.id === slot.id,
                            );
                            const disabled =
                              occupancyType.toLowerCase() !== "group" &&
                              !canSelectMoreSlots() &&
                              !isSelected;
                            const capacityInfo = getSlotCapacityInfo(slot);
                            const isGroupMode =
                              occupancyType.toLowerCase() === "group";
                            const isCoupleMode =
                              occupancyType.toLowerCase() === "couple";
                            const isIndividualMode =
                              occupancyType.toLowerCase() === "individual";

                            return (
                              <button
                                key={slot.id}
                                onClick={() =>
                                  !isGroupMode &&
                                  !disabled &&
                                  !capacityInfo.isFull &&
                                  handleSlotSelect(slot)
                                }
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                  isGroupMode
                                    ? "border-blue-300 bg-blue-50 cursor-default"
                                    : capacityInfo.isFull && !isSelected
                                      ? "border-red-200 bg-red-50 cursor-not-allowed"
                                      : isSelected
                                        ? "border-[#2F6288] bg-blue-50"
                                        : disabled
                                          ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                                          : "border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100"
                                }`}
                                disabled={
                                  isGroupMode ||
                                  disabled ||
                                  (capacityInfo.isFull && !isSelected)
                                }
                              >
                                <div>
                                  <p className="font-semibold text-green-800">
                                    {slot.time} - {slot.endTime}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {slot.duration} minutes • {slot.type} •{" "}
                                    {occupancyType}
                                  </p>
                                  {slot.location && (
                                    <p className="text-xs text-gray-500">
                                      {slot.location}
                                    </p>
                                  )}
                                  <p
                                    className={`text-xs mt-1 ${
                                      isGroupMode
                                        ? "text-blue-700"
                                        : isCoupleMode
                                          ? capacityInfo.isFull
                                            ? "text-red-600"
                                            : "text-green-600"
                                          : isIndividualMode
                                            ? capacityInfo.isFull
                                              ? "text-orange-600"
                                              : "text-green-600"
                                            : isSelected
                                              ? "text-blue-700"
                                              : disabled
                                                ? "text-gray-400"
                                                : "text-green-600"
                                    }`}
                                  >
                                    {isGroupMode
                                      ? `Auto-selected for group (${capacityInfo.displayText})`
                                      : isCoupleMode
                                        ? `Couple booking (${capacityInfo.displayText})${capacityInfo.isFull ? " - Full" : ""}`
                                        : isIndividualMode
                                          ? `Individual booking (${capacityInfo.displayText})`
                                          : isSelected
                                            ? "Selected"
                                            : disabled
                                              ? "Limit reached"
                                              : "Available"}
                                  </p>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Selected Slots Summary */}
              {selectedSlotsMulti.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">
                    {occupancyType.toLowerCase() === "group"
                      ? "Auto-Selected Group Sessions"
                      : "Selected Sessions"}{" "}
                    ({selectedSlotsMulti.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedSlotsMulti.map((slot, index) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-white p-3 rounded border"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {new Date(slot.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {slot.time} - {slot.endTime}
                          </p>
                          {occupancyType.toLowerCase() === "group" && (
                            <p className="text-xs text-blue-600">
                              Auto-selected for group
                            </p>
                          )}
                        </div>
                        {/* Only show remove button for non-group types */}
                        {(occupancyType.toLowerCase() === "individual" ||
                          occupancyType.toLowerCase() === "couple") && (
                          <button
                            onClick={() => handleSlotRemove(slot)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              {(() => {
                const isGroup = occupancyType.toLowerCase() === "group";
                const anyGroupSlotFull = isGroup
                  ? selectedSlotsMulti.some(
                      (s) => getSlotCapacityInfo(s).isFull,
                    )
                  : false;
                const canShowGroupCTA =
                  isGroup &&
                  selectedSlotsMulti.length > 0 &&
                  !isGroupPlanInCart() &&
                  !hasPurchasedGroupMonthly &&
                  !anyGroupSlotFull;
                const canShowIndCoupleCTA =
                  !isGroup &&
                  selectedSlotsMulti.length > 0 &&
                  remainingSessionsAfterCart > 0;
                return canShowGroupCTA || canShowIndCoupleCTA;
              })() && (
                <div className="space-y-3 mt-6">
                  {/* Occupancy Price Display */}
                  <div className="bg-gray-50 p-4 rounded-lg">
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
                          const price =
                            sessionData[modeKey]?.[subscriptionKey]?.price;
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
                          return Number(
                            sessionData[modeKey]?.[subscriptionKey]?.price || 0,
                          ).toLocaleString();
                        })()}{" "}
                        × {quantity} sessions
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedSlotsMulti.length} slot
                      {selectedSlotsMulti.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleAddMonthlyToCart}
                      disabled={loading}
                      className="px-6 py-3 bg-[#2F6288] text-white rounded-lg hover:bg-[#2F6288]/90 disabled:opacity-50 font-semibold"
                    >
                      {loading ? "Adding..." : "Add to Cart"}
                    </button>
                  </div>
                </div>
              )}

              {/* Group Plan Already Added Message */}
              {occupancyType.toLowerCase() === "group" &&
                isGroupPlanInCart() && (
                  <div className="flex justify-center mt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 font-medium">
                        ✓ Group monthly plan already added to cart
                      </p>
                    </div>
                  </div>
                )}

              {/* Session Limit Reached Message */}
              {occupancyType.toLowerCase() !== "group" &&
                remainingSessionsAfterCart <= 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 font-medium">
                        Session limit reached
                      </p>
                      <p className="text-yellow-600 text-sm mt-1">
                        You have used all {sessionsPerMonth} sessions for this
                        month
                      </p>
                    </div>
                  </div>
                )}

              {/* Instructions */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">
                  Booking Instructions:
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>
                    {occupancyType.toLowerCase() === "group"
                      ? ""
                      : `• You can book up to ${sessionsPerMonth} sessions per month`}
                  </li>
                  <li>
                    •{" "}
                    {occupancyType.toLowerCase() === "group"
                      ? "All available group slots are auto-selected"
                      : `Sessions in cart: ${sessionsInCart}, Remaining: ${remainingSessionsAfterCart}`}
                  </li>
                  <li>
                    • {occupancyType} slots become unavailable once booked
                  </li>
                  <li>• Blue highlighted dates have available slots</li>
                  <li>
                    {occupancyType.toLowerCase() === "group"
                      ? ""
                      : "• Click on a date to see available time slots"}
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
