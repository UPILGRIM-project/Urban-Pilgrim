import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { auth, db } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Calendar, Users, Mail, User, BookOpen, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function OrganizerUsers() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [organizerDocId, setOrganizerDocId] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const organizer = useSelector(state => state.organizerAuth?.organizer);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        async function loadUsers() {
            try {
                setLoading(true);
                setError('');

                // Require organizer auth
                if (!organizer) {
                    throw new Error('Please sign in as an organizer to view users.');
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

                const orgDoc = orgSnap.docs[0];
                if (!isMounted) return;
                setOrganizerDocId(orgDoc.id);

                const orgData = orgDoc.data() || {};

                const usersData = [];

                // Get programs array
                const programsArray = Array.isArray(orgData.programs) ? orgData.programs : [];

                // Process each program
                for (const program of programsArray) {
                    if (!program || typeof program !== 'object') continue;

                    // Get users array from program
                    const usersArray = Array.isArray(program.users) ? program.users : [];

                    // Process each user in this program
                    for (const user of usersArray) {
                        if (!user || typeof user !== 'object') continue;

                        const userSlots = Array.isArray(user.slots) ? user.slots : [];
                        const completedSlots = userSlots.filter(s => 
                            (s.status || '').toLowerCase() === 'completed'
                        );

                        usersData.push({
                            userId: user.userId || '',
                            name: user.name || 'Unknown',
                            email: user.email || 'No email',
                            phone: user.phone || '',
                            program: program.title || 'Untitled',
                            programId: program.programId || '',
                            category: program.category || '',
                            mode: program.mode || '',
                            totalSessions: userSlots.length,
                            completedSessions: completedSlots.length,
                            pendingSessions: userSlots.length - completedSlots.length,
                            slots: userSlots.map(slot => ({
                                ...slot,
                                status: (slot.status || 'pending').toLowerCase()
                            }))
                        });
                    }
                }

                if (isMounted) {
                    setAllUsers(usersData);
                }
            } catch (e) {
                console.error('Failed to load users', e);
                if (isMounted) setError(e?.message || 'Failed to load users');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadUsers();
        return () => {
            isMounted = false;
        };
    }, [organizer]);

    // Render loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Users</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate('/organizer')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Dashboard
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-800">Enrolled Users</h1>
                    </div>
                    <p className="text-gray-600">Manage and view all users enrolled in your programs</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-800 mb-1">{allUsers.length}</div>
                        <div className="text-gray-600 text-sm">Total Users</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <BookOpen className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-800 mb-1">
                            {allUsers.reduce((acc, user) => acc + user.totalSessions, 0)}
                        </div>
                        <div className="text-gray-600 text-sm">Total Sessions</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircle className="w-8 h-8 text-purple-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-800 mb-1">
                            {allUsers.reduce((acc, user) => acc + user.completedSessions, 0)}
                        </div>
                        <div className="text-gray-600 text-sm">Completed Sessions</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-800 mb-1">
                            {allUsers.reduce((acc, user) => acc + user.pendingSessions, 0)}
                        </div>
                        <div className="text-gray-600 text-sm">Pending Sessions</div>
                    </div>
                </div>

                {/* Users List */}
                {allUsers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No users enrolled yet</p>
                        <p className="text-gray-400 text-sm mt-2">Users will appear here once they enroll in your programs</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
                            <p className="text-gray-600 text-sm mt-1">Complete list of enrolled users and their progress</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {allUsers.map((user, index) => {
                                        const progressPercentage = user.totalSessions > 0 
                                            ? Math.round((user.completedSessions / user.totalSessions) * 100) 
                                            : 0;

                                        return (
                                            <tr key={`${user.userId}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                                                <User className="w-5 h-5 text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-medium">{user.program}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {user.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex gap-4">
                                                        <span className="flex items-center gap-1">
                                                            <BookOpen className="w-4 h-4 text-gray-500" />
                                                            {user.totalSessions}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-green-600">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {user.completedSessions}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-orange-600">
                                                            <Clock className="w-4 h-4" />
                                                            {user.pendingSessions}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${progressPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrganizerUsers;
