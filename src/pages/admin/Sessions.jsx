import { useState } from "react";
import { FaVideo, FaPlayCircle } from "react-icons/fa";
import LiveSessions2 from "../../components/admin/pilgrim_sessions/LiveSessions2";
import RecordedSession2 from "../../components/admin/pilgrim_sessions/RecordedSession2";
import {
    LiveSessionBookingsTable,
    RecordedSessionBookingsTable,
} from "../../components/admin/pilgrim_sessions/SessionBookings";

const TABS = [
    { key: "live", label: "Live Sessions", icon: FaVideo },
    { key: "recorded", label: "Recorded Sessions", icon: FaPlayCircle },
];

export default function Sessions() {
    const [active, setActive] = useState("live");

    return (
        <div className="p-4 md:p-6">
            {/* Page heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-[#2F6288] mb-1">
                Pilgrim Wellness Program
            </h1>
            <span className="block bg-[#2F6288] w-24 h-1 mb-6 rounded"></span>

            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActive(key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${active === key
                                ? "bg-white text-[#2F6288] shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <Icon className={active === key ? "text-[#2F6288]" : "text-gray-400"} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {active === "live" && (
                <>
                    <LiveSessions2 />
                    <div className="border rounded-xl shadow-sm bg-white mt-6">
                        <LiveSessionBookingsTable />
                    </div>
                </>
            )}

            {active === "recorded" && (
                <>
                    <RecordedSession2 />
                    <div className="border rounded-xl shadow-sm bg-white mt-6">
                        <RecordedSessionBookingsTable />
                    </div>
                </>
            )}
        </div>
    );
}


