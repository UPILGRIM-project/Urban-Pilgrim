import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FaEye, FaTimes } from "react-icons/fa";
import { fetchGuideData, saveOrUpdateGuideData } from "../../../services/pilgrim_guide/guideService";
import { showSuccess, showError } from "../../../utils/toast";
import { auth } from "../../../services/firebase";

// Stable empty array reference to prevent unnecessary re-renders
const EMPTY_GUIDES = [];

export default function GuideBookingsTable() {
    const [filter, setFilter] = useState("All");
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const uid = "pilgrim_guides";

    // Get guide data from Redux
    const guides = useSelector(state => state.pilgrimGuide?.guides || EMPTY_GUIDES);

    // Fetch bookings from guides on component mount
    useEffect(() => {
        fetchBookingsFromGuides();
    }, [guides]);

    const fetchBookingsFromGuides = async () => {
        try {
            let guideData = guides;
            setLoading(true);
            // Fallback to Firestore if Redux is empty
            if (!guideData.length) {
                const fetchedGuideData = await fetchGuideData(uid);
                if (fetchedGuideData && fetchedGuideData.slides) {
                    guideData = Array.isArray(fetchedGuideData.slides)
                        ? fetchedGuideData.slides
                        : Object.values(fetchedGuideData.slides).filter(item => typeof item === 'object');
                }
            }

            const bookingsData = [];

            // Extract bookings from guides
            guideData.forEach((guide, guideIndex) => {
                if (guide.purchasedUsers && Array.isArray(guide.purchasedUsers)) {
                    guide.purchasedUsers.forEach((user, userIndex) => {
                        const rawTitle = (guide.guideCard?.title || guide.title || guide.session?.title || '').toString();
                        let guidename = '';
                        if (rawTitle) {
                            const m = rawTitle.match(/(?:with|by)\s*[:\-]?\s*(.+)$/i);
                            guidename = m ? m[1].trim() : '';
                        }
                        bookingsData.push({
                            id: `#PG-${String(guideIndex + 1).padStart(3, '0')}-${String(userIndex + 1).padStart(3, '0')}`,
                            bookingId: `#PG-${String(guideIndex + 1).padStart(3, '0')}-${String(userIndex + 1).padStart(3, '0')}`,
                            email: user.email || user.userEmail || '',
                            name: user.name || user.fullName || user.userName || '',
                            whatsapp: user.whatsapp || user.whatsApp || user.phone || user.contact || '',
                            mode: user.mode || guide.mode || 'Online',
                            programTitle: guide.guideCard?.title || guide.title || guide.session?.title || '-',
                            guidename,
                            persons: ((user.subscriptionType ? String(user.subscriptionType).toLowerCase() : ((user.slot || user.date) ? 'one-time' : 'monthly')) === 'monthly' ? 'Monthly' : 'One-time'),
                            bookingDate: user.purchasedAt || user.createdAt || new Date(),
                            location: user.mode === 'Offline' ? (user.location || guide.location || 'Location TBD') : '-',
                            status: user.status || 'confirmed',
                            price: user.price || guide.guideCard?.price || guide.online?.monthly?.price || guide.online?.oneTime?.price || guide.offline?.monthly?.price || guide.offline?.oneTime?.price || guide.price || 0,
                            guideIndex,
                            userIndex,
                            originalGuide: guide
                        });
                    });
                }
            });

            setBookings(bookingsData);
        } catch (error) {
            console.error("Error fetching bookings from guides:", error);
            showError("Failed to fetch booking data");
        } finally {
            setLoading(false);
        }
    };

    const handleViewBooking = (booking) => {
        setSelectedBooking(booking);
        setShowViewModal(true);
    };

    const filtered = bookings.filter((b) => {
        const matchesSearch = b.email.toLowerCase().includes(search.toLowerCase()) ||
            b.guideName.toLowerCase().includes(search.toLowerCase());
        const matchesMode = filter === "All" || b.mode === filter;

        const bookingTime = new Date(b.date).getTime();
        let matchesDateRange = true;
        if (startDate) matchesDateRange = matchesDateRange && bookingTime >= new Date(startDate).getTime();
        if (endDate) matchesDateRange = matchesDateRange && bookingTime <= new Date(endDate).getTime();

        return matchesSearch && matchesMode && matchesDateRange;
    });

    if (loading) {
        return (
            <div className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#2F6288] mb-4">
                    Pilgrim Guide Bookings <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6288]"></div>
                    <span className="ml-2 text-gray-600">Loading bookings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-[#2F6288] mb-4">
                Pilgrim Guide Bookings <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>
            {/* Export */}
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => {
                        try {
                            const rows = bookings.map(b => ({
                                BookingID: b.bookingId,
                                Email: b.email,
                                Whatsapp: b.whatsapp || '',
                                Name: b.name || '',
                                Guide: b.guideName,
                                Mode: b.mode,
                                Persons: b.persons,
                                BookingDate: new Date(b.bookingDate).toLocaleDateString(),
                                Location: b.location,
                                Status: b.status,
                                Price: b.price,
                            }));
                            const headers = Object.keys(rows[0] || {
                                BookingID: '', Email: '', Whatsapp: '', Name: '', Guide: '', Mode: '', Persons: '', BookingDate: '', Location: '', Status: '', Price: ''
                            });
                            const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
                                const val = (r[h] ?? '').toString().replace(/"/g, '""');
                                return `"${val}"`;
                            }).join(','))].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `guide_bookings_${new Date().toISOString().slice(0,10)}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            console.error('Export failed', e);
                        }
                    }}
                    className="px-3 py-2 text-sm bg-[#2F6288] text-white rounded hover:bg-[#1e4a6b]"
                >
                    Export to Excel
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-3 mb-4">
                <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
                    <label className="text-sm flex flex-col md:flex-row md:items-center gap-2 text-nowrap">
                        Mode:
                        <select
                            className="border p-2 rounded w-full md:w-auto"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option>All</option>
                            <option>Online</option>
                            <option>Offline</option>
                        </select>
                    </label>

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
                </div>

                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        className="border p-2 rounded w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table for desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-[#E8F0F6] text-[#2F6288] text-left">
                        <tr>
                            <th className="p-2">Booking ID</th>
                            <th className="p-2">User Email</th>
                            <th className="p-2">Program Title</th>
                            <th className="p-2">WhatsApp</th>
                            <th className="p-2">Mode</th>
                            <th className="p-2">Session type</th>
                            <th className="p-2">Booking Date</th>
                            <th className="p-2">Price</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((booking, idx) => (
                            <motion.tr
                                key={idx}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                className="bg-gray-50 border-b"
                            >
                                <td className="p-2">{booking.id}</td>
                                <td className="p-2 max-w-[200px] truncate">{booking.email}</td>
                                <td className="p-2 max-w-[220px] truncate">{booking.programTitle}</td>
                                <td className="p-2">{booking.whatsapp || '-'}</td>
                                <td className="p-2">
                                    <span
                                        className={`text-xs font-medium px-2 py-1 rounded ${booking.mode === "Online"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-blue-100 text-blue-700"
                                            }`}
                                    >
                                        {booking.mode}
                                    </span>
                                </td>
                                <td className="p-2">{booking.persons}</td>
                                <td className="p-2">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                                <td className="p-2">₹{booking.price}</td>
                                <td className="p-2 flex items-center justify-center gap-2">
                                    <button
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => handleViewBooking(booking)}
                                        title="View Details"
                                    >
                                        <FaEye />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center p-4 text-gray-500">
                                    No bookings found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Card view for mobile */}
            <div className="md:hidden space-y-4">
                {filtered.map((booking, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="border rounded-lg p-4 shadow-sm"
                    >
                        <div className="flex justify-between">
                            <p className="font-semibold">{booking.id}</p>
                            <span
                                className={`text-xs font-medium px-2 py-1 rounded ${booking.mode === "Online"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                            >
                                {booking.mode}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">{booking.email}</p>
                        {booking.whatsapp && <p className="text-sm text-gray-600">WhatsApp: {booking.whatsapp}</p>}
                        <p className="mt-1 text-sm">{booking.location}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {booking.persons} persons | {new Date(booking.date).toLocaleDateString()}
                        </p>
                        <div className="flex gap-3 mt-3">
                            <button
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => handleViewBooking(booking)}
                                title="View Details"
                            >
                                <FaEye />
                            </button>
                        </div>
                    </motion.div>
                ))}
                {filtered.length === 0 && (
                    <p className="text-center text-gray-500">No bookings found.</p>
                )}
            </div>

            {/* View Booking Modal */}
            {showViewModal && selectedBooking && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-[#2F6288]">Booking Details</h3>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                                    <p className="text-sm text-gray-900">{selectedBooking.bookingId}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User</label>
                                    <p className="text-sm text-gray-900">{selectedBooking.name || '-'} ({selectedBooking.email})</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                                    <p className="text-sm text-gray-900">{selectedBooking.whatsapp || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Guide Name</label>
                                    <p className="text-sm text-gray-900">{selectedBooking.guidename}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mode</label>
                                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${selectedBooking.mode === 'Online'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {selectedBooking.mode}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Persons</label>
                                    <p className="text-sm text-gray-900">{selectedBooking.persons}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Booking Date</label>
                                    <p className="text-sm text-gray-900">{new Date(selectedBooking.bookingDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <p className="text-sm text-gray-900 capitalize">{selectedBooking.status}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Price</label>
                                    <p className="text-sm text-gray-900">${selectedBooking.price}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
