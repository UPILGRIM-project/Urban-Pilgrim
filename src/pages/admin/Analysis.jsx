import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { fetchAllEvents } from '../../utils/fetchEvents';
import { db } from '../../services/firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';

const Analysis = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('Current Year');
    const [allEvents, setAllEvents] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allPurchases, setAllPurchases] = useState([]); // flattened yourPrograms from all users

    // Fetch events data on component mount
    useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoading(true);
                const eventsData = await fetchAllEvents();
                setAllEvents(eventsData);
                // Fetch all users' purchases from collection group 'info' and pick 'details' docs
                try {
                    const cgSnap = await getDocs(collectionGroup(db, 'info'));
                    const purchases = [];
                    cgSnap.forEach((docSnap) => {
                        if (docSnap.id === 'details') {
                            const data = docSnap.data() || {};
                            const programs = Array.isArray(data.yourPrograms) ? data.yourPrograms : [];
                            // derive user id from path: users/{uid}/info/details
                            const userId = docSnap.ref?.parent?.parent?.id || data.uid || '';
                            const userEmail = data.email || '';
                            programs.forEach(p => purchases.push({ ...p, _uid: userId, _email: userEmail }));
                        }
                    });
                    setAllPurchases(purchases);
                } catch (pErr) {
                    console.error('Failed to load user purchases:', pErr);
                    setAllPurchases([]);
                }
                setError(null);
            } catch (err) {
                console.error('Error loading events:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, []);

    // Process events data into analytics format
    const processEventsData = () => {
        const eventsByType = {
            retreat: [],
            'live-session': [],
            'recorded-session': [],
            guide: []
        };

        // Group events by type
        Object.values(allEvents).forEach(event => {
            if (eventsByType[event.type]) {
                eventsByType[event.type].push(event);
            }
        });

        // Helper: determine number of sessions/programs purchased for an event
        const getSessionCount = (event) => {
            // For session counting: each event typically represents 1 session
            // But we need to check if there are multiple sessions in one event
            const od = event?.originalData || {};
            
            // Check if there's a session count or quantity
            if (typeof od?.sessionCount === 'number') return od.sessionCount;
            if (typeof od?.quantity === 'number') return od.quantity;
            if (typeof event?.sessionCount === 'number') return event.sessionCount;
            if (typeof event?.quantity === 'number') return event.quantity;
            
            // If no specific session count, assume 1 session per event (if it has purchases)
            return getPurchaseCount(event) > 0 ? 1 : 0;
        };

        // Helper: determine number of users who purchased an event
        const getPurchaseCount = (event) => {
            // Try several shapes where the purchase/user count might live
            const od = event?.originalData || {};
            const pu = od?.purchasedUsers || event?.purchasedUsers || {};
            
            // Handle different data structures
            if (Array.isArray(pu)) {
                return pu.length; // If it's an array, return the length
            } else if (typeof pu === 'object' && pu !== null) {
                // If it's an object, try different properties
                if (typeof pu.count === 'number') {
                    return pu.count;
                }
                if (typeof pu.totalUsers === 'number') {
                    return pu.totalUsers;
                }
                if (Array.isArray(pu.users)) {
                    return pu.users.length;
                }
            } else if (typeof pu === 'number') {
                return pu; // If it's already a number
            }
            
            // Fallback: check if there are any buyers/purchasers arrays
            if (Array.isArray(event?.buyers)) {
                return event.buyers.length;
            }
            if (Array.isArray(event?.purchasedUsers)) {
                return event.purchasedUsers.length;
            }
            
            return 0; // No purchases found
        };

        // Parse a price value (number or currency string) to number
        const parsePrice = (raw) => {
            if (typeof raw === 'number') return raw;
            if (raw == null) return 0;
            const n = parseFloat(String(raw).replace(/[^\d.\-]/g, ''));
            return Number.isFinite(n) ? n : 0;
        };

        // Sum programs[].price for a purchase entry
        const sumProgramsPrices = (entry) => {
            try {
                const programs = entry?.programs;
                if (Array.isArray(programs)) {
                    return programs.reduce((acc, p) => acc + parsePrice(p?.price ?? p?.amount ?? 0), 0);
                }
                // Fallback if a single price is present on entry
                return parsePrice(entry?.price ?? entry?.amount ?? 0);
            } catch {
                return 0;
            }
        };

        // Compute total revenue for an event by summing all purchased entries' program prices (rarely present in our data)
        const getEventRevenue = (event) => {
            const od = event?.originalData || {};
            let revenue = 0;

            // 1) purchasedUsers could be an array
            if (Array.isArray(od?.purchasedUsers)) {
                revenue += od.purchasedUsers.reduce((acc, u) => acc + sumProgramsPrices(u), 0);
            }
            // 2) purchasedUsers could be an object with users array
            if (od?.purchasedUsers && Array.isArray(od.purchasedUsers.users)) {
                revenue += od.purchasedUsers.users.reduce((acc, u) => acc + sumProgramsPrices(u), 0);
            }
            // 3) event-level purchasedUsers array
            if (Array.isArray(event?.purchasedUsers)) {
                revenue += event.purchasedUsers.reduce((acc, u) => acc + sumProgramsPrices(u), 0);
            }
            // 4) buyers array fallback
            if (Array.isArray(od?.buyers)) {
                revenue += od.buyers.reduce((acc, u) => acc + sumProgramsPrices(u), 0);
            }

            return revenue;
        };

        // Normalize purchase type to our section keys
        const normalizePurchaseType = (t) => {
            const s = String(t || '').toLowerCase();
            if (s.includes('live')) return 'live-session';
            if (s.includes('record')) return 'recorded-session';
            if (s.includes('guide')) return 'guide';
            if (s.includes('retreat')) return 'retreat';
            if (s.includes('session')) return 'live-session';
            return s;
        };

        // Parse purchase date
        const getPurchaseDate = (p) => {
            const d = p?.purchaseDate || p?.purchasedAt || p?.timestamp || p?.date;
            return new Date(d);
        };

        // Generate monthly data for each type
        const generateMonthlyData = (events, type, selectedYear) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const targetYear = selectedYear || new Date().getFullYear();

            return months.map(month => {
                const monthIndex = months.indexOf(month);
                const monthEvents = events.filter(event => {
                    const eventDate = new Date(event.createdAt);
                    const eventMonth = eventDate.getMonth();
                    const eventYear = eventDate.getFullYear();
                    
                    return eventMonth === monthIndex && eventYear === targetYear;
                });

                // Count TOTAL sessions purchased for this event type and compute revenue
                let totalSessions = 0;
                let totalRevenue = 0;
                const uniqueUserIds = new Set();
                
                monthEvents.forEach(e => {
                    const od = e?.originalData || {};
                    const pu = od?.purchasedUsers || e?.purchasedUsers || {};
                    // Count sessions from this event (for programs KPI)
                    const sessionCount = getPurchaseCount(e);
                    totalSessions += sessionCount;

                    // Event-level revenue (usually 0 in our current dataset)
                    // kept for compatibility but the final monthly revenue will come from user purchases below
                    const revenue = getEventRevenue(e);
                    totalRevenue += revenue;
                    
                    // Extract unique user IDs for this event type only
                    if (Array.isArray(pu)) {
                        pu.forEach(user => {
                            const userId = user?.id || user?.userId || user?.uid || user?.email || user;
                            if (userId) {
                                uniqueUserIds.add(userId);
                            }
                        });
                    } else if (typeof pu === 'object' && pu !== null && Array.isArray(pu.users)) {
                        pu.users.forEach(user => {
                            const userId = user?.id || user?.userId || user?.uid || user?.email || user;
                            if (userId) {
                                uniqueUserIds.add(userId);
                            }
                        });
                    } else if (Array.isArray(e?.buyers)) {
                        e.buyers.forEach(user => {
                            const userId = user?.id || user?.userId || user?.uid || user?.email || user;
                            if (userId) {
                                uniqueUserIds.add(userId);
                            }
                        });
                    } else if (Array.isArray(e?.purchasedUsers)) {
                        e.purchasedUsers.forEach(user => {
                            const userId = user?.id || user?.userId || user?.uid || user?.email || user;
                            if (userId) {
                                uniqueUserIds.add(userId);
                            }
                        });
                    }
                });
                
                // Replace revenue with sum from user purchase data for this type and month
                const purchasesForMonth = (allPurchases || []).filter(p => {
                    const rawType = p?.type || p?.programType || p?.category || p?.programCategory;
                    const pt = normalizePurchaseType(rawType);
                    const pd = getPurchaseDate(p);
                    return pt === type && pd.getMonth() === monthIndex && pd.getFullYear() === targetYear;
                });
                const purchaseRevenue = purchasesForMonth.reduce((sum, p) => sum + parsePrice(p?.price ?? p?.amount ?? 0), 0);
                totalRevenue = purchaseRevenue;

                // Unique users from purchases
                const uniquePurchaseUserIds = new Set();
                purchasesForMonth.forEach(p => {
                    const id = p?._uid || p?.uid || p?.userId || p?.email || p?._email || p?.orderId || p?.paymentId;
                    if (id) {
                        uniquePurchaseUserIds.add(String(id));
                    } else {
                        console.warn('Purchase without identifiable user/order id:', p);
                    }
                });

                const programsPurchased = totalSessions;
                const usersPurchased = uniquePurchaseUserIds.size;

                return {
                    month,
                    // programs represents how many programs/sessions were purchased
                    programs: programsPurchased,
                    // users represents total users who purchased
                    users: usersPurchased,
                    // revenue generated for this month
                    revenue: totalRevenue
                };
            });
        };

        // Determine which year to show based on selectedPeriod
        const getYearFromPeriod = (period) => {
            const currentYear = new Date().getFullYear();
            if (period === 'Last Year') {
                return currentYear - 1;
            }
            return currentYear; // Current Year
        };

        const targetYear = getYearFromPeriod(selectedPeriod);

        return {
            retreat: generateMonthlyData(eventsByType.retreat, 'retreat', targetYear),
            liveSession: generateMonthlyData(eventsByType['live-session'], 'live-session', targetYear),
            recordedSession: generateMonthlyData(eventsByType['recorded-session'], 'recorded-session', targetYear),
            guide: generateMonthlyData(eventsByType.guide, 'guide', targetYear)
        };
    };

    // Get processed data or fallback to sample data
    const processedData = Object.keys(allEvents).length > 0 ? processEventsData() : {
        retreat: [
            { month: 'Jan', programs: 12, users: 120 },
            { month: 'Feb', programs: 18, users: 180 },
            { month: 'Mar', programs: 22, users: 220 },
            { month: 'Apr', programs: 19, users: 190 },
            { month: 'May', programs: 28, users: 280 },
            { month: 'Jun', programs: 38, users: 380 },
            { month: 'Jul', programs: 24, users: 240 },
            { month: 'Aug', programs: 21, users: 210 },
            { month: 'Sep', programs: 18, users: 180 },
            { month: 'Oct', programs: 22, users: 220 },
            { month: 'Nov', programs: 26, users: 260 },
            { month: 'Dec', programs: 32, users: 320 }
        ],
        liveSession: [
            { month: 'Jan', programs: 24, users: 240 },
            { month: 'Feb', programs: 28, users: 280 },
            { month: 'Mar', programs: 32, users: 320 },
            { month: 'Apr', programs: 29, users: 290 },
            { month: 'May', programs: 38, users: 380 },
            { month: 'Jun', programs: 42, users: 420 },
            { month: 'Jul', programs: 36, users: 360 },
            { month: 'Aug', programs: 31, users: 310 },
            { month: 'Sep', programs: 28, users: 280 },
            { month: 'Oct', programs: 32, users: 320 },
            { month: 'Nov', programs: 36, users: 360 },
            { month: 'Dec', programs: 40, users: 400 }
        ],
        recordedSession: [
            { month: 'Jan', programs: 18, users: 180 },
            { month: 'Feb', programs: 22, users: 220 },
            { month: 'Mar', programs: 26, users: 260 },
            { month: 'Apr', programs: 23, users: 230 },
            { month: 'May', programs: 32, users: 320 },
            { month: 'Jun', programs: 36, users: 360 },
            { month: 'Jul', programs: 28, users: 280 },
            { month: 'Aug', programs: 25, users: 250 },
            { month: 'Sep', programs: 22, users: 220 },
            { month: 'Oct', programs: 26, users: 260 },
            { month: 'Nov', programs: 30, users: 300 },
            { month: 'Dec', programs: 34, users: 340 }
        ],
        guide: [
            { month: 'Jan', programs: 8, users: 80 },
            { month: 'Feb', programs: 12, users: 120 },
            { month: 'Mar', programs: 16, users: 160 },
            { month: 'Apr', programs: 13, users: 130 },
            { month: 'May', programs: 20, users: 200 },
            { month: 'Jun', programs: 24, users: 240 },
            { month: 'Jul', programs: 18, users: 180 },
            { month: 'Aug', programs: 15, users: 150 },
            { month: 'Sep', programs: 12, users: 120 },
            { month: 'Oct', programs: 16, users: 160 },
            { month: 'Nov', programs: 20, users: 200 },
            { month: 'Dec', programs: 22, users: 220 }
        ]
    };

    const retreatData = processedData.retreat;

    // Extract data for each section
    const liveSessionData = processedData.liveSession;
    const recordedSessionData = processedData.recordedSession;
    const guideData = processedData.guide;

    // Calculate totals and growth
    const calculateGrowth = (data) => {
        if (data.length < 2) return 0;
        const lastMonth = data[data.length - 1];
        const prevMonth = data[data.length - 2];
        if (prevMonth.revenue === 0) return 0;
        return Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100);
    };

    const calculateUserGrowth = (data) => {
        if (data.length < 2) return 0;
        const lastMonth = data[data.length - 1];
        const prevMonth = data[data.length - 2];
        if (prevMonth.users === 0) return 0;
        return Math.round(((lastMonth.users - prevMonth.users) / prevMonth.users) * 100);
    };

    // Generic growth calculator for any numeric key
    const calculateGrowthForKey = (data, key) => {
        if (!Array.isArray(data) || data.length < 2) return 0;
        const last = Number(data[data.length - 1]?.[key] || 0);
        const prev = Number(data[data.length - 2]?.[key] || 0);
        if (prev === 0) return 0;
        return Math.round(((last - prev) / prev) * 100);
    };

    // Retreat totals
    const totalRetreatPrograms = retreatData.reduce((sum, item) => sum + (item.programs || 0), 0);
    const totalRetreatUsers = retreatData.reduce((sum, item) => sum + (item.users || 0), 0);
    const retreatProgramsGrowth = calculateGrowthForKey(retreatData, 'programs');
    const retreatUsersGrowth = calculateGrowthForKey(retreatData, 'users');
    // Revenue totals for retreats
    const totalRetreatRevenue = retreatData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const retreatRevenueGrowth = calculateGrowthForKey(retreatData, 'revenue');

    // Live Sessions totals
    const totalLivePrograms = liveSessionData.reduce((sum, item) => sum + (item.programs || 0), 0);
    // Derive total unique purchasers from purchases (for the selected year)
    const currentYear = (() => { const d = new Date(); return selectedPeriod === 'Last Year' ? d.getFullYear() - 1 : d.getFullYear(); })();
    const livePurchasers = new Set(
        (allPurchases || [])
            .filter(p => {
                const rawType = p?.type || p?.programType || p?.category || p?.programCategory;
                const pt = (String(rawType || '').toLowerCase().includes('record')) ? 'recorded-session' : (String(rawType || '').toLowerCase().includes('guide') ? 'guide' : (String(rawType || '').toLowerCase().includes('retreat') ? 'retreat' : 'live-session'));
                const d = new Date(p?.purchaseDate || p?.purchasedAt || p?.timestamp || p?.date);
                return pt === 'live-session' && d.getFullYear() === currentYear;
            })
            .map(p => String(p?._uid || p?.uid || p?.userId || p?.email || p?._email || p?.orderId || p?.paymentId))
            .filter(Boolean)
    );
    const totalLiveUsers = livePurchasers.size;
    const liveProgramsGrowth = calculateGrowthForKey(liveSessionData, 'programs');
    const liveUsersGrowth = calculateGrowthForKey(liveSessionData, 'users');
    const totalLiveRevenue = liveSessionData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const liveRevenueGrowth = calculateGrowthForKey(liveSessionData, 'revenue');

    // Recorded Sessions totals
    const totalRecordedPrograms = recordedSessionData.reduce((sum, item) => sum + (item.programs || 0), 0);
    const recordedPurchasers = new Set(
        (allPurchases || [])
            .filter(p => {
                const rawType = p?.type || p?.programType || p?.category || p?.programCategory;
                const s = String(rawType || '').toLowerCase();
                const pt = s.includes('record') ? 'recorded-session' : (s.includes('guide') ? 'guide' : (s.includes('retreat') ? 'retreat' : 'live-session'));
                const d = new Date(p?.purchaseDate || p?.purchasedAt || p?.timestamp || p?.date);
                return pt === 'recorded-session' && d.getFullYear() === currentYear;
            })
            .map(p => String(p?._uid || p?.uid || p?.userId || p?.email || p?._email || p?.orderId || p?.paymentId))
            .filter(Boolean)
    );
    const totalRecordedUsers = recordedPurchasers.size;
    const recordedProgramsGrowth = calculateGrowthForKey(recordedSessionData, 'programs');
    const recordedUsersGrowth = calculateGrowthForKey(recordedSessionData, 'users');
    const totalRecordedRevenue = recordedSessionData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const recordedRevenueGrowth = calculateGrowthForKey(recordedSessionData, 'revenue');

    // Guide totals
    const totalGuidePrograms = guideData.reduce((sum, item) => sum + (item.programs || 0), 0);
    const guidePurchasers = new Set(
        (allPurchases || [])
            .filter(p => {
                const rawType = p?.type || p?.programType || p?.category || p?.programCategory;
                const s = String(rawType || '').toLowerCase();
                const pt = s.includes('guide') ? 'guide' : (s.includes('record') ? 'recorded-session' : (s.includes('retreat') ? 'retreat' : 'live-session'));
                const d = new Date(p?.purchaseDate || p?.purchasedAt || p?.timestamp || p?.date);
                return pt === 'guide' && d.getFullYear() === currentYear;
            })
            .map(p => String(p?._uid || p?.uid || p?.userId || p?.email || p?._email || p?.orderId || p?.paymentId))
            .filter(Boolean)
    );
    const totalGuideUsers = guidePurchasers.size;
    const guideProgramsGrowth = calculateGrowthForKey(guideData, 'programs');
    const guideUsersGrowth = calculateGrowthForKey(guideData, 'users');
    const totalGuideRevenue = guideData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const guideRevenueGrowth = calculateGrowthForKey(guideData, 'revenue');

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                    <p className="text-sm text-gray-600 mb-1">{`${label}`}</p>
                    <p className="text-base font-semibold text-gray-900 m-0">
                        {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Show loading state
    if (loading) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 m-0">Analytics</h1>
                {Object.keys(allEvents).length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">Showing data from {Object.keys(allEvents).length} events</p>
                )}
            </div>

            {/* Pilgrim Retreats Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b-2 border-gray-200">Pilgrim Retreats</h2>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Generated Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Revenue Generated</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalRetreatRevenue.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{retreatRevenueGrowth}%</span>
                                    <span className="text-gray-500">revenue generated</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={retreatData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#374151"
                                        radius={[4, 4, 0, 0]}
                                        data={[retreatData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Users Who Purchased Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Users Who Purchased Retreats</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalRetreatUsers.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{retreatUsersGrowth}%</span>
                                    <span className="text-gray-500">users purchased</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={retreatData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="users"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="users"
                                        fill="#374151"
                                        radius={[4, 4, 0, 0]}
                                        data={[retreatData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Sessions Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b-2 border-gray-200">Live Sessions</h2>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Generated Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Revenue Generated</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalLiveRevenue?.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{liveRevenueGrowth}%</span>
                                    <span className="text-gray-500">revenue generated</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={liveSessionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#3B82F6"
                                        radius={[4, 4, 0, 0]}
                                        data={[liveSessionData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Users Who Purchased Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Users Who Purchased Sessions</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalLiveUsers.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{liveUsersGrowth}%</span>
                                    <span className="text-gray-500">users purchased</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={liveSessionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="users"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="users"
                                        fill="#3B82F6"
                                        radius={[4, 4, 0, 0]}
                                        data={[liveSessionData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recorded Sessions Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b-2 border-gray-200">Recorded Sessions</h2>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Generated Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Revenue Generated</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalRecordedRevenue.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{recordedRevenueGrowth}%</span>
                                    <span className="text-gray-500">revenue generated</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={recordedSessionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#8B5CF6"
                                        radius={[4, 4, 0, 0]}
                                        data={[recordedSessionData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Total Users Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Total Users</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalRecordedUsers.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{recordedUsersGrowth}%</span>
                                    <span className="text-gray-500">users purchased</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={recordedSessionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="users"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="users"
                                        fill="#8B5CF6"
                                        radius={[4, 4, 0, 0]}
                                        data={[recordedSessionData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guide Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b-2 border-gray-200">Guide</h2>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Generated Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Revenue Generated</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalGuideRevenue.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{guideRevenueGrowth}%</span>
                                    <span className="text-gray-500">revenue generated</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={guideData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#F59E0B"
                                        radius={[4, 4, 0, 0]}
                                        data={[guideData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Total Purchasers Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start mb-6 gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-700 m-0">Users Purchased Guide</h3>
                                <select
                                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="Current Year">Current Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>
                            <div className="text-right xl:text-right flex flex-col items-end gap-2">
                                <div className="text-3xl font-bold text-gray-900 leading-none">{totalGuideUsers.toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+{guideUsersGrowth}%</span>
                                    <span className="text-gray-500">users purchased</span>
                                </div>
                                <div className="mt-1">
                                    <svg width="60" height="20" viewBox="0 0 60 20">
                                        <path d="M0,15 Q15,10 30,8 T60,5" stroke="#10B981" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={guideData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#666' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="users"
                                        fill="#E5E7EB"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="users"
                                        fill="#F59E0B"
                                        radius={[4, 4, 0, 0]}
                                        data={[guideData[5]]} // Highlight June
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Analysis;