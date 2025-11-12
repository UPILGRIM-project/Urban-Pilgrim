import { useEffect, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import GuideCard from "./GuideCard";
import { motion } from "framer-motion";
import SlotModal from "./SlotModal";
import CalendarModal from "./CalendarModal";
import MonthlyCalendarModal from "./MonthlyCalendarModal";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useParams } from "react-router-dom";
import { addToCart as addToCartRedux } from "../../features/cartSlice";
import { fetchAllEvents } from "../../utils/fetchEvents";
import { useDispatch, useSelector } from "react-redux";
import PersondetailsCard from "../../components/persondetails_card";
import { getProgramButtonConfig } from "../../utils/userProgramUtils";
import { useNavigate } from "react-router-dom";
import FreeTrailModal from "../modals/FreeTrailModal";
import { showError, showSuccess } from "../../utils/toast";
import PilgrimGuide from "../pilgrim_retreats/Pilgrim_Guide";

export default function GuideClassDetails() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [subscriptionType, setSubscriptionType] = useState(null); // 'oneTime' | 'monthly'
  const [variation, setVariation] = useState(null); // 'individual' | 'couples' | 'group'
  const [selectedSlot, setSelectedSlot] = useState(null); // { date, startTime, endTime }
  const [availableSlots, setAvailableSlots] = useState([]);
  const [mainImage, setMainImage] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryVideos, setGalleryVideos] = useState([]);
  const [mainImageType, setMainImageType] = useState("image");
  const [showFreeTrail, setShowFreeTrail] = useState(false);
  const [selectedOccupancy, setSelectedOccupancy] = useState(null);
  const [userPickedPlan, setUserPickedPlan] = useState(false);

  // Monthly booking management states
  const [monthlyBookings, setMonthlyBookings] = useState({});
  const [userMonthlySlots, setUserMonthlySlots] = useState([]);
  const [groupStatus, setGroupStatus] = useState(null);
  const [waitingPeriod, setWaitingPeriod] = useState(null);
  const [slotBookings, setSlotBookings] = useState({});
  const [groupBookings, setGroupBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Get user and programs from Redux
  const user = useSelector(
    (state) => state.auth?.user || state.user?.currentUser || null,
  );
  const userPrograms = useSelector((state) => state.userProgram);
  const cartItems = useSelector((state) => state.cart?.items || []);

  // Get events from Redux store
  const { allEvents } = useSelector((state) => state.allEvents);

  // Fetch all events (refresh on mount to ensure latest mapping/filters)
  useEffect(() => {
    const loadEvents = async () => {
      try {
        await fetchAllEvents(dispatch);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    loadEvents();
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Always scroll to top when this component mounts (guide details page opened)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ========== Monthly Booking Utility Functions ==========

  // Filter slots to show only current date to end of month
  const filterMonthlySlots = (allSlots, occupancyType, adminSettings) => {
    const currentDate = new Date();
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    return allSlots.filter((slot) => {
      const slotDate = new Date(slot.date);
      return slotDate >= currentDate && slotDate <= endOfMonth;
    });
  };

  // Check if user can book a slot based on monthly restrictions
  const canBookMonthlySlot = (
    slot,
    occupancyType,
    userBookings,
    adminSettings,
  ) => {
    const slotDate = slot.date;
    const sessionsPerMonth = Number(adminSettings?.sessionsCount || 0);

    // Check if user already has a slot on this date (one slot per day limit)
    const hasSlotOnDate = userBookings.some(
      (booking) => booking.date === slotDate,
    );
    if (hasSlotOnDate && occupancyType !== "group") {
      return { canBook: false, reason: "You can only book one slot per day" };
    }

    // Check session limit for the month
    if (userBookings.length >= sessionsPerMonth) {
      return {
        canBook: false,
        reason: `You have reached the monthly limit of ${sessionsPerMonth} sessions`,
      };
    }

    // Check slot availability based on occupancy type
    const slotKey = `${slot.date}|${slot.startTime}|${slot.endTime}`;
    const currentBookings = slotBookings[slotKey] || [];

    switch (occupancyType.toLowerCase()) {
      case "individual":
        // Individual slots become invisible after booking
        return {
          canBook: currentBookings.length === 0,
          reason: "Slot already booked",
        };

      case "couple":
        // Couple slots allow 2 bookings then become invisible
        return {
          canBook: currentBookings.length < 2,
          reason: "Slot fully booked for couples",
        };

      case "group":
        // Group logic handled separately
        return checkGroupAvailability(slot, adminSettings);

      default:
        return { canBook: false, reason: "Invalid occupancy type" };
    }
  };

  // Check group availability and status
  const checkGroupAvailability = (slot, adminSettings) => {
    const groupMin = Number(adminSettings?.groupMin || 0);
    const groupMax = Number(adminSettings?.groupMax || 0);

    if (!groupStatus) {
      return { canBook: true, reason: "Group available for booking" };
    }

    if (groupStatus.status === "active") {
      return { canBook: false, reason: "Group is currently active" };
    }

    if (
      groupStatus.status === "waiting" &&
      groupStatus.bookings.length >= groupMax
    ) {
      return { canBook: false, reason: "Group is full" };
    }

    return { canBook: true, reason: "Group available" };
  };

  // Handle group booking logic with 7-day waiting period
  const handleGroupBooking = async (slot, adminSettings) => {
    try {
      const groupMin = Number(adminSettings?.groupMin || 0);
      const groupMax = Number(adminSettings?.groupMax || 0);

      // Get current bookings for this slot
      const currentBookings = slot.bookings || [];
      const updatedBookings = [
        ...currentBookings,
        { userId: user?.uid, timestamp: new Date() },
      ];

      // If this is the first booking, start waiting period
      if (updatedBookings.length === 1) {
        const waitingEndDate = new Date();
        waitingEndDate.setDate(waitingEndDate.getDate() + 7);

        const newWaitingPeriod = {
          startDate: new Date().toISOString(),
          endDate: waitingEndDate.toISOString(),
          groupId: `group_${sessionData?.guideCard?.title}_${Date.now()}`,
        };

        setWaitingPeriod(newWaitingPeriod);
        setGroupStatus({ status: "waiting", bookings: updatedBookings });

        showSuccess(
          "You are the first to book! Waiting for more members to join within 7 days.",
        );

        // Set timeout for 7 days
        setTimeout(
          () => {
            checkGroupMinimum(newWaitingPeriod.groupId);
          },
          7 * 24 * 60 * 60 * 1000,
        ); // 7 days in milliseconds
      }
      // Check if minimum reached
      else if (updatedBookings.length >= groupMin && waitingPeriod) {
        activateGroup(updatedBookings);
      }
      // Check if maximum reached
      else if (updatedBookings.length >= groupMax) {
        if (updatedBookings.length >= groupMin) {
          activateGroup(updatedBookings);
        } else {
          // This shouldn't happen, but handle edge case
          showError(
            "Group is full but minimum not reached. Please contact support.",
          );
        }
      }

      return { success: true, bookings: updatedBookings };
    } catch (error) {
      console.error("Error handling group booking:", error);
      showError("Failed to book group slot. Please try again.");
      return { success: false, error };
    }
  };

  // Activate group after minimum members reached
  const activateGroup = (bookings) => {
    setGroupStatus({ status: "active", bookings });
    setWaitingPeriod(null);

    // Generate group slots for the next sessions
    const groupSlots = generateGroupSlots(bookings);

    showSuccess(
      `Group activated with ${bookings.length} members! Your sessions will start from the next available date.`,
    );

    // Save group data to Firebase
    saveGroupToFirebase(bookings, groupSlots);
  };

  // Check if minimum group size reached after 7 days
  const checkGroupMinimum = async (groupId) => {
    const groupMin = Number(
      sessionData?.offline?.monthly?.groupMin ||
        sessionData?.online?.monthly?.groupMin ||
        0,
    );

    if (groupBookings.length >= groupMin) {
      activateGroup(groupBookings);
    } else {
      // Process refunds for all group members
      await processGroupRefunds(groupBookings);

      // Reset group state
      setGroupBookings([]);
      setGroupStatus(null);
      setWaitingPeriod(null);

      showError(
        `Group minimum not reached. Refunds have been processed for all ${groupBookings.length} members.`,
      );
    }
  };

  // Process refunds via Razorpay
  const processGroupRefunds = async (bookings) => {
    try {
      for (const booking of bookings) {
        // Call your refund API here
        const refundResponse = await fetch("/api/process-refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: booking.userId,
            bookingId: booking.bookingId,
            amount: booking.amount,
            reason: "Group minimum not reached",
          }),
        });

        if (refundResponse.ok) {
        } else {
          console.error(`Failed to process refund for user ${booking.userId}`);
        }
      }
    } catch (error) {
      console.error("Error processing group refunds:", error);
    }
  };

  // Generate group slots automatically
  const generateGroupSlots = (bookings) => {
    const plan = sessionData?.[mode?.toLowerCase()]?.monthly || {};
    const sessionsCount = Number(plan.sessionsCount || 0);
    const weeklyPattern = plan.weeklyPattern || [];

    const slots = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

    let slotsGenerated = 0;
    let currentDate = new Date(startDate);

    while (slotsGenerated < sessionsCount) {
      const dayShort = currentDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .slice(0, 3);

      // Find matching pattern for this day
      const dayPattern = weeklyPattern.find(
        (pattern) =>
          pattern.days?.includes(dayShort) &&
          pattern.times?.some((t) => t.type === "group"),
      );

      if (dayPattern) {
        const groupTimes = dayPattern.times.filter((t) => t.type === "group");
        groupTimes.forEach((time) => {
          if (slotsGenerated < sessionsCount) {
            slots.push({
              date: currentDate.toISOString().slice(0, 10),
              startTime: time.startTime,
              endTime: time.endTime,
              type: "group",
              bookings: bookings.map((b) => b.userId),
            });
            slotsGenerated++;
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  };

  // Save group data to Firebase
  const saveGroupToFirebase = async (bookings, slots) => {
    try {
      const groupData = {
        programTitle: sessionData?.guideCard?.title,
        mode: mode,
        bookings: bookings,
        slots: slots,
        status: "active",
        createdAt: new Date().toISOString(),
        groupId: `group_${sessionData?.guideCard?.title}_${Date.now()}`,
      };

      await addDoc(collection(db, "groupBookings"), groupData);
    } catch (error) {
      console.error("Error saving group data:", error);
    }
  };

  // Load purchased users data
  const loadPurchasedUsers = async () => {
    if (!sessionData) {
      return;
    }

    try {
      const sessionRef = doc(db, `pilgrim_guides/${uid}/guides/data`);
      const snapshot = await getDoc(sessionRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const slidesArray = Array.isArray(data.slides)
          ? data.slides
          : Object.values(data.slides || {});

        const found = slidesArray.find(
          (r) => normalize(r?.guideCard?.title) === normalize(formattedTitle),
        );

        if (found) {
          // Update only purchasedUsers inside sessionData to keep other local edits
          setSessionData((prev) => {
            if (!prev) return found;
            return { ...prev, purchasedUsers: found.purchasedUsers || [] };
          });
        }
      }
    } catch (err) {
      console.error("Failed to load purchasedUsers:", err);
    }
  };

  // Refresh purchased users when the calendar modal is opened
  useEffect(() => {
    const refreshData = async () => {
      if (showCalendar && subscriptionType === "monthly") {
        await loadPurchasedUsers();
        await loadSlotBookings();
      }
    };
    refreshData();
  }, [showCalendar, subscriptionType]);

  // Load user's monthly bookings
  const loadUserMonthlyBookings = async () => {
    if (!user || !sessionData) {
      return;
    }

    try {
      const bookingsQuery = query(
        collection(db, "monthlyBookings"),
        where("userId", "==", user.uid),
        where("programTitle", "==", sessionData.guideCard.title),
        where("month", "==", currentMonth),
      );

      const querySnapshot = await getDocs(bookingsQuery);
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });

      setUserMonthlySlots([]);
      // setUserMonthlySlots(bookings);
    } catch (error) {
      console.error("Error loading user monthly bookings:", error);
      setUserMonthlySlots([]); // Set empty array on error
    }
  };

  // Load slot bookings for visibility management
  const loadSlotBookings = async () => {
    if (!sessionData) return;
    setLoading(true);

    try {
      const bookingsQuery = query(
        collection(db, "slotBookings"),
        where("programTitle", "==", sessionData.guideCard.title),
        where("month", "==", currentMonth),
      );

      const querySnapshot = await getDocs(bookingsQuery);
      const bookings = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const slotKey = `${data.date}|${data.startTime}|${data.endTime}`;
        if (!bookings[slotKey]) bookings[slotKey] = [];
        bookings[slotKey].push(data);
      });

      setSlotBookings(bookings);
    } catch (error) {
      console.error("Error loading slot bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Convert dayBasedPattern to weeklyPattern format for compatibility
  const convertDayBasedToWeeklyPattern = (dayBasedPattern) => {
    const weeklyPattern = [];
    const dayMap = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thu",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };

    Object.entries(dayBasedPattern).forEach(([dayName, dayData]) => {
      if (
        dayData &&
        dayData.slots &&
        Array.isArray(dayData.slots) &&
        dayData.slots.length > 0
      ) {
        const shortDay = dayMap[dayName];

        // Filter out empty slots
        const validSlots = dayData.slots.filter(
          (slot) =>
            slot &&
            slot.startTime &&
            slot.endTime &&
            slot.startTime !== "" &&
            slot.endTime !== "",
        );

        if (validSlots.length > 0) {
          weeklyPattern.push({
            days: [shortDay],
            times: validSlots.map((slot) => ({
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: slot.type || "individual",
            })),
          });
        }
      }
    });

    return weeklyPattern;
  };

  const getPersonsPerBooking = () => 1;

  const getCapacityMax = () => {
    // For one-time capacity we will compute specifically when passing to CalendarModal
    const max = Number(selectedOccupancy?.max || 0);
    return isNaN(max) ? 0 : max;
  };

  // One-time capacity derived from selected occupancy type and occupancy config (Group max comes from occupancies)
  const getOneTimeCapacityForSelected = () => {
    const label = (selectedOccupancy?.type || "").toLowerCase();
    if (!sessionData || !mode) return 0;
    if (label.includes("couple") || label.includes("twin")) return 2;
    if (label.includes("group")) {
      const g = Number(selectedOccupancy?.max || 0);
      return isNaN(g) ? 0 : g;
    }
    // individual/default
    return 1;
  };

  const { guideClassName } = useParams();
  const formattedTitle = guideClassName.replace(/-/g, " ");
  const [sessionData, setSessionData] = useState(null);
  const uid = "pilgrim_guides";

  // Scroll to top whenever the guide changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [guideClassName]);

  // Auto-set subscription type based on schedule-aware availability, but never override user click
  useEffect(() => {
    if (!sessionData || userPickedPlan) return;
    const monthlyAvail = planAvailableAny("monthly");
    const oneTimeAvail = planAvailableAny("oneTime");
    const available = [
      monthlyAvail && "monthly",
      oneTimeAvail && "oneTime",
    ].filter(Boolean);
    if (available.length === 1) {
      setSubscriptionType(available[0]);
      setSelectedPlan(available[0]);
    } else if (available.length > 1) {
      setSubscriptionType(null);
      setSelectedPlan("");
    }
  }, [sessionData, userPickedPlan]);

  // helper to normalize strings for comparison
  const normalize = (str) =>
    str
      ?.toLowerCase()
      .trim()
      .replace(/[-\s]+/g, " "); // collapse dashes & spaces into single space

  // Helper function to determine if URL is video or image
  const getMediaType = (url) => {
    if (!url) return "image";
    const videoExtensions = [".mp4", ".webm", ".ogg", ".avi", ".mov"];
    const isVideo =
      videoExtensions.some((ext) => url.toLowerCase().includes(ext)) ||
      url.toLowerCase().includes("video");
    return isVideo ? "video" : "image";
  };

  // Handle media selection for main display
  const handleMediaSelect = (mediaUrl) => {
    setMainImage(mediaUrl);
    setMainImageType(getMediaType(mediaUrl));
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionRef = doc(db, `pilgrim_guides/${uid}/guides/data`);
        const snapshot = await getDoc(sessionRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          // Ensure slides is always an array
          const slidesArray = Array.isArray(data.slides)
            ? data.slides
            : Object.values(data.slides || {});

          const found = slidesArray.find(
            (r) => normalize(r?.guideCard?.title) === normalize(formattedTitle),
          );

          setSessionData(found || null);

          // Extract and set gallery images and videos
          if (found?.session?.images && Array.isArray(found.session.images)) {
            setGalleryImages(found.session.images);
            setGalleryVideos(found.session.videos);
            const firstMedia =
              found?.guideCard?.thumbnail || found.session.images[0] || "";
            setMainImage(firstMedia);
            setMainImageType(getMediaType(firstMedia));
          } else {
            const thumbnail = found?.guideCard?.thumbnail || "";
            setMainImage(thumbnail);
            setMainImageType(getMediaType(thumbnail));
            setGalleryImages([]);
            setGalleryVideos([]);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      }
    };

    fetchSession();
  }, [formattedTitle, uid]);

  useEffect(() => {

    if (!sessionData?.guideCard?.subCategory) return;
    
    const sub = sessionData.guideCard.subCategory.toLowerCase();
    if (sub === "offline") {
      setMode("Offline");
    } else if (sub === "online") {
      setMode("Online");
    } else if (sub === "both") {
      // For "both" category, default to Online
      setMode("Online");
    }
  }, [sessionData]);

  // Default occupancy selection: always ensure Individual is highlighted by default
  // Priority: match 'Individual' first, then 'Single', else first item, else synthetic { type: 'Individual' }
  // Set default occupancy based on current mode and subscription type
  useEffect(() => {
    if (!mode || !subscriptionType || !sessionData) return;

    const occupancies = getCurrentOccupancies();
    let defaultOcc = null;

    if (Array.isArray(occupancies) && occupancies.length > 0) {
      // First priority: exact match for "Individual"
      defaultOcc = occupancies.find(
        (o) => (o?.type || "").toLowerCase() === "individual",
      );

      // Second priority: exact match for "Single"
      if (!defaultOcc) {
        defaultOcc = occupancies.find(
          (o) => (o?.type || "").toLowerCase() === "single",
        );
      }

      // Third priority: any occupancy containing "individual" or "single"
      if (!defaultOcc) {
        defaultOcc = occupancies.find((o) =>
          /individual|single/i.test(o?.type || ""),
        );
      }

      // Fallback: first available occupancy
      if (!defaultOcc) {
        defaultOcc = occupancies[0];
      }
    } else {
      // Admin didn't configure occupancies; create synthetic Individual
      defaultOcc = { type: "Individual" };
    }

    if (defaultOcc) {
      setSelectedOccupancy(defaultOcc);
    }
  }, [sessionData, mode, subscriptionType]);

  // Default plan selection: always prefer One-Time when both plans are available
  useEffect(() => {
    if (!sessionData) return;
    if (subscriptionType) return; // already chosen
    if (!mode) return; // wait for mode to be set first
    
    const hasMonthly = planAvailableAny("monthly");
    const hasOneTime = planAvailableAny("oneTime");

    // Prefer One-Time by default (whether both available or only oneTime available)
    if (hasOneTime) {
      setSubscriptionType("oneTime");
      setSelectedPlan("oneTime");
      if (!planAvailable("oneTime")) {
        const m = findModeForPlan("oneTime");
        if (m) setMode(m);
      }
    } else if (hasMonthly) {
      // Only select Monthly if One-Time is not available
      setSubscriptionType("monthly");
      setSelectedPlan("monthly");
      if (!planAvailable("monthly")) {
        const m = findModeForPlan("monthly");
        if (m) setMode(m);
      }
    }
  }, [sessionData, mode, subscriptionType]);

  // Get slots by subscription type and mode
  const getAvailableSlots = () => {
    if (!sessionData || !mode || !subscriptionType) return [];
    const modeKey = mode.toLowerCase();
    const plan = sessionData?.[modeKey]?.[subscriptionType] || {};

    // One-time: use stored date slots directly
    if (subscriptionType === "oneTime") {
      const slots = Array.isArray(plan.slots) ? plan.slots : [];
      // Only upcoming dates
      const today = new Date();
      const todayYmd = today.toISOString().slice(0, 10);
      const occLabel = (selectedOccupancy?.type || "").toLowerCase();
      let viewType = "individual";
      if (occLabel.includes("couple") || occLabel.includes("twin"))
        viewType = "couple";
      else if (occLabel.includes("group")) viewType = "group";
      return slots
        .filter((s) => (s?.date || "") >= todayYmd)
        .filter((s) => (s?.type || "individual") === viewType);
    }

    // Monthly: generate slots from current date to end of month with booking restrictions
    if (subscriptionType === "monthly") {
      // Check for both old weeklyPattern and new dayBasedPattern
      let pattern = Array.isArray(plan.weeklyPattern) ? plan.weeklyPattern : [];

      // If weeklyPattern exists but is empty, or if we have dayBasedPattern, use dayBasedPattern
      if (
        plan.dayBasedPattern &&
        Object.keys(plan.dayBasedPattern).length > 0
      ) {
        const convertedPattern = convertDayBasedToWeeklyPattern(
          plan.dayBasedPattern,
        );

        // Use converted pattern if it has more slots than existing weeklyPattern
        if (convertedPattern.length > pattern.length) {
          pattern = convertedPattern;
        }
      }

      if (pattern.length === 0) {
        return [];
      }

      const reservedMonths = new Set(
        Array.isArray(plan.reservedMonths) ? plan.reservedMonths : [],
      ); // ['YYYY-MM']

      const out = [];
      const today = new Date();

      // Show slots from today to next 30 days (monthly period)
      const startDate = new Date(today);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30); // Next 30 days from today

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dayShort = d
          .toLocaleDateString("en-US", { weekday: "short" })
          .slice(0, 3);
        const ymd = d.toISOString().slice(0, 10);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        if (reservedMonths.has(ym)) {
          continue; // block entire month
        }

        pattern.forEach((row, rowIdx) => {
          if ((row.days || []).includes(dayShort)) {

            (row.times || []).forEach((t, tIdx) => {
              const slot = {
                date: ymd,
                startTime: t.startTime,
                endTime: t.endTime,
                type: t.type || "individual",
                bookedCount: Number(t.bookedCount || 0),
                rowIdx,
                tIdx,
              };

              // Apply monthly booking restrictions
              const occLabel = (selectedOccupancy?.type || "").toLowerCase();

              // Temporarily disable restrictions for testing
              const canBook = { canBook: true, reason: "Testing mode" };
              // const canBook = canBookMonthlySlot(slot, occLabel, userMonthlySlots, plan);

              // Only show slots that can be booked
              if (canBook.canBook) {
                out.push(slot);
              } else {
                console.log(`❌ Slot rejected:`, canBook.reason);
              }
            });
          } else {
            console.log(
              `❌ Day ${dayShort} does not match pattern days:`,
              row.days,
            );
          }
        });
      }


      // Debug: Show Monday slots specifically
      const mondaySlots = out.filter((slot) => {
        const slotDate = new Date(slot.date);
        return (
          slotDate.toLocaleDateString("en-US", { weekday: "short" }) === "Mon"
        );
      });

      // Filter by selected occupancy type
      const occLabel = (selectedOccupancy?.type || "").toLowerCase();
      let viewType = "individual";
      if (occLabel.includes("couple") || occLabel.includes("twin"))
        viewType = "couple";
      else if (occLabel.includes("group")) viewType = "group";

      const filtered = out.filter((s) => {
        // For group occupancy, handle special logic
        if (viewType === "group") {
          // If group is active, don't show any slots
          if (groupStatus?.status === "active") return false;

          // If group is waiting and user already joined, don't show slots
          if (
            groupStatus?.status === "waiting" &&
            groupStatus.bookings.some((b) => b.userId === user?.uid)
          ) {
            return false;
          }

          return s.type === "group";
        }

        // For individual and couple, check slot availability
        const slotKey = `${s.date}|${s.startTime}|${s.endTime}`;
        const currentBookings = slotBookings[slotKey] || [];

        if (viewType === "couple") {
          return s.type === "couple" && currentBookings.length < 2;
        }

        // Individual: slot should be empty
        return s.type === "individual" && currentBookings.length === 0;
      });

      // Debug: Show filtered Monday slots
      const filteredMondaySlots = filtered.filter((slot) => {
        const slotDate = new Date(slot.date);
        return (
          slotDate.toLocaleDateString("en-US", { weekday: "short" }) === "Mon"
        );
      });

      return filtered;
    }

    return [];
  };

  // Load monthly booking data when component mounts or session data changes
  useEffect(() => {
    if (sessionData && user) {
      loadUserMonthlyBookings();
      loadSlotBookings();
    } else {
      console.log("❌ Cannot load monthly data - missing sessionData or user");
    }
  }, [sessionData, user, currentMonth]);

  // Update available slots when mode or subscription type changes
  useEffect(() => {
    if (sessionData && mode && subscriptionType) {
      const s = getAvailableSlots();
      setAvailableSlots(s);
    } else {
      console.log("❌ Missing conditions for slot generation:", {
        hasSessionData: !!sessionData,
        hasMode: !!mode,
        hasSubscriptionType: !!subscriptionType,
      });
      setAvailableSlots([]);
    }
  }, [
    sessionData,
    mode,
    subscriptionType,
    selectedOccupancy,
    userMonthlySlots,
    slotBookings,
    groupStatus,
  ]);

  const getPricesForSelection = () => {
    if (!sessionData || !mode || !subscriptionType) return {};
    const plan = sessionData[mode.toLowerCase()]?.[subscriptionType] || {};
    return {
      individual: plan.individualPrice || plan.price || 0,
      couples: plan.couplesPrice || 0,
      group: plan.groupPrice || 0,
      groupMin: plan.groupMin || 0,
      groupMax: plan.groupMax || 0,
    };
  };

  const getPlan = () => {
    if (!sessionData || !mode || !subscriptionType) return {};
    return sessionData[mode.toLowerCase()]?.[subscriptionType] || {};
  };

  const hasVariation = (v) => {
    const p = getPlan();
    if (v === "individual") return !!(p.individualPrice || p.price);
    if (v === "couples") return !!p.couplesPrice;
    if (v === "group") return !!p.groupPrice;
    return false;
  };

  const planHasPrice = (planObj) =>
    !!(
      planObj?.price ||
      planObj?.individualPrice ||
      planObj?.couplesPrice ||
      planObj?.groupPrice
    );
  const planHasUsableSchedule = (planObj) =>
    !!(
      planObj &&
      ((Array.isArray(planObj?.slots) && planObj.slots.length > 0) ||
        (Array.isArray(planObj?.weeklyPattern) &&
          planObj.weeklyPattern.length > 0) ||
        (planObj?.dayBasedPattern &&
          Object.keys(planObj.dayBasedPattern).length > 0))
    );

  const planAvailable = (planKey) => {
    if (!sessionData || !mode) return false;
    const pk = sessionData[mode.toLowerCase()]?.[planKey];
    // For monthly, only show if a positive monthly.price is configured. Ignore schedule presence.
    if (planKey === "monthly") {
      const monthlyPrice = Number(pk?.price);
      return !isNaN(monthlyPrice) && monthlyPrice > 0;
    }
    // For oneTime, only show if a positive oneTime.price is configured
    if (planKey === "oneTime") {
      const oneTimePrice = Number(pk?.price);
      return !isNaN(oneTimePrice) && oneTimePrice > 0;
    }
    return planHasPrice(pk) || planHasUsableSchedule(pk);
  };

  const planAvailableAny = (planKey) => {
    if (!sessionData) return false;
    const onlinePlan = sessionData?.online?.[planKey];
    const offlinePlan = sessionData?.offline?.[planKey];
    // For monthly, availability should be based strictly on a positive monthly.price in either mode
    if (planKey === "monthly") {
      const onlineMonthlyPrice = Number(onlinePlan?.price);
      const offlineMonthlyPrice = Number(offlinePlan?.price);
      const onlineAvailable =
        !isNaN(onlineMonthlyPrice) && onlineMonthlyPrice > 0;
      const offlineAvailable =
        !isNaN(offlineMonthlyPrice) && offlineMonthlyPrice > 0;
      return onlineAvailable || offlineAvailable;
    }
    // For oneTime, availability requires positive price in any mode
    if (planKey === "oneTime") {
      const onlineOneTimePrice = Number(onlinePlan?.price);
      const offlineOneTimePrice = Number(offlinePlan?.price);
      const onlineAvailable =
        !isNaN(onlineOneTimePrice) && onlineOneTimePrice > 0;
      const offlineAvailable =
        !isNaN(offlineOneTimePrice) && offlineOneTimePrice > 0;
      return onlineAvailable || offlineAvailable;
    }
    const onlineAvailable =
      planHasPrice(onlinePlan) || planHasUsableSchedule(onlinePlan);
    const offlineAvailable =
      planHasPrice(offlinePlan) || planHasUsableSchedule(offlinePlan);
    return onlineAvailable || offlineAvailable;
  };

  const findModeForPlan = (planKey) => {
    const onlinePlan = sessionData?.online?.[planKey];
    const offlinePlan = sessionData?.offline?.[planKey];
    const has = (p) => planHasPrice(p) || planHasUsableSchedule(p);
    if (has(onlinePlan)) return "Online";
    if (has(offlinePlan)) return "Offline";
    return null;
  };

  const parseNumber = (v) => {
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const getPlanFromPrice = (planObj) => {
    if (!planObj) return null;
    const prices = [
      planObj.price,
      planObj.individualPrice,
      planObj.couplesPrice,
      planObj.groupPrice,
    ]
      .map((v) =>
        v === undefined || v === null || v === "" ? null : Number(v),
      )
      .filter((v) => typeof v === "number" && !isNaN(v) && v >= 0);
    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  // Get minimum price from occupancies for a plan
  const getMinOccupancyPrice = (planKey, modeKey) => {
    if (!sessionData || !modeKey || !planKey) return null;
    const plan = sessionData[modeKey]?.[planKey];
    const occupancies = plan?.occupancies || [];

    if (!Array.isArray(occupancies) || occupancies.length === 0) return null;

    const prices = occupancies
      .map((occ) => parseNumber(occ?.price))
      .filter((p) => p !== null && p > 0);

    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const getPlanPricePreview = (planKey) => {
    if (!sessionData) return null;
    let price = null;
    let usedMode = mode;

    // Try to get minimum price from occupancies first
    const currentModeKey = mode?.toLowerCase?.();
    price = getMinOccupancyPrice(planKey, currentModeKey);

    if (price == null) {
      // Try alternate mode
      const altModeKey = mode === "Online" ? "offline" : "online";
      price = getMinOccupancyPrice(planKey, altModeKey);
      if (price !== null) {
        usedMode = altModeKey === "online" ? "Online" : "Offline";
      }
    }

    // Fallback to plan price if no occupancy prices found
    if (price == null && planKey === "monthly") {
      // Monthly should always use constant monthly.price
      const currentPlan = sessionData[currentModeKey]?.monthly;
      price = parseNumber(currentPlan?.price);
      if (price == null) {
        const altModeKey = mode === "Online" ? "offline" : "online";
        const altPlan = sessionData[altModeKey]?.monthly;
        price = parseNumber(altPlan?.price);
        usedMode =
          altModeKey === "online"
            ? "Online"
            : altModeKey === "offline"
              ? "Offline"
              : usedMode;
      }
      // Fallback to outer guide price if monthly.price is not set anywhere
      if (price == null) {
        price = parseNumber(sessionData?.guideCard?.price);
      }
    } else if (price == null) {
      const current = sessionData[currentModeKey]?.[planKey];
      price = getPlanFromPrice(current);
      if (price == null) {
        const altMode = mode === "Online" ? "offline" : "online";
        const alt = sessionData[altMode]?.[planKey];
        price = getPlanFromPrice(alt);
        usedMode =
          altMode === "online"
            ? "Online"
            : altMode === "offline"
              ? "Offline"
              : usedMode;
      }
    }

    if (price == null) return null;
    return { price, mode: usedMode };
  };

  // Get occupancies based on current mode and subscription type
  const getCurrentOccupancies = () => {
    if (!sessionData || !mode || !subscriptionType) return [];
    const modeKey = mode.toLowerCase();
    const occupancies =
      sessionData[modeKey]?.[subscriptionType]?.occupancies || [];
    return Array.isArray(occupancies) ? occupancies : [];
  };

  // Prefer selected occupancy price if provided, else show minimum occupancy price for the selected plan
  const getDisplayedPrice = () => {
    if (!subscriptionType || !mode) return null;

    // If user has selected a specific occupancy, show that price
    if (selectedOccupancy && selectedOccupancy.price) {
      const n = Number(selectedOccupancy.price);
      return isNaN(n) ? null : n;
    }

    // Otherwise, show minimum price from all occupancies for this plan
    const modeKey = mode.toLowerCase();
    let minPrice = getMinOccupancyPrice(subscriptionType, modeKey);

    // Try alternate mode if not found
    if (minPrice == null) {
      const altModeKey = mode === "Online" ? "offline" : "online";
      minPrice = getMinOccupancyPrice(subscriptionType, altModeKey);
    }

    // Fallback for monthly: use monthly.price if present
    if (minPrice == null && subscriptionType === "monthly") {
      let price = parseNumber(sessionData?.[modeKey]?.monthly?.price);
      if (price == null) {
        const altKey = mode === "Online" ? "offline" : "online";
        price = parseNumber(sessionData?.[altKey]?.monthly?.price);
      }
      if (price == null) {
        price = parseNumber(sessionData?.guideCard?.price);
      }
      return price;
    }

    // Final fallback to getPlanPricePreview
    if (minPrice == null) {
      const pv = getPlanPricePreview(subscriptionType);
      return pv?.price ?? null;
    }

    return minPrice;
  };

  const handleShowFreeTrail = () => {
    // Check if there are any videos available for free trial
    const hasVideoContent = sessionData?.session?.freeTrialVideo;

    if (hasVideoContent) {
      setShowFreeTrail(true);
    } else {
      showError("Free trial is not available for this program");
    }
  };

  return (
    <div className="py-10 md:mt-[100px] mt-[70px] bg-gradient-to-r from-[#FAF4F0] to-white">
      {/* title and price */}
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold">{sessionData?.guideCard?.title}</h1>
        <p className="text-2xl font-semibold text-gray-800 mt-2">
          From{" "}
          <span className="text-3xl">
            {sessionData?.guideCard?.price &&
              `₹ ${Number(sessionData.guideCard.price).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
          </span>
        </p>
      </div>

      {/* Image and subscription */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-7xl mx-auto px-4 py-10">
        {/* Image */}
        <div className="flex-shrink-0 space-y-4">
          {/* Main Media Display */}
          {mainImageType === "video" ? (
            <video
              src={mainImage || sessionData?.guideCard?.thumbnail}
              controls
              autoPlay
              muted
              className="rounded-xl xl:h-[400px] xl:w-[700px] md:h-[450px] sm:h-[480px] object-cover"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={mainImage || sessionData?.guideCard?.thumbnail}
              alt="Instructor"
              className="rounded-xl xl:h-[400px] xl:w-[700px] md:h-[450px] sm:h-[480px] object-cover"
            />
          )}

          {/* Gallery Media Thumbnails (Images + Videos Mixed) */}
          {(galleryImages.length > 0 || galleryVideos.length > 0) && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Main thumbnail */}
              {sessionData?.guideCard?.thumbnail && (
                <div className="relative flex-shrink-0">
                  {getMediaType(sessionData.guideCard.thumbnail) === "video" ? (
                    <div className="relative">
                      <video
                        src={sessionData.guideCard.thumbnail}
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        muted
                        preload="metadata"
                        onClick={() =>
                          handleMediaSelect(sessionData.guideCard.thumbnail)
                        }
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black bg-opacity-50 rounded-full p-1">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M8 5v10l8-5-8-5z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={sessionData.guideCard.thumbnail}
                      alt="Main thumbnail"
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() =>
                        handleMediaSelect(sessionData.guideCard.thumbnail)
                      }
                    />
                  )}
                </div>
              )}

              {/* Gallery thumbnails - Images and Videos mixed */}
              {[...galleryImages, ...(galleryVideos || [])].map(
                (media, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {getMediaType(media) === "video" ? (
                      <div className="relative">
                        <video
                          src={media}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          muted
                          preload="metadata"
                          onClick={() => handleMediaSelect(media)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black bg-opacity-50 rounded-full p-1">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M8 5v10l8-5-8-5z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={media}
                        alt={`Gallery ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleMediaSelect(media)}
                      />
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Subscription and mode */}
        <div className="flex-1 space-y-6">
          {/* mode */}
          <div className="flex flex-wrap gap-4">
            {/* Show dropdown only if subcategory is BOTH */}
            {sessionData?.guideCard?.subCategory?.toLowerCase() === "both" && (
              <div className="relative flex items-center gap-4">
                <label className="font-medium">Select Mode:</label>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-4 py-2 border rounded-full border-[#D69A75] flex items-center gap-2 bg-white"
                >
                  {mode || "Choose Mode"} <FiChevronDown />
                </button>
                {dropdownOpen && (
                  <div className="absolute mt-2 bg-white border rounded shadow w-full z-10">
                    {["Offline", "Online"].map((opt, i) => (
                      <div
                        key={i}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                          mode === opt ? "bg-gray-100 font-semibold" : ""
                        }`}
                        onClick={() => {
                          setMode(opt);
                          setSelectedOccupancy(null); // Reset occupancy when changing mode
                          setDropdownOpen(false);
                        }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-medium">No of persons/sessions:</label>
              <div className="flex items-center border-[#D69A75] border rounded-full px-2">
                <button
                  className="p-2"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <span className="px-3">{quantity}</span>
                <button
                  className="px-2"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: sessionData?.guideCard?.description || "",
            }}
          />

          {/* occupency/group type - Based on selected mode and subscription type */}
          {(() => {
            const currentOccupancies = getCurrentOccupancies();
            return (
              currentOccupancies &&
              currentOccupancies.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-[#C5703F]" />
                    <span className="text-sm font-medium">
                      Select Occupancy:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentOccupancies.map((occupancy, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedOccupancy(occupancy);
                        }}
                        className={`px-4 py-2 rounded-lg border transition-all duration-200 text-sm ${
                          selectedOccupancy?.type === occupancy.type
                            ? "border-[#C5703F] bg-[#C5703F] text-white shadow-md"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#C5703F] hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-center">
                          <p className="font-semibold">{occupancy.type}</p>
                          {occupancy.price && (
                            <p className="text-xs opacity-90">
                              ₹
                              {new Intl.NumberFormat("en-IN").format(
                                occupancy.price,
                              )}
                            </p>
                          )}
                          {occupancy.min && occupancy.max && (
                            <p className="text-xs opacity-75">
                              {occupancy.min}-{occupancy.max} persons
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            );
          })()}

          {/* Subscription Type Selector - show if admin provided plan in ANY mode */}
          {(planAvailableAny("monthly") || planAvailableAny("oneTime")) && (
            <div className="max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Choose Plan Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {/* One Time Option */}
                {planAvailableAny("oneTime") && (
                  <button
                    onClick={() => {
                      setSubscriptionType("oneTime");
                      setSelectedPlan("oneTime");
                      setUserPickedPlan(true);
                      setSelectedOccupancy(null); // Reset occupancy when changing plan type
                      if (!planAvailable("oneTime")) {
                        const m = findModeForPlan("oneTime");
                        if (m) setMode(m);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      subscriptionType === "oneTime"
                        ? "border-[#C5703F] bg-[#C5703F] text-white shadow-md"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#C5703F] hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold">One Time</p>
                      {(() => {
                        const pv = getPlanPricePreview("oneTime");
                        return pv ? (
                          <>
                            <p className="text-xs mt-1">
                              From ₹
                              {new Intl.NumberFormat("en-IN").format(pv.price)}
                            </p>
                            {/* <p className="text-xs font-medium text-green-600 mt-1">
                                                            Mode: {pv.mode || mode || 'Online'}
                                                        </p> */}
                          </>
                        ) : null;
                      })()}
                    </div>
                  </button>
                )}

                {/* Monthly Option */}
                {planAvailableAny("monthly") && (
                  <button
                    onClick={() => {
                      setSubscriptionType("monthly");
                      setSelectedPlan("monthly");
                      setUserPickedPlan(true);
                      setSelectedOccupancy(null); // Reset occupancy when changing plan type
                      if (!planAvailable("monthly")) {
                        const m = findModeForPlan("monthly");
                        if (m) {
                          setMode(m);
                        }
                      } else {
                        console.log(
                          "Monthly is available in current mode:",
                          mode,
                        );
                      }
                    }}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      subscriptionType === "monthly"
                        ? "border-[#C5703F] bg-[#C5703F] text-white shadow-md"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#C5703F] hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold">Monthly</p>
                      {(() => {
                        const pv = getPlanPricePreview("monthly");
                        return pv ? (
                          <>
                            <p className="text-xs mt-1">
                              From ₹
                              {new Intl.NumberFormat("en-IN").format(pv.price)}
                            </p>
                            {/* <p className="text-xs font-medium text-blue-600 mt-1">
                                                            Mode: {pv.mode || mode || 'Online'}
                                                        </p> */}
                          </>
                        ) : null;
                      })()}
                    </div>
                  </button>
                )}
              </div>

              {/* Selected Plan Price Summary (uses occupancy price if selected) */}
              {subscriptionType &&
                (() => {
                  const title =
                    subscriptionType === "oneTime"
                      ? "One Time Purchase"
                      : "Monthly Subscription";
                  const price = getDisplayedPrice();
                  if (price == null) return null;
                  return (
                    <div className="mt-2 border rounded-xl p-4 bg-white">
                      <div className="font-semibold underline mb-2">
                        {title}
                      </div>
                      <div className="text-2xl font-bold">
                        ₹ {new Intl.NumberFormat("en-IN").format(price)}
                      </div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Book Now opens Calendar Modal with available slots */}
          {subscriptionType && (
            <div className="max-w-sm mt-6 space-y-3">
              {(() => {
                const buttonConfig = getProgramButtonConfig(
                  userPrograms,
                  sessionData?.guideCard?.title,
                  "guide",
                );
                const hasPreviousBooking = buttonConfig.action !== "book";
                return (
                  <>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          // Only switch mode if the current mode doesn't support the selected plan
                          // This respects the user's explicit mode selection
                          if (!planAvailable(subscriptionType)) {
                            let desiredMode = findModeForPlan(subscriptionType);
                            if (desiredMode && desiredMode !== mode) {
                              setMode(desiredMode);
                              // yield a tick so mode-dependent selectors use updated state
                              await new Promise((r) => setTimeout(r, 0));
                            }
                          } else {
                            console.log(
                              `Current mode (${mode}) supports ${subscriptionType}, keeping user's selection`,
                            );
                          }

                          // If user selected monthly, lock it before opening modal to avoid any fallback
                          if (subscriptionType === "monthly") {
                            setSubscriptionType("monthly");
                            setSelectedPlan("monthly");
                            await new Promise((r) => setTimeout(r, 0));
                          }

                          await loadPurchasedUsers();
                          await loadSlotBookings();
                          setShowCalendar(true);
                        } catch (error) {
                          console.error(
                            "Error in Book Now click handler:",
                            error,
                          );
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-white font-semibold bg-[#2F6288] hover:bg-[#2F6288]/90`}
                    >
                      Book Now
                    </button>
                    {hasPreviousBooking ? (
                      <button
                        onClick={() => navigate("/userdashboard")}
                        className="w-full px-4 py-3 rounded-lg border border-[#2F6288] text-[#2F6288] hover:bg-blue-50 font-semibold"
                      >
                        See your previous booking
                      </button>
                    ) : (
                      <button
                        onClick={handleShowFreeTrail}
                        className="w-full px-4 py-3 rounded-lg border border-[#2F6288] text-[#2F6288] hover:bg-blue-50 font-semibold"
                      >
                        Get a Free Trial
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-gray-700 max-w-7xl mx-auto my-10 px-4">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: sessionData?.session?.sessiondescription || "",
          }}
        />
      </div>

      {/* Yoga Vidya Skills */}
      <div className="text-sm max-w-7xl mx-auto my-10 px-4">
        <h2 className="font-bold text-gray-800 mt-4 capitalize">
          {sessionData?.session?.title}
        </h2>
        <div
          className="prose prose-sm max-w-none mt-2"
          dangerouslySetInnerHTML={{
            __html: sessionData?.session?.description || "",
          }}
        />
      </div>

      {/* Meet Your Pilgrim Guide */}
      {sessionData?.guide?.[0] && (
        <PilgrimGuide guides={sessionData?.guide[0]} />
      )}

      {/* You may also like */}
      <div className="max-w-7xl mx-auto p-6 rounded-2xl grid gap-6 px-4">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          You May Also Like
        </h2>

        <motion.div
          className="md:grid flex flex-col mx-auto lg:mx-0 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.1 }}
        >
          {allEvents && Object.keys(allEvents).length > 0 ? (
            Object.entries(allEvents)
              .filter(([id, data]) => {
                // Only show guide programs that have an image
                return (
                  data?.type === "guide" && !!data?.upcomingSessionCard?.image
                );
              })
              .sort(() => Math.random() - 0.5)
              .slice(0, 3)
              .map(([id, data]) => (
                <PersondetailsCard
                  key={id}
                  image={
                    data?.upcomingSessionCard?.image ||
                    "/assets/default-event.png"
                  }
                  title={data?.upcomingSessionCard?.title || "Program"}
                  price={`${data?.upcomingSessionCard?.price || "0"}`}
                  type={data?.type || "guide"}
                />
              ))
          ) : (
            // Fallback to original cards if no events loaded
            <>
              <PersondetailsCard
                image="/assets/Rohini_singh.png"
                title="Discover your true self - A 28 day program with Rohini Singh Sisodia"
                price="Rs.14,999.00"
              />
              <PersondetailsCard
                image="/assets/Anisha.png"
                title="Let's meditate for an hour - With Anisha"
                price="Rs.199.00"
              />
              <PersondetailsCard
                image="/assets/arati_prasad.png"
                title="Menopausal fitness - A 4 day regime curated by Aarti Prasad"
                price="Rs.4,000.00"
              />
            </>
          )}
        </motion.div>
      </div>

      {showModal && <SlotModal onClose={() => setShowModal(false)} />}

      {/* Calendar Modal - Use different modal for monthly vs one-time */}
      {showCalendar && subscriptionType === "monthly" && (
        <MonthlyCalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          sessionData={sessionData}
          selectedPlan={selectedPlan}
          mode={mode || "Online"}
          availableSlots={availableSlots}
          occupancyType={selectedOccupancy?.type || "individual"}
          userMonthlySlots={userMonthlySlots}
          slotBookings={slotBookings}
          groupStatus={groupStatus}
          waitingPeriod={waitingPeriod}
          onGroupBooking={handleGroupBooking}
          cartItems={cartItems}
          quantity={quantity}
          onAddToCart={async (cartItem) => {
            dispatch(addToCartRedux(cartItem));
            setShowCalendar(false);
            // Reload all booking data to ensure UI is up to date
            await loadPurchasedUsers();
            await loadUserMonthlyBookings();
            await loadSlotBookings();
          }}
        />
      )}

      {/* One-time Calendar Modal */}
      {showCalendar && subscriptionType === "oneTime" && (
        <CalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          sessionData={sessionData}
          selectedPlan={selectedPlan}
          mode={mode}
          availableSlots={availableSlots}
          personsPerBooking={getPersonsPerBooking()}
          occupancyType={selectedOccupancy?.type || ""}
          capacityMax={getOneTimeCapacityForSelected()}
          quantity={quantity}
          onAddToCart={(cartItem) => {
            dispatch(addToCartRedux(cartItem));
            setShowCalendar(false);
          }}
        />
      )}

      {showFreeTrail && (
        <FreeTrailModal
          onClose={() => setShowFreeTrail(false)}
          videoUrl={sessionData?.session?.freeTrialVideo}
          title={sessionData?.guideCard?.title}
        />
      )}
    </div>
  );
}
