import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaChevronDown } from "react-icons/fa";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { TbUserSquareRounded } from "react-icons/tb";
import { BsNut } from "react-icons/bs";
import { HiMenu } from "react-icons/hi";
import Pagination from "./Pagination";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { collection, query as fsQuery, where, limit, getDocs } from "firebase/firestore";
import { logout } from "../features/authSlice";
import { showSuccess } from "../utils/toast";
import { useNavigate } from "react-router-dom";
import { clearUserPrograms, setUserPrograms } from "../features/userProgramsSlice";
import { doc, getDoc } from "firebase/firestore";
import { clearAllEvents } from "../features/eventsSlice";

// Mock data removed - will use Redux data instead

const StatusBadge = ({ status }) => {
    const colors =
        status === "Completed"
            ? "bg-[#16C09824] text-[#008767] border border-[#008767]"
            : "bg-[#FFC5C580] text-[#DF0404] border border-[#DF0404]";

    return (
        <span className={`inline-flex items-center justify-center w-20 sm:w-28 h-6 sm:h-8 rounded text-xs sm:text-sm font-medium ${colors}`}>
            {status}
        </span>
    );
};

function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filteredPrograms, setFilteredPrograms] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [sortOpen, setSortOpen] = useState(false);
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
    const sortRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const userPrograms = useSelector((state) => state.userProgram);
    const currentUser = useSelector((state) => state.auth.user);


    useEffect(() => {
        let active = true;
        const fetchPrograms = async () => {
            if (!currentUser?.uid) return;
            setLoading(true);
            try {
                const detailsRef = doc(db, "users", currentUser.uid, "info", "details");
                const snap = await getDoc(detailsRef);
                const data = snap.exists() ? snap.data() : {};
                let programs = data?.yourPrograms ?? [];
                if (programs && !Array.isArray(programs) && typeof programs === 'object') {
                    programs = Object.values(programs);
                }
                if (!Array.isArray(programs)) programs = [];
                if (active) dispatch(setUserPrograms(programs));
            } catch (e) {
                console.error("Failed to fetch yourPrograms:", e);
                if (active) dispatch(setUserPrograms([]));
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchPrograms();
        return () => { active = false; };
    }, [currentUser?.uid, dispatch]);

    useEffect(() => {
        const onClick = (e) => {
            if (!sortOpen) return;
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setSortOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [sortOpen]);

    useEffect(() => {
        if (!userPrograms) {
            setFilteredPrograms([]);
            return;
        }

        const filtered = userPrograms.filter(program =>
            program.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            program.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            program.type?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Convert various timestamp formats to ms
        const toMs = (v) => {
            if (!v) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return new Date(v).getTime() || 0;
            if (typeof v === 'object') {
                if (typeof v.toDate === 'function') {
                    try { return v.toDate().getTime(); } catch { /* noop */ }
                }
                if (typeof v.seconds === 'number') {
                    return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
                }
            }
            return 0;
        };

        const purchasedTime = (p) => toMs(p?.purchasedAt) || toMs(p?.createdAt) || 0;

        const sorted = [...filtered].sort((a, b) => {
            const aT = purchasedTime(a);
            const bT = purchasedTime(b);
            return sortBy === 'newest' ? bT - aT : aT - bT;
        });

        setFilteredPrograms(sorted);
    }, [userPrograms, searchTerm, sortBy]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            dispatch(logout());
            dispatch(clearUserPrograms());
            dispatch(clearAllEvents());
            showSuccess("Logout successful");
            navigate("/");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    // Format program data for display
    const formatProgramData = (program) => {
        return {
            session: program.title || "Unknown Program",
            date: program.purchasedAt ? new Date(program.purchasedAt).toLocaleDateString('en-GB') : "N/A",
            category: program.category || program.type || "General",
            price: program.totalAmountPaid || program.price || 0,
            status: program.paymentId ? "Completed" : "Pending"
        };
    };

    // Navigate to the right page based on program type
    const [navLoadingId, setNavLoadingId] = useState(null);

    const enrichMonthlyGuideProgram = async (program, uid) => {
        try {
            // If already has data, skip
            if ((Array.isArray(program.selectedSlots) && program.selectedSlots.length > 0) || program.organizer) {
                return program;
            }

            // Try users/{uid}/programs
            const coll1 = collection(db, "users", uid, "programs");
            let q = fsQuery(
                coll1,
                where("title", "==", program.title || ""),
                where("subscriptionType", "==", "monthly"),
                where("type", "==", "guide"),
                limit(1)
            );
            let snap = await getDocs(q);
            if (snap.empty) {
                // Try users/{uid}/bookings as fallback
                const coll2 = collection(db, "users", uid, "bookings");
                q = fsQuery(
                    coll2,
                    where("title", "==", program.title || ""),
                    where("subscriptionType", "==", "monthly"),
                    where("type", "==", "guide"),
                    limit(1)
                );
                snap = await getDocs(q);
            }
            if (snap.empty) return program;
            const docData = snap.docs[0].data() || {};

            // Merge relevant fields
            const merged = {
                ...program,
                selectedSlots: docData.selectedSlots || program.selectedSlots,
                slot: docData.slot || program.slot,
                organizer: docData.organizer || program.organizer,
                timeZone: docData.timeZone || program.timeZone,
                calendarId: docData.calendarId || program.calendarId,
                summary: docData.summary || program.summary,
                startDate: docData.startDate || program.startDate,
                endDate: docData.endDate || program.endDate,
            };
            return merged;
        } catch (e) {
            console.error("Failed to enrich monthly guide program:", e);
            return program;
        }
    };

    const handleOpenProgram = async (program) => {
        if (navLoadingId) return; // prevent double clicks
        const type = (program.type || program.category || '').toLowerCase();
        const uid = currentUser?.uid;
        try {
            setNavLoadingId(program.id || program.title);
            let enriched = program;
            if (type === 'guide' && (program.subscriptionType || '').toLowerCase() === 'monthly' && uid) {
                enriched = await enrichMonthlyGuideProgram(program, uid);
            }

            // Slug rule: replace ALL spaces with '-'
            const slugifySpaces = (s) => String(s || '').trim().replace(/\s/g, '-');
            const sessionSlug = slugifySpaces(enriched.title);
            const programSlug = sessionSlug;

            if (type === 'live' || type === 'guide') {
                navigate(`/session/${sessionSlug}/slots`, { state: { program: enriched } });
                return;
            }
            if (type === 'recorded' || type === 'recordedsession' || type === 'recorded_session') {
                navigate(`/program/${programSlug}/slots`, { state: { program: enriched } });
                return;
            }
            if (type === 'retreat' || type === 'retreats') {
                return;
            }
            navigate(`/program/${programSlug}/slots`, { state: { program: enriched } });
        } finally {
            setNavLoadingId(null);
        }
    };

    return (
        <div className="flex bg-[#f8f9fd]">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 bg-white shadow-lg flex flex-col justify-between
                    transform transition-transform duration-300 ease-in-out z-40
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                    w-[250px] sm:w-[300px] lg:w-[256px]
                    lg:translate-x-0
                `}
            >
                {/* Mobile header with close button */}
                <div className="flex justify-between items-center px-4 pt-2 border-b lg:hidden">
                    <img src="/urban_pilgrim_logo.png" alt="Logo" className="h-14 w-14 rounded" />
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-md hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-2 hidden lg:block">
                    <img
                        src="/urban_pilgrim_logo.png"
                        alt="Logo"
                        className="mx-auto rounded h-16 w-16 sm:h-24 sm:w-24"
                    />
                </div>

                <nav className="mt-6">
                    <div className="flex items-center px-4 py-2 sm:px-6 sm:py-3 text-gray-700 font-bold text-sm sm:text-lg">
                        <BsNut className="mr-2 text-base sm:text-xl" /> Dashboard
                    </div>
                    <div className="px-4 py-2">
                        <button className="w-full flex items-center justify-between bg-[#C16A00] text-white font-semibold rounded-lg px-3 py-2 sm:px-4 sm:py-3 hover:bg-[#a85b00] transition-colors text-sm sm:text-base">
                            <span className="flex items-center gap-2">
                                <TbUserSquareRounded className="text-base sm:text-xl" /> Purchases
                            </span>
                            <IoIosArrowForward className="text-base sm:text-xl" />
                        </button>
                    </div>
                </nav>

                <div className="flex justify-between items-center p-4 sm:p-6 mt-auto">
                    <div>
                        <p className="text-gray-800 font-medium text-xs sm:text-sm">
                            {(() => {
                                let username = currentUser?.email?.split("@")[0] || "";

                                // Remove all trailing digits or special chars (like ., _, - etc.)
                                username = username.replace(/[\d\W]+$/g, "");

                                // Capitalize first letter
                                return username.charAt(0).toUpperCase() + username.slice(1);
                            })()}
                        </p>
                        <button
                            onClick={handleLogout}
                            className="mt-1 text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Log out
                        </button>
                        <p className="text-gray-500 text-[10px] sm:text-xs">{currentUser?.email}</p>
                    </div>
                    <IoIosArrowDown className="text-gray-600 cursor-pointer text-base sm:text-xl" />
                </div>
            </aside>

            {/* Overlay for small screens */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <main className="
                flex-1 p-4 sm:p-8 lg:ml-64 
                lg:max-w-[2000px] 
                md:max-w-[750px] 
                sm:max-w-[600px] 
                max-w-sm mx-auto

                max-[480px]:max-w-[370px]
                max-[350px]:max-w-[300px]"
            >

                {/* Heading + Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
                    {/* Mobile: hamburger + heading */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            className="p-2 rounded-md focus:outline-none focus:ring bg-white shadow lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <HiMenu className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-semibold flex-1 mt-4     text-center lg:text-left lg:text-2xl">
                            Hello {" "}
                            {(() => {
                                let username = currentUser?.email?.split("@")[0] || "";

                                // Remove all trailing digits or special chars (like ., _, - etc.)
                                username = username.replace(/[\d\W]+$/g, "");

                                // Capitalize first letter
                                return username.charAt(0).toUpperCase() + username.slice(1);
                            })()} 👋🏻
                        </h1>
                    </div>

                    {/* Search Bar */}
                    <div className="flex items-center bg-white rounded-lg px-4 py-2 w-full lg:w-64 shadow-sm border border-gray-200">
                        <FaSearch className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ml-2 flex-1 bg-transparent focus:outline-none focus:ring-0 text-sm placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6">
                    {/* Your Purchases */}
                    <div className="flex flex-col md:flex-col lg:flex-row justify-between gap-4">
                        <div className="text-xl font-semibold text-nowrap text-center mt-2">
                            Your Purchases
                        </div>

                        {/* Search + Sort */}
                        <div className="flex max-w-[300px] md:max-w-[1000px] flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                            {/* search */}
                            {/* <div className="flex items-center bg-[#f8f9fd] rounded-lg px-4 py-2 w-full lg:w-64 shadow-sm border border-gray-200">
                                <FaSearch className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search programs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="ml-2 flex-1 bg-transparent focus:outline-none focus:ring-0 text-sm placeholder-gray-400"
                                />
                            </div> */}

                            {/* sort */}
                            <div className="relative w-full lg:w-auto" ref={sortRef}>
                                <button
                                    type="button"
                                    onClick={() => setSortOpen((o) => !o)}
                                    className="flex items-center justify-center w-full lg:w-auto bg-[#f8f9fd] rounded-lg px-4 py-2 cursor-pointer shadow-sm border border-gray-200"
                                >
                                    <span className="text-sm">
                                        Sort by: <b>{sortBy === 'newest' ? 'Newest' : 'Oldest'}</b>
                                    </span>
                                    <FaChevronDown className={`ml-2 text-gray-500 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {sortOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                        <button
                                            type="button"
                                            onClick={() => { setSortBy('newest'); setSortOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortBy === 'newest' ? 'text-[#C16A00] font-semibold' : 'text-gray-700'}`}
                                        >
                                            Newest
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSortBy('oldest'); setSortOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortBy === 'oldest' ? 'text-[#C16A00] font-semibold' : 'text-gray-700'}`}
                                        >
                                            Oldest
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto lg:text-nowrap mt-12">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C16A00]"></div>
                                <span className="ml-3 text-gray-600">Loading your programs...</span>
                            </div>
                        ) : filteredPrograms.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-lg mb-2">📚</div>
                                <p className="text-gray-600 text-lg font-medium">No programs found</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    {searchTerm ? "Try adjusting your search terms" : "You haven't purchased any programs yet"}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                                <thead className="bg-white border-b">
                                    <tr className="text-[#B5B7C0]">
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">Session Name</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">Date</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">Category</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">Price</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">Payment Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPrograms.map((program, i) => {
                                        const formattedProgram = formatProgramData(program);
                                        const type = (program.type || program.category || '').toLowerCase();
                                        const isLiveOrGuide = type === 'live' || type === 'guide';
                                        const isRecorded = type === 'recorded' || type === 'recordedsession' || type === 'recorded_session';
                                        const isRetreat = type === 'retreat' || type === 'retreats';
                                        return (
                                            <tr key={i} className="border-b hover:bg-gray-50">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm" title={formattedProgram.session}>
                                                    {formattedProgram.session.length > 25
                                                        ? `${formattedProgram.session.substring(0, 25)}...`
                                                        : formattedProgram.session}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">{formattedProgram.date}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">{formattedProgram.category}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm">
                                                    ₹
                                                    {Number(formattedProgram.price).toLocaleString("en-IN", {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <StatusBadge status={formattedProgram.status} />
                                                </td>
                                                {/* action button */}
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="flex justify-end">
                                                        {isLiveOrGuide && (
                                                            <button
                                                                onClick={() => handleOpenProgram(program)}
                                                                className="px-2 sm:px-3 py-1 sm:py-2 rounded-md bg-[#2F6288] text-white text-xs sm:text-sm hover:bg-[#224b66]"
                                                            >
                                                                <span className="hidden sm:inline">View & </span>Join
                                                            </button>
                                                        )}
                                                        {isRecorded && (
                                                            <button
                                                                onClick={() => handleOpenProgram(program)}
                                                                className="px-2 sm:px-3 py-1 sm:py-2 rounded-md bg-[#C16A00] text-white text-xs sm:text-sm hover:bg-[#a85b00]"
                                                            >
                                                                Watch<span className="hidden sm:inline"> Now</span>
                                                            </button>
                                                        )}
                                                        {isRetreat && (
                                                            <span className="text-xs text-gray-500">Details shared</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredPrograms.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3 px-2">
                            <span className="text-[#B5B7C0] text-sm text-center sm:text-left">
                                Showing {filteredPrograms.length} of {userPrograms.length} {userPrograms.length === 1 ? 'program' : 'programs'}
                                {searchTerm && ` matching "${searchTerm}"`}
                            </span>
                            {filteredPrograms.length > 10 && (
                                <Pagination totalPages={Math.ceil(filteredPrograms.length / 10)} />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
