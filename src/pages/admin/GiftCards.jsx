import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { showSuccess, showError } from '../../utils/toast';
import { FiX, FiUpload, FiTrash2 } from 'react-icons/fi';
import { FaEdit } from 'react-icons/fa';

export default function GiftCards() {
    const [giftCards, setGiftCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGiftCard, setEditingGiftCard] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Related items data
    const [retreats, setRetreats] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const [recordedSessions, setRecordedSessions] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [guides, setGuides] = useState([]);
    const [showSubmenu, setShowSubmenu] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        mainImage: '',
        images: [], // array of URLs (images/videos)
        relatedItem: { type: 'any', id: null, name: '' }, // Related item selection
        whatsIncluded: [''],
        pricingOptions: [{ amount: '', discount: '' }],
        termsAndConditions: [''],
        isActive: true,
    });

    useEffect(() => {
        fetchGiftCards();
        fetchRelatedItems();
    }, []);

    const fetchRelatedItems = async () => {
        try {
            // Fetch Retreats
            const retreatsRef = doc(db, 'pilgrim_retreat/user-uid/retreats/data');
            const retreatsSnapshot = await getDoc(retreatsRef);
            if (retreatsSnapshot.exists()) {
                const retreatsData = retreatsSnapshot.data();
                const retreatsArray = Object.keys(retreatsData).map(key => ({
                    id: key,
                    title: retreatsData[key]?.pilgrimRetreatCard?.title || 'Untitled Retreat',
                    ...retreatsData[key]
                }));
                setRetreats(retreatsArray);
            }

            // Fetch Guides
            const guidesRef = doc(db, 'pilgrim_guides/pilgrim_guides/guides/data');
            const guidesSnapshot = await getDoc(guidesRef);
            if (guidesSnapshot.exists()) {
                const guidesData = guidesSnapshot.data();
                if (guidesData.slides) {
                    const guidesArray = Object.keys(guidesData.slides).map(key => ({
                        id: key,
                        name: guidesData.slides[key]?.guideCard?.title || 'Untitled Guide',
                        ...guidesData.slides[key]
                    }));
                    setGuides(guidesArray);
                }
            }

            // Fetch Live Sessions
            const liveSessionsRef = doc(db, 'pilgrim_sessions/pilgrim_sessions/sessions/liveSession');
            const liveSessionsSnapshot = await getDoc(liveSessionsRef);
            if (liveSessionsSnapshot.exists()) {
                const liveSessionsData = liveSessionsSnapshot.data();
                if (liveSessionsData.slides) {
                    const liveSessionsArray = Object.keys(liveSessionsData.slides).map(key => ({
                        id: key,
                        title: liveSessionsData.slides[key]?.liveSessionCard?.title || 'Untitled Session',
                        ...liveSessionsData.slides[key]
                    }));
                    setLiveSessions(liveSessionsArray);
                }
            }

            // Fetch Recorded Sessions
            const recordedRef = doc(db, 'pilgrim_sessions/pilgrim_sessions/sessions/recordedSession');
            const recordedSnapshot = await getDoc(recordedRef);
            if (recordedSnapshot.exists()) {
                const recordedData = recordedSnapshot.data();
                if (recordedData.slides) {
                    const recordedArray = Object.keys(recordedData.slides).map(key => ({
                        id: key,
                        title: recordedData.slides[key]?.recordedProgramCard?.title || 'Untitled Session',
                        ...recordedData.slides[key]
                    }));
                    setRecordedSessions(recordedArray);
                }
            }

            // Fetch Workshops
            const workshopsSnapshot = await getDocs(collection(db, 'workshops'));
            const workshopsArray = workshopsSnapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title || 'Untitled Workshop',
                ...doc.data()
            }));
            setWorkshops(workshopsArray);
            
        } catch (error) {
            console.error('Error fetching related items:', error);
        }
    };

    const fetchGiftCards = async () => {
        try {
            setLoading(true);
            const querySnapshot = await getDocs(collection(db, 'giftCards'));
            const giftCardsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGiftCards(giftCardsData);
        } catch (error) {
            console.error('Error fetching gift cards:', error);
            showError('Failed to fetch gift cards');
        } finally {
            setLoading(false);
        }
    };

    const handleMainImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        
        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 100);

            const timestamp = Date.now();
            const storageRef = ref(storage, `giftCards/${timestamp}_${file.name}`);
            await uploadBytes(storageRef, file);
            
            clearInterval(progressInterval);
            setUploadProgress(95);
            
            const url = await getDownloadURL(storageRef);
            setFormData({ ...formData, mainImage: url });
            setUploadProgress(100);
            showSuccess('Image uploaded successfully!');
        } catch (error) {
            console.error('Error uploading image:', error);
            showError('Failed to upload image');
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (formData.images.length + files.length > 5) {
            showError('Maximum 5 images/videos allowed');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        
        try {
            const totalFiles = files.length;
            let completedFiles = 0;

            const uploadPromises = files.map(async (file) => {
                const timestamp = Date.now() + Math.random(); // Ensure unique names
                const storageRef = ref(storage, `giftCards/${timestamp}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                
                completedFiles++;
                setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
                return url;
            });
            
            const urls = await Promise.all(uploadPromises);
            const validUrls = urls.filter(url => url !== null);
            
            setFormData({
                ...formData,
                images: [...formData.images, ...validUrls]
            });
            
            if (validUrls.length > 0) {
                showSuccess('Files uploaded successfully!');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            showError('Failed to upload files');
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    const removeGalleryItem = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: newImages });
    };

    const handleArrayFieldChange = (field, index, value) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayField = (field) => {
        setFormData({
            ...formData,
            [field]: [...formData[field], '']
        });
    };

    const removeArrayField = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray });
    };

    const handlePricingChange = (index, field, value) => {
        const newPricing = [...formData.pricingOptions];
        newPricing[index][field] = value;
        setFormData({ ...formData, pricingOptions: newPricing });
    };

    const addPricingOption = () => {
        setFormData({
            ...formData,
            pricingOptions: [...formData.pricingOptions, { amount: '', discount: '' }]
        });
    };

    const removePricingOption = (index) => {
        const newPricing = formData.pricingOptions.filter((_, i) => i !== index);
        setFormData({ ...formData, pricingOptions: newPricing });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.mainImage || formData.pricingOptions.length === 0) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            const giftCardData = {
                ...formData,
                whatsIncluded: formData.whatsIncluded.filter(item => item.trim() !== ''),
                termsAndConditions: formData.termsAndConditions.filter(item => item.trim() !== ''),
                pricingOptions: formData.pricingOptions
                    .filter(opt => opt.amount && opt.discount)
                    .map(opt => ({
                        amount: parseFloat(opt.amount),
                        discount: parseFloat(opt.discount)
                    })),
                createdAt: editingGiftCard ? editingGiftCard.createdAt : new Date(),
                updatedAt: new Date()
            };

            if (editingGiftCard) {
                await updateDoc(doc(db, 'giftCards', editingGiftCard.id), giftCardData);
                showSuccess('Gift card updated successfully');
            } else {
                await addDoc(collection(db, 'giftCards'), giftCardData);
                showSuccess('Gift card created successfully');
            }

            resetForm();
            fetchGiftCards();
        } catch (error) {
            console.error('Error saving gift card:', error);
            showError('Failed to save gift card');
        }
    };

    const handleEdit = (giftCard) => {
        setEditingGiftCard(giftCard);
        setFormData({
            title: giftCard.title,
            description: giftCard.description,
            mainImage: giftCard.mainImage,
            images: giftCard.images || [],
            relatedItem: giftCard.relatedItem || { type: 'any', id: null, name: '' },
            whatsIncluded: giftCard.whatsIncluded?.length > 0 ? giftCard.whatsIncluded : [''],
            pricingOptions: giftCard.pricingOptions?.length > 0 
                ? giftCard.pricingOptions.map(opt => ({ amount: opt.amount.toString(), discount: opt.discount.toString() }))
                : [{ amount: '', discount: '' }],
            termsAndConditions: giftCard.termsAndConditions?.length > 0 ? giftCard.termsAndConditions : [''],
            isActive: giftCard.isActive ?? true,
        });
        
        // Set submenu state if related item exists
        if (giftCard.relatedItem && giftCard.relatedItem.type !== 'any') {
            setShowSubmenu(giftCard.relatedItem.type);
        } else {
            setShowSubmenu(null);
        }
        
        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (giftCardId) => {
        if (window.confirm('Are you sure you want to delete this gift card?')) {
            try {
                await deleteDoc(doc(db, 'giftCards', giftCardId));
                showSuccess('Gift card deleted successfully');
                fetchGiftCards();
            } catch (error) {
                console.error('Error deleting gift card:', error);
                showError('Failed to delete gift card');
            }
        }
    };

    const toggleStatus = async (giftCard) => {
        try {
            await updateDoc(doc(db, 'giftCards', giftCard.id), {
                isActive: !giftCard.isActive,
                updatedAt: new Date()
            });
            showSuccess(`Gift card ${!giftCard.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchGiftCards();
        } catch (error) {
            console.error('Error updating gift card status:', error);
            showError('Failed to update gift card status');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            mainImage: '',
            images: [],
            relatedItem: { type: 'any', id: null, name: '' },
            whatsIncluded: [''],
            pricingOptions: [{ amount: '', discount: '' }],
            termsAndConditions: [''],
            isActive: true,
        });
        setEditingGiftCard(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0c3c60]"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Gift Card Management</h1>

            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {editingGiftCard ? 'Edit Gift Card' : 'Create New Gift Card'}
                    </h2>
                    {editingGiftCard && (
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gift Card Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                            placeholder="e.g., Yoga Wellness Gift Card"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                            rows="4"
                            placeholder="Describe the gift card..."
                        />
                    </div>

                    {/* Main Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Main Image *
                        </label>
                        <div className="flex gap-4 items-start">
                            {formData.mainImage ? (
                                <div className="relative">
                                    <img
                                        src={formData.mainImage}
                                        alt="Main"
                                        className="w-64 h-64 object-cover rounded-lg border-2 border-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, mainImage: '' })}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                                        disabled={uploading}
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : uploading ? (
                                <div className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed border-[#0c3c60] rounded-lg bg-blue-50">
                                    <div className="w-16 h-16 mb-3">
                                        <svg className="animate-spin w-full h-full" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#e5e7eb"
                                                strokeWidth="10"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#0c3c60"
                                                strokeWidth="10"
                                                strokeDasharray="70 200"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-[#0c3c60] mb-1">Uploading...</p>
                                    <p className="text-xs text-gray-600">{uploadProgress}%</p>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed border-gray-400 rounded-lg cursor-pointer hover:border-[#0c3c60] hover:bg-gray-50 transition-colors">
                                    <FiUpload className="w-12 h-12 text-gray-400 mb-3" />
                                    <span className="text-sm text-gray-600 font-medium">Upload Main Image</span>
                                    <span className="text-xs text-gray-400 mt-1">Click or drag to upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleMainImageUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Gallery Images/Videos */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gallery Images/Videos (Max 5)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {formData.images.map((url, index) => (
                                <div key={index} className="relative group">
                                    {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') ? (
                                        <video
                                            src={url}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                            controls
                                        />
                                    ) : (
                                        <img
                                            src={url}
                                            alt={`Gallery ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryItem(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        disabled={uploading}
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {uploading && formData.images.length < 5 && (
                                <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#0c3c60] rounded-lg bg-blue-50">
                                    <div className="w-12 h-12 mb-2">
                                        <svg className="animate-spin w-full h-full" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#e5e7eb"
                                                strokeWidth="10"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#0c3c60"
                                                strokeWidth="10"
                                                strokeDasharray="70 200"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-xs text-[#0c3c60] font-semibold">{uploadProgress}%</span>
                                </div>
                            )}
                            {formData.images.length < 5 && !uploading && (
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0c3c60] hover:bg-gray-50 transition-colors">
                                    <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-xs text-gray-500 font-medium">Add Media</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={handleGalleryUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Related Item Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Related Item (Optional)
                        </label>
                        <div className="relative">
                            <select
                                value={formData.relatedItem.type}
                                defaultValue="any"
                                onChange={(e) => {
                                    const selectedType = e.target.value;
                                    setFormData({
                                        ...formData,
                                        relatedItem: { type: selectedType, id: null, name: '' }
                                    });
                                    setShowSubmenu(selectedType === 'any' ? null : selectedType);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60] bg-white"
                            >
                                <option value="any">Any</option>
                                <option value="pilgrimRetreat">Pilgrim Retreat</option>
                                <option value="liveSession">Live Sessions</option>
                                <option value="recordedSession">Recorded Sessions</option>
                                <option value="workshop">Workshop</option>
                                <option value="pilgrimGuide">Pilgrim Guide</option>
                            </select>

                            {/* Submenu for selecting specific item */}
                            {showSubmenu && formData.relatedItem.type !== 'any' && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Select Specific {showSubmenu === 'pilgrimRetreat' ? 'Retreat' :
                                            showSubmenu === 'liveSession' ? 'Live Session' :
                                            showSubmenu === 'recordedSession' ? 'Recorded Session' :
                                            showSubmenu === 'workshop' ? 'Workshop' : 'Guide'}
                                    </label>
                                    <select
                                        value={formData.relatedItem.id || ''}
                                        onChange={(e) => {
                                            const selectedId = e.target.value;
                                            let selectedItem;
                                            
                                            if (showSubmenu === 'pilgrimRetreat') {
                                                selectedItem = retreats.find(r => r.id === selectedId);
                                            } else if (showSubmenu === 'liveSession') {
                                                selectedItem = liveSessions.find(s => s.id === selectedId);
                                            } else if (showSubmenu === 'recordedSession') {
                                                selectedItem = recordedSessions.find(s => s.id === selectedId);
                                            } else if (showSubmenu === 'workshop') {
                                                selectedItem = workshops.find(w => w.id === selectedId);
                                            } else if (showSubmenu === 'pilgrimGuide') {
                                                selectedItem = guides.find(g => g.id === selectedId);
                                            }

                                            setFormData({
                                                ...formData,
                                                relatedItem: {
                                                    type: showSubmenu,
                                                    id: selectedId,
                                                    name: selectedItem?.title || selectedItem?.name || ''
                                                }
                                            });
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60] bg-white"
                                    >
                                        <option value="">-- Select --</option>
                                        {showSubmenu === 'pilgrimRetreat' && retreats.map(retreat => (
                                            <option key={retreat.id} value={retreat.id}>{retreat.title}</option>
                                        ))}
                                        {showSubmenu === 'liveSession' && liveSessions.map(session => (
                                            <option key={session.id} value={session.id}>{session.title}</option>
                                        ))}
                                        {showSubmenu === 'recordedSession' && recordedSessions.map(session => (
                                            <option key={session.id} value={session.id}>{session.title}</option>
                                        ))}
                                        {showSubmenu === 'workshop' && workshops.map(workshop => (
                                            <option key={workshop.id} value={workshop.id}>{workshop.title}</option>
                                        ))}
                                        {showSubmenu === 'pilgrimGuide' && guides.map(guide => (
                                            <option key={guide.id} value={guide.id}>{guide.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Display selected item */}
                            {formData.relatedItem.id && formData.relatedItem.name && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-medium text-green-700">Selected:</span>
                                        <p className="text-sm text-gray-800 font-semibold">{formData.relatedItem.name}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                relatedItem: { type: formData.relatedItem.type, id: null, name: '' }
                                            });
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* What's Included */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            What's Included
                        </label>
                        <div className="space-y-2">
                            {formData.whatsIncluded.map((item, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => handleArrayFieldChange('whatsIncluded', index, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="e.g., 3 Yoga Sessions"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeArrayField('whatsIncluded', index)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        disabled={formData.whatsIncluded.length === 1}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => addArrayField('whatsIncluded')}
                            className="mt-3 text-[#0c3c60] hover:text-[#0a2d47] text-sm font-semibold"
                        >
                            + Add Item
                        </button>
                    </div>

                    {/* Pricing Options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pricing Options *
                        </label>
                        <div className="space-y-2">
                            {formData.pricingOptions.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="number"
                                        value={option.amount}
                                        onChange={(e) => handlePricingChange(index, 'amount', e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="Amount (₹)"
                                        min="0"
                                        required
                                    />
                                    <input
                                        type="number"
                                        value={option.discount}
                                        onChange={(e) => handlePricingChange(index, 'discount', e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="Discount (%)"
                                        min="0"
                                        max="100"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePricingOption(index)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        disabled={formData.pricingOptions.length === 1}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addPricingOption}
                            className="mt-3 text-[#0c3c60] hover:text-[#0a2d47] text-sm font-semibold"
                        >
                            + Add Pricing Option
                        </button>
                    </div>

                    {/* Terms and Conditions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Terms and Conditions
                        </label>
                        <div className="space-y-2">
                            {formData.termsAndConditions.map((term, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={term}
                                        onChange={(e) => handleArrayFieldChange('termsAndConditions', index, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c3c60]"
                                        placeholder="e.g., Valid for 1 year from purchase"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeArrayField('termsAndConditions', index)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        disabled={formData.termsAndConditions.length === 1}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => addArrayField('termsAndConditions')}
                            className="mt-3 text-[#0c3c60] hover:text-[#0a2d47] text-sm font-semibold"
                        >
                            + Add Term
                        </button>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-5 h-5 text-[#0c3c60] border-gray-300 rounded focus:ring-[#0c3c60]"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                            Active Status
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t">
                        <button
                            type="submit"
                            disabled={uploading}
                            className="w-full sm:w-auto px-8 py-3 bg-[#0c3c60] text-white font-semibold rounded-lg hover:bg-[#0a2d47] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading ? 'Uploading...' : editingGiftCard ? 'Update Gift Card' : 'Create Gift Card'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Gift Cards List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Existing Gift Cards</h2>
                
                {giftCards.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-2">No gift cards found</div>
                        <p className="text-gray-400 text-sm">Create your first gift card using the form above</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {giftCards.map((giftCard) => (
                            <div key={giftCard.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                <img
                                    src={giftCard.mainImage}
                                    alt={giftCard.title}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{giftCard.title}</h3>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{giftCard.description}</p>
                                    
                                    <div className="mb-3">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Pricing:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {giftCard.pricingOptions?.map((opt, idx) => (
                                                <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                                    ₹{opt.amount} ({opt.discount}% off)
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                            giftCard.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {giftCard.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(giftCard)}
                                            className="flex-1 px-3 py-2 bg-[#0c3c60] text-white text-sm font-medium rounded-lg hover:bg-[#0a2d47] flex items-center justify-center gap-2"
                                        >
                                            <FaEdit /> Edit
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(giftCard)}
                                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                                                giftCard.isActive
                                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                        >
                                            {giftCard.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(giftCard.id)}
                                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
