import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { showError, showSuccess } from '../../../utils/toast';
import { useNavigate } from 'react-router-dom';

export default function OrganizerList() {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingOrganizer, setEditingOrganizer] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        password: ''
    });
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrganizers();
    }, []);

    const fetchOrganizers = async () => {
        try {
            setLoading(true);
            const organizersSnapshot = await getDocs(collection(db, 'organizers'));

            const organizersData = [];

            // Loop through each organizer document
            for (const organizerDoc of organizersSnapshot.docs) {
                const uid = organizerDoc.id;
                const organizerData = organizerDoc.data();

                // Extract fields from the new organizer structure
                const { name, email, number, phone, address, password, programs } = organizerData;

                if (email || number) {
                    organizersData.push({
                        uid,
                        name: name || 'N/A',
                        email: email || 'N/A',
                        number: number || phone,
                        address: address || 'N/A',
                        password: password || '',
                        programCount: Array.isArray(programs) ? programs.length : 0
                    });
                }
            }

            setOrganizers(organizersData);
        } catch (error) {
            console.error('Error fetching organizers:', error);
            showError('Failed to load organizers');
        } finally {
            setLoading(false);
        }
    };

    const handleOrganizerClick = (uid) => {
        // Navigate to organizer route without login requirement
        navigate(`/organizer?uid=${uid}`);
    };

    const handleEditClick = (e, organizer) => {
        e.stopPropagation(); // Prevent card click
        setEditingOrganizer(organizer);
        setEditForm({
            name: organizer.name !== 'N/A' ? organizer.name : '',
            password: organizer.password || ''
        });
        setShowEditModal(true);
    };

    const handleCloseModal = () => {
        setShowEditModal(false);
        setEditingOrganizer(null);
        setEditForm({ name: '', password: '' });
    };

    const handleSaveCredentials = async () => {
        if (!editForm.name.trim()) {
            showError('Name is required');
            return;
        }
        if (!editForm.password.trim()) {
            showError('Password is required');
            return;
        }

        try {
            setSaving(true);
            const organizerRef = doc(db, 'organizers', editingOrganizer.uid);

            await updateDoc(organizerRef, {
                name: editForm.name.trim(),
                password: editForm.password.trim()
            });

            showSuccess('Organizer credentials updated successfully');

            // Update local state
            setOrganizers(prev => prev.map(org =>
                org.uid === editingOrganizer.uid
                    ? { ...org, name: editForm.name.trim(), password: editForm.password.trim() }
                    : org
            ));

            handleCloseModal();
        } catch (error) {
            console.error('Error updating organizer:', error);
            showError('Failed to update organizer credentials');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0c3c60]"></div>
            </div>
        );
    }

    if (organizers.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No organizers found</h3>
                <p className="mt-1 text-sm text-gray-500">No organizers have been registered yet.</p>
            </div>
        );
    }


    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizers.map((organizer) => (
                    <div
                        key={organizer.uid}
                        onClick={() => handleOrganizerClick(organizer.uid)}
                        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-200 overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-[#0c3c60] to-[#2f6288] p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 flex justify-center">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-[#0c3c60]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleEditClick(e, organizer)}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                    title="Edit credentials"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <h3 className="text-xl font-bold text-gray-800 text-center truncate">
                                    {organizer.name}
                                </h3>
                                {organizer.programCount > 0 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {organizer.programCount} {organizer.programCount === 1 ? 'Program' : 'Programs'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="text-sm font-medium text-gray-800 break-all">{organizer.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="text-sm font-medium text-gray-800">{organizer?.number || organizer?.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <button className="w-full bg-[#0c3c60] text-white py-2 px-4 rounded-lg hover:bg-[#2f6288] transition-colors duration-200 flex items-center justify-center gap-2">
                                    <span>Access Dashboard</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Edit Organizer Credentials</h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Email Display (Read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email (Read-only)
                                </label>
                                <input
                                    type="text"
                                    value={editingOrganizer?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter organizer username"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0c3c60] focus:border-transparent"
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Enter password for organizer login"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0c3c60] focus:border-transparent"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Organizer will use this password to access their dashboard
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCloseModal}
                                disabled={saving}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCredentials}
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-[#0c3c60] text-white rounded-lg hover:bg-[#2f6288] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Credentials</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
