import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaEye, FaTimes } from "react-icons/fa";
import { fetchLiveSessionData } from "../../../services/pilgrim_session/liveSessionService";
import { fetchRecordedSessionData } from "../../../services/pilgrim_session/recordedSessionService";
import { showError } from "../../../utils/toast";

const UID = "pilgrim_sessions";

/* ─── helpers ─── */
function extractLiveBookings(sessions) {
    const out = [];
    sessions.forEach((session, si) => {
        if (!Array.isArray(session.purchasedUsers)) return;
        session.purchasedUsers.forEach((user, ui) => {
            const bd = user.purchasedAt || user.bookingDate || user.createdAt || new Date();
            out.push({
                id: `#PS-L${String(si + 1).padStart(3, "0")}-${String(ui + 1).padStart(3, "0")}`,
                email: user.email || user.userEmail || "",
                name: user.name || user.fullName || user.userName || "",
                whatsapp: user.whatsapp || user.whatsApp || user.phone || user.contact || "",
                programName:
                    session.liveSessionCard?.title ||
                    session.pilgrimLiveSessionCard?.title ||
                    session.title ||
                    "Unknown Live Session",
                persons: user.persons || user.numberOfPersons || 1,
                bookingDate: bd,
                date: new Date(bd).toLocaleDateString(),
                status: user.status || "confirmed",
                price:
                    user.price ||
                    session.liveSessionCard?.price ||
                    session.liveProgramCard?.price ||
                    session.pilgrimLiveSessionCard?.price ||
                    session.price ||
                    0,
            });
        });
    });
    return out;
}

function extractRecordedBookings(sessions) {
    const out = [];
    sessions.forEach((session, si) => {
        if (!Array.isArray(session.purchasedUsers)) return;
        session.purchasedUsers.forEach((user, ui) => {
            const bd = user.purchasedAt || user.bookingDate || user.createdAt || new Date();
            out.push({
                id: `#PS-R${String(si + 1).padStart(3, "0")}-${String(ui + 1).padStart(3, "0")}`,
                email: user.email || user.userEmail || "",
                name: user.name || user.fullName || user.userName || "",
                whatsapp: user.whatsapp || user.whatsApp || user.phone || user.contact || "",
                programName:
                    session.recordedProgramCard?.title ||
                    session.programCard?.title ||
                    session.title ||
                    session.aboutProgram?.title ||
                    "Unknown Recorded Session",
                persons: user.persons || user.numberOfPersons || 1,
                bookingDate: bd,
                date: new Date(bd).toLocaleDateString(),
                status: user.status || "confirmed",
                price:
                    user.price ||
                    session.recordedProgramCard?.price ||
                    session.price ||
                    0,
            });
        });
    });
    return out;
}

function exportCSV(bookings, filename) {
    if (!bookings.length) return;
    const rows = bookings.map((b) => ({
        "Booking ID": b.id,
        Name: b.name,
        Email: b.email,
        WhatsApp: b.whatsapp,
        "Program Name": b.programName,
        Persons: b.persons,
        "Booking Date": new Date(b.bookingDate).toLocaleDateString(),
        Status: b.status,
        "Price (INR)": b.price,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(","),
        ...rows.map((r) =>
            headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ─── Shared BookingTable sub-component ─── */
function BookingTable({ title, accent, bookings, loading }) {
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);

    const filtered = bookings.filter((b) => {
        const q = search.toLowerCase();
        const matchSearch =
            b.email.toLowerCase().includes(q) ||
            b.name.toLowerCase().includes(q) ||
            b.programName.toLowerCase().includes(q);
        const bt = new Date(b.bookingDate).getTime();
        const afterStart = startDate ? bt >= new Date(startDate).getTime() : true;
        const beforeEnd = endDate ? bt <= new Date(endDate).getTime() + 86400000 : true;
        return matchSearch && afterStart && beforeEnd;
    });

    const isLive = accent === "live";
    const typeLabel = isLive ? "Live" : "Recorded";
    const exportName = `${isLive ? "live" : "recorded"}_session_bookings_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-[#2F6288]">
                    {title}
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>
                <button
                    onClick={() => exportCSV(bookings, exportName)}
                    className="self-start md:self-auto px-3 py-2 text-sm bg-[#2F6288] text-white rounded hover:bg-[#1e4a6b]"
                >
                    Export to CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-3 mb-4">
                <label className="text-sm flex flex-col md:flex-row md:items-center gap-2 text-nowrap">
                    Date range:
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="date"
                            className="border p-2 rounded"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="self-center">to</span>
                        <input
                            type="date"
                            className="border p-2 rounded"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </label>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by name, email or program…"
                        className="border p-2 rounded w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6288]"></div>
                    <span className="ml-2 text-gray-600">Loading bookings…</span>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm border rounded overflow-hidden">
                            <thead className="bg-[#E8F0F6] text-[#2F6288] text-left">
                                <tr>
                                    <th className="p-2">#</th>
                                    <th className="p-2">Booking ID</th>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Email</th>
                                    <th className="p-2">WhatsApp</th>
                                    <th className="p-2">Program</th>
                                    <th className="p-2">Persons</th>
                                    <th className="p-2">Price</th>
                                    <th className="p-2">Booking Date</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2 text-center">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((b, idx) => (
                                    <motion.tr
                                        key={b.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18, delay: idx * 0.04 }}
                                        className="bg-white even:bg-gray-50 border-b"
                                    >
                                        <td className="p-2 text-gray-400 text-xs">{idx + 1}</td>
                                        <td className="p-2 font-mono text-xs">{b.id}</td>
                                        <td className="p-2">{b.name || "—"}</td>
                                        <td className="p-2">{b.email}</td>
                                        <td className="p-2">{b.whatsapp || "—"}</td>
                                        <td className="p-2 max-w-[180px] truncate">{b.programName}</td>
                                        <td className="p-2 text-center">{b.persons}</td>
                                        <td className="p-2">₹{b.price}</td>
                                        <td className="p-2 whitespace-nowrap">{b.date}</td>
                                        <td className="p-2">
                                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 capitalize">
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                className="text-blue-600 hover:text-blue-800"
                                                onClick={() => setSelectedBooking(b)}
                                                title="View Details"
                                            >
                                                <FaEye />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="11" className="text-center p-6 text-gray-400">
                                            No bookings found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-400 mt-1">
                            Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-4">
                        {filtered.map((b, idx) => (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18, delay: idx * 0.04 }}
                                className="border rounded-lg p-4 shadow-sm bg-white"
                            >
                                <p className="text-xs font-mono text-gray-400 mb-1">{b.id}</p>
                                <p className="font-semibold">{b.name || b.email}</p>
                                {b.name && <p className="text-sm text-gray-500">{b.email}</p>}
                                {b.whatsapp && (
                                    <p className="text-sm text-gray-500">WhatsApp: {b.whatsapp}</p>
                                )}
                                <p className="mt-1 text-sm">{b.programName}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    ₹{b.price} · {b.persons} person{b.persons > 1 ? "s" : ""} · {b.date}
                                </p>
                                <p className="text-xs mt-1">
                                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 capitalize">
                                        {b.status}
                                    </span>
                                </p>
                                <div className="flex justify-end mt-3">
                                    <button
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => setSelectedBooking(b)}
                                    >
                                        <FaEye />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-center text-gray-400 py-6">No bookings found.</p>
                        )}
                    </div>
                </>
            )}

            {/* View Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg font-semibold text-[#2F6288]">Booking Details</h3>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[
                                    ["Booking ID", selectedBooking.id],
                                    ["Name", selectedBooking.name || "—"],
                                    ["Email", selectedBooking.email],
                                    ["WhatsApp", selectedBooking.whatsapp || "—"],
                                    ["Program", selectedBooking.programName],
                                    ["Type", typeLabel],
                                    ["Persons", selectedBooking.persons],
                                    ["Booking Date", new Date(selectedBooking.bookingDate).toLocaleString()],
                                    ["Status", selectedBooking.status],
                                    ["Price", `₹${selectedBooking.price}`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex gap-2">
                                        <span className="font-medium text-gray-600 min-w-[110px]">{label}:</span>
                                        <span className="text-gray-900 capitalize">{value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="px-4 py-2 bg-[#2F6288] text-white rounded hover:bg-[#1e4a6b]"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Named export: Live bookings only ─── */
export function LiveSessionBookingsTable() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Always fetch fresh from Firestore so purchasedUsers are never stale
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchLiveSessionData(UID);
                let sessions = [];
                if (res?.slides) {
                    sessions = Array.isArray(res.slides)
                        ? res.slides
                        : Object.values(res.slides).filter((x) => typeof x === "object");
                }
                setBookings(extractLiveBookings(sessions));
            } catch (e) {
                console.error("Error fetching live bookings:", e);
                showError("Failed to load live session bookings");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <BookingTable
            title="Live Session Bookings"
            accent="live"
            bookings={bookings}
            loading={loading}
        />
    );
}

/* ─── Named export: Recorded bookings only ─── */
export function RecordedSessionBookingsTable() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Always fetch fresh from Firestore so purchasedUsers are never stale
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchRecordedSessionData(UID);
                let sessions = [];
                if (res?.slides) {
                    sessions = Array.isArray(res.slides)
                        ? res.slides
                        : Object.values(res.slides).filter((x) => typeof x === "object");
                }
                setBookings(extractRecordedBookings(sessions));
            } catch (e) {
                console.error("Error fetching recorded bookings:", e);
                showError("Failed to load recorded session bookings");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <BookingTable
            title="Recorded Session Bookings"
            accent="recorded"
            bookings={bookings}
            loading={loading}
        />
    );
}

/* ─── Default export: both tables (kept for backwards-compat) ─── */
export default function SessionBookingsTable() {
    return (
        <>
            <div className="border rounded-xl shadow-sm bg-white mb-6">
                <LiveSessionBookingsTable />
            </div>
            <div className="border rounded-xl shadow-sm bg-white mb-6">
                <RecordedSessionBookingsTable />
            </div>
        </>
    );
}

