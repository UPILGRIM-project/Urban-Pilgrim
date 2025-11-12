import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAdmin } from "../../features/adminAuthSlice";
import { showSuccess } from "../../utils/toast";

export default function Sidebar({ activeSection, setActiveSection }) {
    const [isOpen, setIsOpen] = useState(false);
    const dispatch = useDispatch();
    const { admin } = useSelector((state) => state.adminAuth);

    const menu = [
        { name: "Home Page", key: "home" },
        { name: "Pilgrim retreats", key: "retreats" },
        { name: "Pilgrim Wellness Program", key: "sessions" },
        { name: "Workshops", key: "workshops" },
        { name: "Pilgrim Guides", key: "guides" },
        { name: "Upcoming Events", key: "events" },
        { name: "Organizer", key: "organizer" },
        { name: "Coupons", key: "coupons" },
        { name: "Analytics", key: "analysis" },
    ];

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const handleMenuClick = (key) => {
        setActiveSection(key);
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            setIsOpen(false);
        }
    };

    const handleLogout = () => {
        dispatch(clearAdmin());
        showSuccess("Admin logged out successfully!");
    };

    return (
        <>
            <button
                onClick={toggleSidebar}
                className="md:hidden relative h-10 w-10 z-50 p-2 m-4 bg-[#0c3c60] text-white rounded-lg shadow-lg"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={`md:w-64 w-full h-screen bg-[#fff] border-r border-black/20 fixed z-40 transition-transform duration-300 ease-in-out flex flex-col
                ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
            >
                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Admin Info */}
                    <div className="mt-[40px] md:mt-[20px] mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[rgb(47,98,136)] rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {admin?.email || 'Admin'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {admin?.role || 'Administrator'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Menu */}
                    <div className="space-y-2 pb-4">
                        {menu.map(({ name, key }) => (
                            <button
                                key={key}
                                onClick={() => handleMenuClick(key)}
                                className={`flex items-center gap-3 p-3 rounded-full w-full text-left transition-colors
                                ${activeSection === key ? "bg-[#fceee3] text-[#0c3c60]" : "text-gray-600"}
                                hover:bg-[#fceee3]`}
                            >
                                <img src={`/assets/admin/${key}.svg`} alt={`${name} icon`} className="w-6 h-6" />
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Logout Button - Fixed at Bottom */}
                <div className="border-t border-gray-200 p-5 bg-white">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 p-3 rounded-full w-full text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
}
