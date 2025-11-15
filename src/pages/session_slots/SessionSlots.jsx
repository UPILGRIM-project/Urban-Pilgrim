import { FiPlay, FiCalendar, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";
import SEO from "../../components/SEO.jsx";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

const SessionSlots = () => {
    const params = useParams();
    const sessionId = params.sessionId;
    const location = useLocation();
    const programFromState = location.state?.program;
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [consumed, setConsumed] = useState({}); // { slotKey: true }
    
    // Get live session data from Redux store
    const Data = useSelector((state) => state.pilgrimLiveSession.LiveSession);
    const currentUser = useSelector((state) => state.auth.user);

    useEffect(() => {
        window.scrollTo(0,0);
    },[])

    function normalizeSlug(str) {
        let s = String(str || '').trim();
        // Normalize unicode dashes to simple '-'
        s = s.replace(/[\u2013\u2014]/g, '-');
        // Replace any whitespace with '-'
        s = s.replace(/\s+/g, '-');
        // Collapse multiple hyphens for matching robustness
        s = s.replace(/-+/g, '-');
        // Remove any non-alphanumeric except '-'
        s = s.replace(/[^A-Za-z0-9-]/g, '');
        return s.toLowerCase();
    }

    useEffect(() => {
        // Priority: use program passed via navigation state, fallback to Redux store lookup
        if (programFromState) {
            setSessionData(programFromState);
            setLoading(false);
            return;
        }
        if (Data && sessionId) {
            const session = Data.find(
                (program) =>
                    normalizeSlug(program?.liveSessionCard?.title) === normalizeSlug(sessionId)
            );
            setSessionData(session || null);
            setLoading(false);
        }
    }, [Data, sessionId, programFromState]);

    // Build booked slots view when navigated from dashboard
    const toHHMM = (val) => {
        if (!val) return undefined;
        const s = String(val);
        if (s.includes('T')) {
            // ISO-like, parse to local HH:MM
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                return d.toTimeString().slice(0,5);
            }
        }
        // Already HH:MM or similar
        return s.slice(0,5);
    };

    const safeLink = (url) => {
        if (!url) return null;
        const s = String(url);
        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        return 'https://' + s;
    };

    const bookedSlots = useMemo(() => {
        if (!programFromState) return null;
        // Priority 1: explicit arrays from program state
        if (Array.isArray(programFromState.selectedSlots) && programFromState.selectedSlots.length > 0) {
            // Normalize monthly selectedSlots shape
            return programFromState.selectedSlots.map((s) => {
                const isoStart = s.start || s.start_at || s.startISO;
                const isoEnd = s.end || s.end_at || s.endISO;
                const date = s.date || s.day || s.slotDate || s.slot_date || (isoStart ? String(isoStart).slice(0,10) : undefined);
                const startTimeRaw = s.startTime || s.start_time || s.time || isoStart;
                const endTimeRaw = s.endTime || s.end_time || isoEnd;
                const startTime = toHHMM(startTimeRaw);
                const endTime = toHHMM(endTimeRaw);
                return {
                    date,
                    startTime,
                    endTime,
                    meetLink: safeLink(programFromState.organizer?.googleMeetLink || s.meetLink || s.link || null),
                    title: programFromState.title,
                };
            }).filter(sl => sl.date);
        }
        if (Array.isArray(programFromState.slots) && programFromState.slots.length > 0) {
            return programFromState.slots.map((s) => {
                const isoStart = s.start || s.start_at || s.startISO;
                const isoEnd = s.end || s.end_at || s.endISO;
                const date = s.date || s.day || s.slotDate || s.slot_date || (isoStart ? String(isoStart).slice(0,10) : undefined);
                const startTimeRaw = s.startTime || s.start_time || s.time || isoStart;
                const endTimeRaw = s.endTime || s.end_time || isoEnd;
                const startTime = toHHMM(startTimeRaw);
                const endTime = toHHMM(endTimeRaw);
                return {
                    date,
                    startTime,
                    endTime,
                    meetLink: safeLink(programFromState.organizer?.googleMeetLink || s.meetLink || s.link || null),
                    title: programFromState.title,
                };
            }).filter(sl => sl.date);
        }
        // Priority 2.5: purchasedUsers for monthly guides -> filter for current user and map
        if (Array.isArray(programFromState.purchasedUsers) && programFromState.purchasedUsers.length > 0) {
            const uid = currentUser?.uid;
            const email = currentUser?.email;
            const mine = programFromState.purchasedUsers.filter(u =>
                (uid && u.uid === uid) || (email && u.customerEmail === email)
            );
            if (mine.length > 0) {
                const norm = mine.map(u => {
                    const date = u.date || u.slot?.date;
                    const startRaw = u.slot?.startTime || u.startTime;
                    const endRaw = u.slot?.endTime || u.endTime;
                    const toHHMM = (val) => {
                        if (!val) return undefined;
                        const s = String(val);
                        if (s.includes('T')) {
                            const d = new Date(s);
                            if (!isNaN(d.getTime())) return d.toTimeString().slice(0,5);
                        }
                        return s.slice(0,5);
                    };
                    return {
                        date,
                        startTime: toHHMM(startRaw),
                        endTime: toHHMM(endRaw),
                        meetLink: programFromState.organizer?.googleMeetLink ? (String(programFromState.organizer.googleMeetLink).startsWith('http') ? programFromState.organizer.googleMeetLink : `https://${programFromState.organizer.googleMeetLink}`) : null,
                        title: programFromState.title,
                        id: u.slot?.id || `${date}-${startRaw}`
                    };
                }).filter(sl => sl.date);
                if (norm.length > 0) return norm;
            }
        }
        // Priority 2: single-slot object on programFromState.slot (e.g., one-time guide)
        if (programFromState.slot && (programFromState.slot.date || programFromState.slot.startTime)) {
            return [{
                date: programFromState.slot.date,
                startTime: programFromState.slot.startTime,
                endTime: programFromState.slot.endTime,
                // Meet link may be provided by organizer
                meetLink: programFromState.organizer?.googleMeetLink || programFromState.meetLink || programFromState.joinLink || programFromState.link,
                title: programFromState.title,
            }];
        }
        // Priority 3: single-slot fields separated (legacy shape)
        if (programFromState.slotDate || programFromState.slotStart || programFromState.slotEnd) {
            return [{
                date: programFromState.slotDate,
                startTime: programFromState.slotStart,
                endTime: programFromState.slotEnd,
                meetLink: programFromState.organizer?.googleMeetLink || programFromState.meetLink || programFromState.joinLink || programFromState.link,
                title: programFromState.title,
            }];
        }
        return null;
    }, [programFromState]);

    // If user came from dashboard and we could detect booked slots, only show those
    const normalizedSessionSelected = Array.isArray(sessionData?.selectedSlots)
        ? sessionData.selectedSlots.map((s) => {
            const isoStart = s.start || s.start_at || s.startISO;
            const isoEnd = s.end || s.end_at || s.endISO;
            const date = s.date || s.day || s.slotDate || s.slot_date || (isoStart ? String(isoStart).slice(0,10) : undefined);
            const startTime = toHHMM(s.startTime || s.start_time || s.time || isoStart);
            const endTime = toHHMM(s.endTime || s.end_time || isoEnd);
            return { date, startTime, endTime, meetLink: safeLink(s.meetLink || s.link || null), title: sessionData?.title };
          }).filter(sl => sl.date)
        : null;

    const slots = bookedSlots || normalizedSessionSelected || sessionData?.liveSlots || [];

    // Attempt to resolve a Meet/Join link for a given slot or session
    const resolveJoinLink = (slot) => {
        return (
            slot?.meetLink ||
            slot?.joinLink ||
            slot?.link ||
            sessionData?.meetLink ||
            sessionData?.joinLink ||
            sessionData?.liveSessionCard?.meetLink ||
            sessionData?.liveSessionCard?.joinLink ||
            programFromState?.meetLink ||
            programFromState?.joinLink ||
            programFromState?.organizer?.googleMeetLink ||
            programFromState?.slot?.meetLink ||
            programFromState?.slot?.link ||
            ""
        );
    };

    // Time helpers
    const canJoinNow = (slot) => {
        try {
            const now = new Date();
            // Build start/end Date objects
            let startDt = null, endDt = null;
            if (slot?.date && slot?.startTime && /\d{2}:\d{2}/.test(slot.startTime)) {
                startDt = new Date(`${slot.date}T${slot.startTime}:00`);
            } else if (slot?.startTime && String(slot.startTime).includes('T')) {
                const d = new Date(slot.startTime);
                if (!isNaN(d.getTime())) startDt = d;
            } else if (slot?.date) {
                startDt = new Date(`${slot.date}T00:00:00`);
            }
            if (slot?.endTime && String(slot.endTime).includes('T')) {
                const d = new Date(slot.endTime);
                if (!isNaN(d.getTime())) endDt = d;
            } else if (slot?.date && slot?.endTime && /\d{2}:\d{2}/.test(slot.endTime)) {
                endDt = new Date(`${slot.date}T${slot.endTime}:00`);
            }

            // Same-day rule: if today and before end time, allow join
            if (slot?.date) {
                const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const slotMid = new Date(new Date(slot.date).getFullYear(), new Date(slot.date).getMonth(), new Date(slot.date).getDate()).getTime();
                if (slotMid === todayMid && endDt && now.getTime() < endDt.getTime()) {
                    return true;
                }
            }

            // Default: enable 15 minutes before start
            if (startDt) return now.getTime() >= (startDt.getTime() - 15 * 60 * 1000);
            return false;
        } catch { return false; }
    };
    
    return (
        <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
            <SEO
                title="Live Session Slots | Meditation with Anisha | Urban Pilgrim"
                description="Book your spot for live meditation sessions with Anisha. View available dates and times for 'Let's meditate for an hour'."
                keywords="meditation slots, book meditation, live meditation, anisha meditation, urban pilgrim sessions"
                canonicalUrl="/session_slots"
                ogImage="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0"
            />
            
            <div className="relative w-full ">
                <img
                    src="/retreats.svg"
                    alt="Guides Header"
                    className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
                />
                <div className="relative z-10 px-6 pt-10 pb-4 flex justify-between max-w-7xl mx-auto">
                    <p className="text-3xl text-[#2F6288] font-bold">
                        {sessionData?.title || "Live Session"} <span className="bg-[#2F6288] mt-4 w-1/3 min-w-20 h-1 block"></span>
                    </p>
                    {/* <img src="/assets/slots/zoom.png" alt="Zoom Icon" className="w-48 h-full" /> */}
                </div>
                <div className="bg-gradient-to-b from-white/10 via-white/60 to-[#FAF4F0] absolute -bottom-4 z-8 h-24 w-full"></div>
            </div>

            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF4F0] to-white px-4 pb-4 max-w-7xl mx-auto z-10 relative">
                <h2 className="text-xl font-semibold mb-6 w-full">All Slots</h2>
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
                        <span className="ml-3 text-gray-600">Loading slots...</span>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-lg mb-2">📅</div>
                        <p className="text-gray-600 text-lg font-medium">No slots available</p>
                        <p className="text-gray-500 text-sm mt-1">Check back later for new session slots</p>
                    </div>
                ) : (
                    <div className="space-y-6 w-full">
                        {slots.map((slot, index) => {
                            // Build a precise start datetime if we have a startTime; fallback to date-only
                            let startDateTime = null;
                            try {
                                if (slot?.date && slot?.startTime && /\d{2}:\d{2}/.test(slot.startTime)) {
                                    startDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
                                } else if (slot?.date) {
                                    startDateTime = new Date(`${slot.date}T00:00:00`);
                                } else if (slot?.startTime) {
                                    startDateTime = new Date(slot.startTime);
                                }
                            } catch {}
                            const now = new Date();
                            let hasEnded = startDateTime ? startDateTime.getTime() < now.getTime() : false;
                            let isLive = !hasEnded; // default behavior

                            // Special rule for guide: LIVE only if slot date is strictly greater than today (ignore time)
                            const type = (programFromState?.type || sessionData?.type || '').toLowerCase();
                            if (type === 'guide' && slot?.date) {
                                const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                const slotMid = new Date(new Date(slot.date).getFullYear(), new Date(slot.date).getMonth(), new Date(slot.date).getDate()).getTime();
                                // Compute endDt for same-day allowance
                                let endDt = null;
                                if (slot?.endTime && String(slot.endTime).includes('T')) {
                                    const d = new Date(slot.endTime);
                                    if (!isNaN(d.getTime())) endDt = d;
                                } else if (slot?.date && slot?.endTime && /\d{2}:\d{2}/.test(slot.endTime)) {
                                    endDt = new Date(`${slot.date}T${slot.endTime}:00`);
                                }
                                // LIVE if future date OR same day and not past end time
                                isLive = slotMid > todayMid || (slotMid === todayMid && endDt && now.getTime() < endDt.getTime());
                                hasEnded = !isLive;
                            }

                            const joinUrl = resolveJoinLink(slot);
                            return (
                                <motion.div
                                    key={slot.id || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex flex-col md:flex-row gap-4 p-4 border rounded-xl shadow w-full"
                                >
                                    <div className="relative w-full md:w-56 h-36 flex-shrink-0 overflow-hidden rounded-lg">
                                        <img
                                            src={sessionData.image || sessionData?.liveSessionCard?.thumbnail || "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0"}
                                            alt="Slot Thumbnail"
                                            className="w-full h-full object-cover"
                                        />
                                        <span className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded ${isLive ? 'bg-red-600' : 'bg-gray-600'}`}>
                                            {isLive ? 'LIVE' : 'ENDED'}
                                        </span>
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                                            <FiPlay className="text-black w-4 h-4 ml-1" />
                                        </div>
                                    </span>
                                </div>

                                <div className="flex flex-col justify-between w-full">
                                    <div>
                                        <h3 className="text-base font-semibold mb-2">{slot.title || sessionData?.liveSessionCard?.title}</h3>
                                        <div className="flex items-center text-sm text-gray-600 mb-1">
                                            <FiCalendar className="w-4 h-4 mr-2" /> 
                                            Date: {" "} 
                                            {new Date(slot.date).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}

                                        </div>
                                        {slot?.startTime && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <FiClock className="w-4 h-4 mr-2" /> 
                                                Time: {" "}
                                                {new Date(`1970-01-01T${slot.startTime}`).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {!!joinUrl && isLive && (
                                        <div className="mt-4">
                                            {(() => {
                                                const key = slot.id || `${slot.date}-${slot.startTime || ''}-${index}`;
                                                const enabled = canJoinNow(slot) && !consumed[key];
                                                return (
                                                    <a
                                                        href={enabled ? joinUrl : undefined}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`inline-flex items-center px-4 py-2 rounded-md text-white ${enabled ? 'bg-[#2F6288] hover:bg-[#224b66]' : 'bg-gray-400 cursor-not-allowed'}`}
                                                        onClick={(e) => {
                                                            if (!enabled) { e.preventDefault(); return; }
                                                            // Mark consumed to disable after first click
                                                            setConsumed((prev) => ({ ...prev, [key]: true }));
                                                        }}
                                                    >
                                                        Join Now
                                                    </a>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SessionSlots