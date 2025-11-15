import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, setDoc, where, } from 'firebase/firestore';
import { Calendar, Users, CheckCircle, Clock, Video, TrendingUp } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

function Home({ organizerUid }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [organizerDocId, setOrganizerDocId] = useState('');
    const [programs, setPrograms] = useState([]); // [{programId, title, mode, users: []}]
    const organizer = useSelector(state => state.organizerAuth?.organizer);
    const isAdmin = useSelector(state => state.adminAuth?.isAuthenticated);
    const navigate = useNavigate();

    // Calculate counts
    const counts = useMemo(() => {
        const allSlots = programs.flatMap(p => Array.isArray(p.slots) ? p.slots : []);
        const scheduled = allSlots.length;
        const conducted = allSlots.filter(s => (s?.status || '').toLowerCase() === 'completed').length;
        const pending = Math.max(0, scheduled - conducted);
        const users = programs.reduce((acc, p) => acc + (Number(p.usersCount || 0)), 0);
        return { scheduled, conducted, pending, users };
    }, [programs]);

    // Load organiser + programs
    useEffect(() => {
        let isMounted = true;
    
        async function load() {
            try {
                setLoading(true);
                setError('');
    
                let orgDoc = null;
                let orgDocId = '';
    
                // If admin is accessing with uid parameter, use that directly
                if (isAdmin && organizerUid) {
                    const docRef = doc(db, 'organizers', organizerUid);
                    const docSnap = await getDoc(docRef);
                    
                    if (!docSnap.exists()) {
                        throw new Error('Organizer not found.');
                    }
                    
                    orgDoc = docSnap;
                    orgDocId = docSnap.id;
                } else {
                    // Regular organizer auth flow (Redux)
                    if (!organizer) {
                        throw new Error('Please sign in as an organizer to view the dashboard.');
                    }
        
                    // Find organizer doc by email, fallback to name
                    let orgSnap = null;
                    if (organizer.email) {
                        orgSnap = await getDocs(
                            query(collection(db, 'organizers'), where('email', '==', organizer.email))
                        );
                    }
                    if ((!orgSnap || orgSnap.empty) && organizer.name) {
                        orgSnap = await getDocs(
                            query(collection(db, 'organizers'), where('name', '==', organizer.name))
                        );
                    }
                    if (!orgSnap || orgSnap.empty) {
                        throw new Error('No organizer profile found for this account.');
                    }
        
                    orgDoc = orgSnap.docs[0];
                    orgDocId = orgDoc.id;
                }
    
                if (!isMounted) return;
                setOrganizerDocId(orgDocId);
    
                const orgData = orgDoc.data() || {};
    
                const aggregated = [];
    
                // Get programs array
                const programsArray = Array.isArray(orgData.programs) ? orgData.programs : [];
    
                // Process each program
                for (const program of programsArray) {
                    if (!program || typeof program !== 'object') continue;
    
                    // Get users array
                    const usersArray = Array.isArray(program.users) ? program.users : [];
                    const usersCount = usersArray.length;
    
                    // Collect all slots from all users
                    const allSlots = [];
    
                    for (const user of usersArray) {
                        if (!user || typeof user !== 'object') continue;
    
                        const userName = user.name || '';
                        const userEmail = user.email || '';
                        const userId = user.userId || '';
    
                        // Collect slots from user
                        if (Array.isArray(user.slots)) {
                            const slotsForUser = user.slots.map(slot => ({
                                ...slot,
                                userName,
                                userEmail,
                                userId,
                                status: (slot.status || 'pending').toLowerCase(),
                            }));
                            allSlots.push(...slotsForUser);
                        }
                    }
    
                    aggregated.push({
                        programId: program.programId || '',
                        title: program.title || 'Untitled',
                        category: program.category || '',
                        mode: program.mode || '',
                        price: program.price || '',
                        slots: allSlots,
                        usersCount: usersCount,
                        users: usersArray
                    });
                }
    
                if (isMounted) {
                    setPrograms(aggregated);
                }
            } catch (e) {
                console.error('Organizer dashboard load failed', e);
                if (isMounted) setError(e?.message || 'Failed to load dashboard');
            } finally {
                if (isMounted) setLoading(false);
            }
        }
    
        load();
        return () => {
            isMounted = false;
        };
    }, [organizer, isAdmin, organizerUid]);    

    // Mark slot as completed - updates programs[] array structure
    async function markCompleted(programId, userId, slot) {
        try {
            
            if (!organizerDocId) {
                console.error("No organizerDocId found");
                showError("Organizer ID not found");
                return;
            }
            const orgRef = doc(db, "organizers", organizerDocId);
            const orgSnap = await getDoc(orgRef);
            
            if (!orgSnap.exists()) {
                console.error("Organizer document does not exist");
                showError("Organizer document not found");
                return;
            }
    
            const orgData = orgSnap.data();
            const programsArray = Array.isArray(orgData.programs) ? orgData.programs : [];
            
            // Find the program
            const programIndex = programsArray.findIndex(p => p.programId === programId);
            if (programIndex === -1) {
                console.error("Program not found:", programId);
                showError("Program not found");
                return;
            }
            
            const program = { ...programsArray[programIndex] };
            const usersArray = Array.isArray(program.users) ? program.users : [];
            
            // Find the user
            const userIndex = usersArray.findIndex(u => u.userId === userId);
            if (userIndex === -1) {
                console.error("User not found:", userId);
                showError("User not found in program");
                return;
            }
            
            const user = { ...usersArray[userIndex] };
            const slotsArray = Array.isArray(user.slots) ? user.slots : [];
            
            // Find the slot to update
            const slotIndex = slotsArray.findIndex(
                s => s.date === slot.date && s.startTime === slot.startTime && s.endTime === slot.endTime
            );
    
            if (slotIndex === -1) {
                console.error("Slot not found for update");
                showError("Session slot not found");
                return;
            }
            
            // Update the slot
            slotsArray[slotIndex] = {
                ...slotsArray[slotIndex],
                status: "completed",
                completedAt: new Date().toISOString(),
            };
            
            // Update user with new slots
            user.slots = slotsArray;
            usersArray[userIndex] = user;
            
            // Update program with new users
            program.users = usersArray;
            programsArray[programIndex] = program;
            
            // Update the entire programs array
            await updateDoc(orgRef, {
                programs: programsArray
            });
            
            // Update local UI
            setPrograms(prev =>
                prev.map(p => {
                    if (p.programId === programId) {
                        return {
                            ...p,
                            slots: p.slots.map(s =>
                                s.date === slot.date &&
                                s.startTime === slot.startTime &&
                                s.endTime === slot.endTime &&
                                s.userId === userId
                                    ? { ...s, status: "completed", completedAt: new Date().toISOString() }
                                    : s
                            ),
                            users: usersArray
                        };
                    }
                    return p;
                })
            );
    
            showSuccess("Session marked as completed ✅");
            
        } catch (e) {
            console.error("💥 Error in markCompleted:", e);
            showError(`Failed to update session status: ${e.message}`);
        }
    }    

    // Render states
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                    <div className="text-red-500 text-center">
                        <p className="text-lg font-semibold mb-2">Error</p>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        Organizer Dashboard
                    </h1>
                    <p className="text-gray-600">Welcome back! Here's your overview</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div 
                        onClick={() => navigate('/organizer/users')}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 opacity-80" />
                            <TrendingUp className="w-5 h-5 opacity-60" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{counts.users}</div>
                        <div className="text-blue-100 text-sm">Users Enrolled</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <Calendar className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{counts.scheduled}</div>
                        <div className="text-purple-100 text-sm">Sessions Scheduled</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{counts.conducted}</div>
                        <div className="text-green-100 text-sm">Sessions Conducted</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{counts.pending}</div>
                        <div className="text-orange-100 text-sm">Pending Sessions</div>
                    </div>
                </div>

                {/* Programs List */}
                <div className="space-y-6">
                    {programs.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No programs found</p>
                            <p className="text-gray-400 text-sm mt-2">Your programs will appear here once users enroll</p>
                        </div>
                    ) : (
                        programs.map(program => {
                            const programSlots = program.slots || [];
                            const completedSlots = programSlots.filter(s => s.status === 'completed').length;
                            const pendingSlots = programSlots.length - completedSlots;

                            return (
                                <div key={program.programId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    {/* Program Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-orange-500 p-6 text-white">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <h2 className="text-2xl font-bold mb-2">{program.title}</h2>
                                                <div className="flex flex-wrap gap-3 text-sm">
                                                    <span className="bg-white/20 px-3 py-1 rounded-full">
                                                        {program.category}
                                                    </span>
                                                    {program.subscriptionType && (
                                                        <span className="bg-white/20 px-3 py-1 rounded-full capitalize">
                                                            {program.subscriptionType}
                                                        </span>
                                                    )}
                                                    <span className="bg-white/20 px-3 py-1 rounded-full">
                                                        <Users className="w-4 h-4 inline mr-1" />
                                                        {program.usersCount} Users
                                                    </span>
                                                </div>
                                            </div>
                                            {program.meetLink && (
                                                <a
                                                    href={program.meetLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2 justify-center"
                                                >
                                                    <Video className="w-5 h-5" />
                                                    Join Meeting
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Program Stats */}
                                    <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-800">{programSlots.length}</div>
                                            <div className="text-sm text-gray-600">Total Sessions</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{completedSlots}</div>
                                            <div className="text-sm text-gray-600">Completed</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">{pendingSlots}</div>
                                            <div className="text-sm text-gray-600">Pending</div>
                                        </div>
                                    </div>

                                    {/* Sessions List */}
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Scheduled Sessions</h3>
                                        {programSlots.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8">No sessions scheduled yet</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {programSlots.map((slot, index) => {
                                                    const isCompleted = (slot.status || '').toLowerCase() === 'completed';
                                                    
                                                    // Format date and time
                                                    const formatDateTime = (date, time) => {
                                                        if (!date || !time) return { dateStr: 'No date', timeStr: 'No time' };
                                                        
                                                        try {
                                                            // Parse time range (could be "01:00 - 14:00" or ISO format)
                                                            let startTime, endTime;
                                                            
                                                            if (time.includes('T')) {
                                                                // ISO format: "2025-10-01T13:00:00+05:30 - 2025-10-01T14:00:00+05:30"
                                                                const [startISO, endISO] = time.split(' - ');
                                                                const startDate = new Date(startISO);
                                                                const endDate = new Date(endISO);
                                                                
                                                                // Format date as "12th Aug 2025"
                                                                const day = startDate.getDate();
                                                                const suffix = day === 1 || day === 21 || day === 31 ? 'st' 
                                                                    : day === 2 || day === 22 ? 'nd'
                                                                    : day === 3 || day === 23 ? 'rd' : 'th';
                                                                const month = startDate.toLocaleDateString('en-IN', { month: 'short' });
                                                                const year = startDate.getFullYear();
                                                                const dateStr = `${day}${suffix} ${month} ${year}`;
                                                                
                                                                // Format time in 12-hour AM/PM format
                                                                const formatTime12Hr = (d) => {
                                                                    let hours = d.getHours();
                                                                    const minutes = d.getMinutes().toString().padStart(2, '0');
                                                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                    hours = hours % 12 || 12;
                                                                    return `${hours}:${minutes} ${ampm}`;
                                                                };
                                                                
                                                                const timeStr = `${formatTime12Hr(startDate)} - ${formatTime12Hr(endDate)}`;
                                                                
                                                                return { dateStr, timeStr };
                                                            } else {
                                                                // Simple format: "01:00 - 14:00"
                                                                [startTime, endTime] = time.split(' - ');
                                                                
                                                                // Format date as "12th Aug 2025"
                                                                const dateObj = new Date(date);
                                                                const day = dateObj.getDate();
                                                                const suffix = day === 1 || day === 21 || day === 31 ? 'st' 
                                                                    : day === 2 || day === 22 ? 'nd'
                                                                    : day === 3 || day === 23 ? 'rd' : 'th';
                                                                const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
                                                                const year = dateObj.getFullYear();
                                                                const dateStr = `${day}${suffix} ${month} ${year}`;
                                                                
                                                                // Convert 24hr to 12hr format
                                                                const convert12Hr = (time24) => {
                                                                    const [h, m] = time24.split(':');
                                                                    let hours = parseInt(h);
                                                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                    hours = hours % 12 || 12;
                                                                    return `${hours}:${m} ${ampm}`;
                                                                };
                                                                
                                                                const timeStr = `${convert12Hr(startTime)} - ${convert12Hr(endTime)}`;
                                                                
                                                                return { dateStr, timeStr };
                                                            }
                                                        } catch (e) {
                                                            console.error('Date formatting error:', e);
                                                            return { dateStr: date || 'No date', timeStr: time || 'No time' };
                                                        }
                                                    };
                                                    
                                                    // Combine startTime and endTime into expected format
                                                    const timeString = slot.startTime && slot.endTime 
                                                        ? `${slot.startTime} - ${slot.endTime}` 
                                                        : null;
                                                    const { dateStr, timeStr } = formatDateTime(slot.date, timeString);
                                                    
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`border rounded-lg p-4 transition-all ${
                                                                isCompleted
                                                                    ? 'bg-green-50 border-green-200'
                                                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                                            }`}
                                                        >
                                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                                {/* name time date */}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                                                        <span className="font-semibold text-gray-800">{slot.userName || 'User'}</span>
                                                                        <span className="text-sm text-gray-500">{slot.userEmail}</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 ml-5">
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar className="w-4 h-4" />
                                                                            {dateStr}
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Clock className="w-4 h-4" />
                                                                            {timeStr}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* button */}
                                                                <div className="flex items-center gap-3">
                                                                    {isCompleted ? (
                                                                        <span className="flex items-center gap-2 text-green-600 font-semibold">
                                                                            <CheckCircle className="w-5 h-5" />
                                                                            Completed
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => markCompleted(program.programId, slot.userId, slot)}
                                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                                                                        >
                                                                            <CheckCircle className="w-4 h-4" />
                                                                            Mark Complete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;
