import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { showSuccess, showError } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';

export default function Coupons() {
    const [coupons, setCoupons] = useState([]);
    const [giftCards, setGiftCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [showAllCoupons, setShowAllCoupons] = useState(false);
    const [showAllGiftCards, setShowAllGiftCards] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage', // percentage or fixed
        discountValue: '',
        programType: 'live_session', // live_session, recorded_session, retreat, guide
        minOrderAmount: '',
        maxDiscount: '',
        usageLimit: '',
        usedCount: 0,
        expirationDate: '',
        isActive: true,
        description: '',
        restrictToProgram: null,
    });
    const navigate = useNavigate();

    // Program restriction UI state
    const [restrictEnabled, setRestrictEnabled] = useState(false);
    const [programOptions, setProgramOptions] = useState([]); // [{id,title}]
    const [programLoading, setProgramLoading] = useState(false);

    const programTypes = [
        { value: 'live_session', label: 'Live Sessions' },
        { value: 'recorded_session', label: 'Recorded Sessions' },
        { value: 'retreat', label: 'Pilgrim Retreats' },
        { value: 'guide', label: 'Pilgrim Guides' }
    ];

    useEffect(() => {
        fetchCoupons();
        fetchGiftCards();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const querySnapshot = await getDocs(collection(db, 'coupons'));
            const couponsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCoupons(couponsData);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            showError('Failed to fetch coupons');
        } finally {
            setLoading(false);
        }
    };

    const fetchGiftCards = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'giftCards'));
            const giftCardsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGiftCards(giftCardsData);
        } catch (error) {
            console.error('Error fetching gift cards:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code || !formData.discountValue || !formData.expirationDate) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            const couponData = {
                ...formData,
                code: formData.code.toUpperCase(),
                isGiftCard: false,
                discountValue: parseFloat(formData.discountValue),
                minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
                maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
                createdAt: editingCoupon ? editingCoupon.createdAt : new Date(),
                updatedAt: new Date()
            };

            // If restriction is not enabled, ensure field is null
            if (!restrictEnabled) {
                couponData.restrictToProgram = null;
            }

            if (editingCoupon) {
                await updateDoc(doc(db, 'coupons', editingCoupon.id), couponData);
                showSuccess('Coupon updated successfully');
            } else {
                await addDoc(collection(db, 'coupons'), couponData);
                showSuccess('Coupon created successfully');
            }

            resetForm();
            fetchCoupons();
        } catch (error) {
            console.error('Error saving coupon:', error);
            showError('Failed to save coupon');
        }
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue.toString(),
            programType: coupon.programType,
            minOrderAmount: coupon.minOrderAmount?.toString() || '',
            maxDiscount: coupon.maxDiscount?.toString() || '',
            usageLimit: coupon.usageLimit?.toString() || '',
            usedCount: coupon.usedCount,
            expirationDate: coupon.expirationDate,
            isActive: coupon.isActive,
            description: coupon.description || '',
            restrictToProgram: coupon.restrictToProgram || null,
        });
        setRestrictEnabled(!!coupon.restrictToProgram);
        setShowForm(true);
    };

    const handleDelete = async (couponId) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            try {
                await deleteDoc(doc(db, 'coupons', couponId));
                showSuccess('Coupon deleted successfully');
                fetchCoupons();
            } catch (error) {
                console.error('Error deleting coupon:', error);
                showError('Failed to delete coupon');
            }
        }
    };

    const toggleCouponStatus = async (coupon) => {
        try {
            await updateDoc(doc(db, 'coupons', coupon.id), {
                isActive: !coupon.isActive,
                updatedAt: new Date()
            });
            showSuccess(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchCoupons();
        } catch (error) {
            console.error('Error updating coupon status:', error);
            showError('Failed to update coupon status');
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            discountType: 'percentage',
            discountValue: '',
            programType: 'live_session',
            minOrderAmount: '',
            maxDiscount: '',
            usageLimit: '',
            usedCount: 0,
            expirationDate: '',
            isActive: true,
            description: '',
            restrictToProgram: null,
        });
        setEditingCoupon(null);
        setRestrictEnabled(false);
        setShowForm(false);
    };

    const isExpired = (expirationDate) => {
        return new Date(expirationDate) < new Date();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getProgramTypeLabel = (type) => {
        const program = programTypes.find(p => p.value === type);
        return program ? program.label : type;
    };

    // Fetch program options when programType changes
    useEffect(() => {
        const type = formData.programType; // capture current type
        let cancelled = false;

        const loadPrograms = async () => {
            try {
                setProgramLoading(true);
                // Clear immediately to avoid showing stale options
                setProgramOptions([]);
                let options = [];
                if (type === 'retreat') {
                    // retreats structure: pilgrim_retreat/user-uid/retreats/data with nested keys
                    const docRef = doc(db, 'pilgrim_retreat', 'user-uid', 'retreats', 'data');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        options = Object.keys(data)
                            .map(key => data[key])
                            .filter(item => item?.pilgrimRetreatCard?.title)
                            .map(item => ({ id: item.id || item.pilgrimRetreatCard?.title, title: item.pilgrimRetreatCard.title }));
                    }
                } else if (type === 'guide') {
                    // guides: pilgrim_guides/pilgrim_guides/guides/data slides array
                    const docRef = doc(db, 'pilgrim_guides', 'pilgrim_guides', 'guides', 'data');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const slides = snap.data().slides || [];
                        options = slides
                            .filter(s => s?.guideCard?.title)
                            .map(s => ({ id: s.id || s.guideCard.title, title: s.guideCard.title }));
                    }
                } else if (type === 'live_session') {
                    const docRef = doc(db, 'pilgrim_sessions', 'pilgrim_sessions', 'sessions', 'liveSession');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const slides = snap.data().slides || [];
                        options = slides
                            .filter(s => s?.liveSessionCard?.title)
                            .map(s => ({ id: s.id || s.liveSessionCard.title, title: s.liveSessionCard.title }));
                    }
                } else if (type === 'recorded_session') {
                    const docRef = doc(db, 'pilgrim_sessions', 'pilgrim_sessions', 'sessions', 'recordedSession');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const slides = snap.data().slides || [];
                        options = slides
                            .filter(s => s?.recordedProgramCard?.title)
                            .map(s => ({ id: s.id || s.recordedProgramCard.title, title: s.recordedProgramCard.title }));
                    }
                }
                if (!cancelled && type === formData.programType && restrictEnabled) {
                    setProgramOptions(options);
                }
                // Reset selection if programType changed
                setFormData(prev => ({ ...prev, restrictToProgram: null }));
            } catch (e) {
                console.error('Failed to load programs for type', formData.programType, e);
            } finally {
                if (!cancelled) setProgramLoading(false);
            }
        };

        if (restrictEnabled) {
            loadPrograms();
        } else {
            setProgramOptions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.programType, restrictEnabled]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0c3c60]"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = '/admin/giftcards'}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Manage Gift Cards
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-[#0c3c60] text-white px-4 py-2 rounded-lg hover:bg-[#0a2d47] transition-colors"
                    >
                        Create New Coupon
                    </button>
                </div>
            </div>

            {/* Coupon Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Coupon Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Coupon Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="e.g., SAVE20"
                                        required
                                    />
                                </div>

                                {/* Program Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Program Type *
                                    </label>
                                    <select
                                        value={formData.programType}
                                        onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                    >
                                        {programTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Restrict to specific program (optional) */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Restrict to a specific {getProgramTypeLabel(formData.programType)}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="restrictToggle"
                                                type="checkbox"
                                                checked={restrictEnabled}
                                                onChange={(e) => setRestrictEnabled(e.target.checked)}
                                                className="h-4 w-4"
                                            />
                                            <label htmlFor="restrictToggle" className="text-sm text-gray-600">Enable</label>
                                        </div>
                                    </div>

                                    {restrictEnabled && (
                                        <div className="space-y-2">
                                            <select
                                                value={formData.restrictToProgram?.id || ''}
                                                onChange={(e) => {
                                                    const selId = e.target.value;
                                                    const opt = programOptions.find(o => String(o.id) === String(selId));
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        restrictToProgram: opt ? { id: opt.id, title: opt.title } : null
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                                disabled={programLoading}
                                            >
                                                <option value="">{programLoading ? 'Loading programs...' : 'Select a program'}</option>
                                                {programOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.title}</option>
                                                ))}
                                            </select>
                                            {(!programLoading && restrictEnabled && programOptions.length === 0) && (
                                                <p className="text-xs text-gray-500">No programs found for the selected type.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Discount Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount Type *
                                    </label>
                                    <select
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                </div>

                                {/* Discount Value */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount Value *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder={formData.discountType === 'percentage' ? '20' : '500'}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>

                                {/* Minimum Order Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Order Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minOrderAmount}
                                        onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="1000"
                                        min="0"
                                    />
                                </div>

                                {/* Maximum Discount */}
                                {formData.discountType === 'percentage' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Maximum Discount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.maxDiscount}
                                            onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                            placeholder="2000"
                                            min="0"
                                        />
                                    </div>
                                )}

                                {/* Usage Limit */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Usage Limit
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="100"
                                        min="1"
                                    />
                                </div>

                                {/* Expiration Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiration Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expirationDate}
                                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                    rows="3"
                                    placeholder="Optional description for the coupon"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="mr-2"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    Active
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#0c3c60] text-white rounded-md hover:bg-[#0a2d47]"
                                >
                                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Coupons Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Coupons</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Code
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Program
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Discount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expiration
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                                const regularCoupons = coupons.filter(c => !c.isGiftCard);
                                const displayCoupons = showAllCoupons ? regularCoupons : regularCoupons.slice(0, 5);
                                return displayCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap max-w-[280px]">
                                            <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                                            {coupon.description && (
                                                <div className="text-sm text-gray-500 truncate" title={coupon.description}>
                                                    {coupon.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {getProgramTypeLabel(coupon.programType)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {coupon.discountType === 'percentage'
                                                ? `${coupon.discountValue}%`
                                                : `₹${coupon.discountValue}`}
                                            {coupon.maxDiscount && (
                                                <div className="text-xs text-gray-500">Max: ₹{coupon.maxDiscount}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {coupon.usedCount || 0}
                                            {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className={isExpired(coupon.expirationDate) ? 'text-red-600' : ''}>
                                                {formatDate(coupon.expirationDate)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col space-y-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${coupon.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {coupon.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                {isExpired(coupon.expirationDate) && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Expired
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEdit(coupon)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => toggleCouponStatus(coupon)}
                                                    className={`${coupon.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                                                        }`}
                                                >
                                                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coupon.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                    {(() => {
                        const regularCoupons = coupons.filter(c => !c.isGiftCard);
                        if (regularCoupons.length === 0) {
                            return (
                                <div className="text-center py-12">
                                    <div className="text-gray-500">No coupons found</div>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-4 text-[#0c3c60] hover:text-[#0a2d47]"
                                    >
                                        Create your first coupon
                                    </button>
                                </div>
                            );
                        }
                        if (regularCoupons.length > 5 && !showAllCoupons) {
                            return (
                                <div className="text-center py-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowAllCoupons(true)}
                                        className="text-[#0c3c60] hover:text-[#0a2d47] font-medium"
                                    >
                                        Show More ({regularCoupons.length - 5} more)
                                    </button>
                                </div>
                            );
                        }
                        if (showAllCoupons && regularCoupons.length > 5) {
                            return (
                                <div className="text-center py-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowAllCoupons(false)}
                                        className="text-[#0c3c60] hover:text-[#0a2d47] font-medium"
                                    >
                                        Show Less
                                    </button>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* Gift Cards Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Gift Cards</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        {/* heading */}
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price & Discount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Related Item
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        {/* content */}
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                                const displayGiftCards = showAllGiftCards ? giftCards : giftCards.slice(0, 5);
                                return displayGiftCards.map((giftCard) => (
                                    <tr key={giftCard.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {giftCard.mainImage && (
                                                    <img
                                                        src={giftCard.mainImage}
                                                        alt={giftCard.title}
                                                        className="h-10 w-10 rounded object-cover mr-3"
                                                    />
                                                )}
                                                <div className="text-sm font-medium text-gray-900">{giftCard.title}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-sm text-gray-600 truncate" title={giftCard.description}>
                                                {giftCard.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {giftCard.pricingOptions?.map((opt, idx) => (
                                                <div key={idx} className="text-sm text-gray-900">
                                                    <span className="font-semibold">₹{opt.amount}</span>
                                                    <span className="text-green-600 ml-2">({opt.discount}% off)</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {giftCard.relatedItem?.name ? (
                                                <div className="text-sm">
                                                    <div className="font-medium text-gray-900">{giftCard.relatedItem.name}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{giftCard.relatedItem.type?.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-500">Any</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                giftCard.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {giftCard.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => navigate('/admin/giftcards')}
                                                className="text-purple-600 hover:text-purple-900 font-medium"
                                            >
                                                Manage Gift Card
                                            </button>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>

                    {(() => {
                        if (giftCards.length === 0) {
                            return (
                                <div className="text-center py-12">
                                    <div className="text-gray-500">No gift cards found</div>
                                </div>
                            );
                        }
                        if (giftCards.length > 5 && !showAllGiftCards) {
                            return (
                                <div className="text-center py-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowAllGiftCards(true)}
                                        className="text-[#0c3c60] hover:text-[#0a2d47] font-medium"
                                    >
                                        Show More ({giftCards.length - 5} more)
                                    </button>
                                </div>
                            );
                        }
                        if (showAllGiftCards && giftCards.length > 5) {
                            return (
                                <div className="text-center py-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowAllGiftCards(false)}
                                        className="text-[#0c3c60] hover:text-[#0a2d47] font-medium"
                                    >
                                        Show Less
                                    </button>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        </div>
    );
}
