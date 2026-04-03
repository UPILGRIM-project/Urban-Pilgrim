import { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Plus, Trash2, GripVertical, Edit2, Eye, EyeOff } from "lucide-react";
import { storage } from "../../../services/firebase";
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytesResumable,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
    deleteSlideByIndex,
    fetchGuideData,
    saveOrUpdateGuideData,
    saveGuideOrganizerData,
} from "../../../services/pilgrim_guide/guideService";
import { useDispatch, useSelector } from "react-redux";
import { setGuides } from "../../../features/pilgrim_guide/pilgrimGuideSlice";
import { showSuccess, showError } from "../../../utils/toast";
import toast from "react-hot-toast";
import RichTextEditor from "../../common/RichTextEditor";
import ImageEditor from "../../common/ImageEditor";

const ItemType = "SLIDE";

function SlideItem({
    slide,
    index,
    moveSlide,
    removeSlide,
    editSlide,
    toggleSlideVisibility,
    isLoading,
}) {
    const [, ref] = useDrop({
        accept: ItemType,
        hover: (item) => {
            if (item.index !== index) {
                moveSlide(item.index, index);
                item.index = index;
            }
        },
    });

    const [, drag] = useDrag({
        type: ItemType,
        item: { index },
    });

    return (
        <div
            ref={(node) => drag(ref(node))}
            className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-[#F5F5F5] mb-3 border border-gray-200 hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-3">
                <GripVertical className="text-gray-400 cursor-move w-5 h-5" />
                <div className="flex space-x-4">
                    {slide?.thumbnailType && slide?.thumbnailType.startsWith("video/") ? (
                        <video
                            src={slide?.thumbnail}
                            className="w-16 h-16 object-cover rounded mt-1"
                            autoPlay
                            muted
                            loop
                        />
                    ) : (
                        <img
                            src={slide?.thumbnail}
                            alt="Slide Thumbnail"
                            className="w-16 h-16 object-cover rounded mt-1"
                        />
                    )}
                    <div className="flex flex-col">
                        <p className="font-semibold text-gray-800">{slide?.title}</p>
                        <p className="text-sm text-gray-600">
                            Link: /{slide?.title?.replace(/\s+/g, "-")}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => toggleSlideVisibility(index)}
                    disabled={isLoading}
                    className={`text-xs px-3 py-1 rounded font-semibold ${
                        slide?.active !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                    } ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    title={slide?.active !== false ? "Set Not Visible" : "Set Visible"}
                >
                    {slide?.active !== false ? (
                        <>
                            <Eye className="inline w-3 h-3 mr-1" />
                            Visible
                        </>
                    ) : (
                        <>
                            <EyeOff className="inline w-3 h-3 mr-1" />
                            Not Visible
                        </>
                    )}
                </button>
                <button
                    onClick={() => {
                        editSlide(index);
                    }}
                    disabled={isLoading}
                    className={`p-1 ${isLoading ? "text-gray-400 cursor-not-allowed" : "text-[#2F6288] hover:text-blue-700"}`}
                    title={isLoading ? "Loading..." : "Edit Session Card"}
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => removeSlide(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete Session Card"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function GuideForm() {
    const [formData, setFormData] = useState({
        guideCard: {
            title: "",
            category: "",
            subCategory: "",
            price: "",
            gst: "",
            thumbnail: null,
            thumbnailType: null,
            description: "",
            listingType: "Listing", // Default to "Listing"
        },
        // Common open slots (weekly pattern) for both online and offline
        openSlots: [
            // { days: ["Mon","Wed","Fri"], times: [{ startTime: "07:00", endTime: "08:00" }] }
        ],
        online: {
            planChoice: "One Time", // Plan selection: One Time | Monthly | Both
            monthly: {
                // Pricing variations
                price: "", // backward compatibility
                individualPrice: "",
                couplesPrice: "",
                groupPrice: "",
                groupMin: "",
                groupMax: "",
                discount: "",
                description: "",
                sessionsCount: "", // number of sessions per month
                slots: [],
                weeklyPattern: [], // [{ days:["Sun","Mon"], times:[{startTime, endTime}]}]
                occupancies: [{ type: "Individual", price: "" }],
            },
            oneTime: {
                price: "", // backward compatibility
                individualPrice: "",
                couplesPrice: "",
                groupPrice: "",
                groupMin: "",
                groupMax: "",
                description: "",
                slots: [],
                occupancies: [{ type: "Individual", price: "" }],
            },
        },
        offline: {
            planChoice: "One Time", // Plan selection: One Time | Monthly | Both
            monthly: {
                price: "", // backward compatibility
                individualPrice: "",
                couplesPrice: "",
                groupPrice: "",
                groupMin: "",
                groupMax: "",
                discount: "",
                description: "",
                sessionsCount: "", // number of sessions per month
                slots: [],
                weeklyPattern: [],
                occupancies: [{ type: "Individual", price: "" }],
            },
            oneTime: {
                price: "", // backward compatibility
                individualPrice: "",
                couplesPrice: "",
                groupPrice: "",
                groupMin: "",
                groupMax: "",
                description: "",
                slots: [],
                occupancies: [{ type: "Individual", price: "" }],
            },
        },
        organizer: {
            name: "",
            email: "",
            address: "",
            googleMeetLink: "",
            contactNumber: "",
        },
        session: {
            sessiondescription: "",
            images: [],
            videos: [],
            title: "",
            description: "",
            freeTrialVideo: null,
        },
        guide: [{ title: "", description: "", image: null }],
        slides: [],
    });
    const dispatch = useDispatch();
    const guides = useSelector((state) => state.pilgrimGuides.guides);
    const uid = "pilgrim_guides";

    const [allData, setAllData] = useState([]);
    const [slideData, setSlideData] = useState([]);

    const [errors, _setErrors] = useState({});
    const [dragActive, setDragActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
    const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
    const [sessionImageUploadProgress, setSessionImageUploadProgress] = useState(
        {},
    );
    const [isSessionImageUploading, setIsSessionImageUploading] = useState({});
    const [sessionVideoUploadProgress, setSessionVideoUploadProgress] = useState(
        {},
    );
    const [isSessionVideoUploading, setIsSessionVideoUploading] = useState({});
    const [freeTrialVideoUploadProgress, setFreeTrialVideoUploadProgress] =
        useState(0);
    const [isFreeTrialVideoUploading, setIsFreeTrialVideoUploading] =
        useState(false);
    const [guideUploadProgress, setGuideUploadProgress] = useState(0);
    const [isGuideUploading, setIsGuideUploading] = useState(false);
    
    // Image Editor States
    const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
    const [editingImage, setEditingImage] = useState(null);
    const [editingImageType, setEditingImageType] = useState(null); // 'guide', 'thumbnail', 'session'
    const [editingImageIndex, setEditingImageIndex] = useState(null); // for session images
    const [isSavingEditedImage, setIsSavingEditedImage] = useState(false); // Loading state for image editor save
    
    // One-Time multi-date selection (Online/Offline)
    const [otOnlineSelectedDates, setOtOnlineSelectedDates] = useState([]);
    const [otOnlineMulti, setOtOnlineMulti] = useState(false);
    const [otOnlinePending, setOtOnlinePending] = useState({
        open: false,
        startTime: "",
        endTime: "",
        type: "individual",
    });
    const [otOfflineSelectedDates, setOtOfflineSelectedDates] = useState([]);
    const [otOfflineMulti, setOtOfflineMulti] = useState(false);
    const [otOfflinePending, setOtOfflinePending] = useState({
        open: false,
        startTime: "",
        endTime: "",
        type: "individual",
    });

    const [categories, setCategories] = useState([
        "Yoga Guides",
        "Meditation Guides",
        "Mental Wellness",
        "Ritual Pandits",
    ]);

    const buildSlideData = (programs = []) =>
        programs.flatMap((program) =>
            (program?.slides || []).map((slide) => ({
                ...slide,
                active: program?.active !== false,
            })),
        );
    // const subCategories = ["Online", "Offline", "both"];

    const handleFieldChange = (
        section,
        field,
        value,
        mode = null,
        subscriptionType = null,
    ) => {
        setFormData((prev) => {
            if (mode && subscriptionType) {
                // Handle nested structure for online/offline subscriptions (e.g., online.monthly.price)
                const updated = {
                    ...prev,
                    [mode]: {
                        ...prev[mode],
                        [subscriptionType]: {
                            ...prev[mode][subscriptionType],
                            [field]: value,
                        },
                    },
                };
                
                return updated;
            } else if (mode && !subscriptionType) {
                // Handle mode-level fields (e.g., online.planChoice, offline.planChoice)
                return {
                    ...prev,
                    [mode]: {
                        ...prev[mode],
                        [field]: value,
                    },
                };
            } else {
                // Handle regular sections (e.g., guideCard.title)
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [field]: value,
                    },
                };
            }
        });
    };

    const handleFileUpload = async (file) => {
        if (!file) return;

        try {
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                alert("Please upload an image or video file");
                return;
            }

            setIsThumbnailUploading(true);
            setThumbnailUploadProgress(0);

            // Create a unique storage path for the file
            const filePath = `pilgrim_guides/thumbnails/${uuidv4()}_${file.name}`;
            const storageRef = ref(storage, filePath);

            // Upload file with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setThumbnailUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Error uploading file:", error);
                    setIsThumbnailUploading(false);
                    setThumbnailUploadProgress(0);
                    alert("Error uploading file. Please try again.");
                },
                async () => {
                    // Get download URL
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    // Update formData with the media data
                    handleFieldChange("guideCard", "thumbnail", downloadURL);
                    handleFieldChange("guideCard", "thumbnailType", file.type);

                    setIsThumbnailUploading(false);
                    setThumbnailUploadProgress(0);
                },
            );
        } catch (error) {
            console.error("Error uploading file:", error);
            setIsThumbnailUploading(false);
            setThumbnailUploadProgress(0);
            alert("Error uploading file. Please try again.");
        }
    };

    const handleGuideChange = (field, value) => {
        setFormData((prev) => {
            const guide = prev.guide && prev.guide.length > 0 
                ? [...prev.guide] 
                : [{ title: "", description: "", image: null }];
            
            guide[0] = {
                ...guide[0],
                [field]: value
            };
            
            return {
                ...prev,
                guide: guide,
            };
        });
    };

    const handleGuideImageChange = async (file) => {
        if (!file) return;
        try {
            if (!file.type.startsWith("image/")) {
                alert("Please upload an image file");
                return;
            }

            setIsGuideUploading(true);
            setGuideUploadProgress(0);

            const filePath = `pilgrim_guides/meet_guides/${uuidv4()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setGuideUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Upload failed:", error);
                    setIsGuideUploading(false);
                    setGuideUploadProgress(0);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    handleGuideChange("image", downloadURL);
                    setIsGuideUploading(false);
                    setGuideUploadProgress(0);
                },
            );
        } catch (error) {
            console.error("Error uploading file:", error);
            setIsGuideUploading(false);
            setGuideUploadProgress(0);
        }
    };

    const handleGuideImageRemove = async () => {
        try {
            const currentImage = formData.guide?.[0]?.image;
            if (currentImage) {
                const imageRef = ref(storage, currentImage);
                await deleteObject(imageRef);
            }
            handleGuideChange("image", null);
        } catch (error) {
            console.error("Error removing image:", error);
        }
    };

    // Image Editor Handlers
    const openImageEditor = (imageUrl, type, index = null) => {
        setEditingImage(imageUrl);
        setEditingImageType(type);
        setEditingImageIndex(index);
        setIsImageEditorOpen(true);
    };

    const handleImageEditorSave = async (editedFile) => {
        try {
            setIsSavingEditedImage(true);
            setIsImageEditorOpen(false);
            
            // Determine which upload process to use based on type
            if (editingImageType === 'guide') {
                // Upload edited guide image
                setIsGuideUploading(true);
                setGuideUploadProgress(0);
                
                const filePath = `pilgrim_guides/meet_guides/${uuidv4()}_${editedFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, editedFile);

                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setGuideUploadProgress(Math.round(progress));
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        setIsGuideUploading(false);
                        setGuideUploadProgress(0);
                        setIsSavingEditedImage(false);
                        showError("Failed to upload edited image");
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        // Delete old image
                        if (editingImage) {
                            try {
                                const oldImageRef = ref(storage, editingImage);
                                await deleteObject(oldImageRef);
                            } catch (err) {
                                console.log("Old image cleanup error:", err);
                            }
                        }
                        
                        handleGuideChange("image", downloadURL);
                        setIsGuideUploading(false);
                        setGuideUploadProgress(0);
                        setIsSavingEditedImage(false);
                        showSuccess("Image updated successfully");
                    }
                );
            } else if (editingImageType === 'thumbnail') {
                // Upload edited thumbnail
                setIsThumbnailUploading(true);
                setThumbnailUploadProgress(0);

                const filePath = `pilgrim_guides/thumbnails/${uuidv4()}_${editedFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, editedFile);

                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setThumbnailUploadProgress(Math.round(progress));
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        setIsThumbnailUploading(false);
                        setThumbnailUploadProgress(0);
                        setIsSavingEditedImage(false);
                        showError("Failed to upload edited image");
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        // Delete old image
                        if (editingImage) {
                            try {
                                const oldImageRef = ref(storage, editingImage);
                                await deleteObject(oldImageRef);
                            } catch (err) {
                                console.log("Old image cleanup error:", err);
                            }
                        }
                        
                        handleFieldChange("guideCard", "thumbnail", downloadURL);
                        handleFieldChange("guideCard", "thumbnailType", editedFile.type);
                        setIsThumbnailUploading(false);
                        setThumbnailUploadProgress(0);
                        setIsSavingEditedImage(false);
                        showSuccess("Image updated successfully");
                    }
                );
            } else if (editingImageType === 'session' && editingImageIndex !== null) {
                // Upload edited session image
                const uploadId = uuidv4();
                setIsSessionImageUploading((prev) => ({ ...prev, [uploadId]: true }));
                setSessionImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

                const filePath = `pilgrim_guides/session_images/${uuidv4()}_${editedFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, editedFile);

                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setSessionImageUploadProgress((prev) => ({
                            ...prev,
                            [uploadId]: Math.round(progress),
                        }));
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        setIsSessionImageUploading((prev) => ({ ...prev, [uploadId]: false }));
                        setSessionImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));
                        setIsSavingEditedImage(false);
                        showError("Failed to upload edited image");
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        // Delete old image
                        if (editingImage) {
                            try {
                                const oldImageRef = ref(storage, editingImage);
                                await deleteObject(oldImageRef);
                            } catch (err) {
                                console.log("Old image cleanup error:", err);
                            }
                        }
                        
                        // Update the specific image in the array
                        setFormData((prev) => {
                            const updatedImages = [...prev.session.images];
                            updatedImages[editingImageIndex] = downloadURL;
                            return {
                                ...prev,
                                session: {
                                    ...prev.session,
                                    images: updatedImages,
                                },
                            };
                        });
                        
                        setIsSessionImageUploading((prev) => ({ ...prev, [uploadId]: false }));
                        setSessionImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));
                        setIsSavingEditedImage(false);
                        showSuccess("Image updated successfully");
                    }
                );
            }
            
            // Reset editor state
            setEditingImage(null);
            setEditingImageType(null);
            setEditingImageIndex(null);
        } catch (error) {
            console.error("Error saving edited image:", error);
            setIsSavingEditedImage(false);
            showError("Failed to save edited image");
        }
    };

    const handleImageEditorCancel = () => {
        setIsImageEditorOpen(false);
        setEditingImage(null);
        setEditingImageType(null);
        setEditingImageIndex(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    // Generic slot management functions
    const _handleSlotChange = (mode, subscriptionType, index, field, value) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const slots = [...updated[mode][subscriptionType].slots];
            slots[index][field] = value;
            updated[mode][subscriptionType].slots = slots;
            return updated;
        });
    };

    const addSlot = (mode, subscriptionType) => {
        const newSlot =
            mode === "Online"
                ? { date: "", startTime: "", endTime: "", type: "individual" }
                : {
                    date: "",
                    startTime: "",
                    endTime: "",
                    location: "",
                    type: "individual",
                };

        setFormData((prev) => {
            const updated = { ...prev };
            updated[mode.toLowerCase()][subscriptionType].slots = [
                ...updated[mode.toLowerCase()][subscriptionType].slots,
                newSlot,
            ];
            return updated;
        });
    };

    const _removeSlot = (mode, subscriptionType, index) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const slots = [...updated[mode.toLowerCase()][subscriptionType].slots];
            slots.splice(index, 1);
            updated[mode.toLowerCase()][subscriptionType].slots = slots;
            return updated;
        });
    };

    // Initialize slots for each subscription type
    const _initializeSlots = (mode, subscriptionType) => {
        if (formData[mode.toLowerCase()][subscriptionType].slots.length === 0) {
            addSlot(mode, subscriptionType);
        }
    };

    // Session slot management functions
    const handleSessionSlotChange = (mode, index, field, value) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const slots = [...updated.session[`${mode.toLowerCase()}Slots`]];
            slots[index][field] = value;
            updated.session[`${mode.toLowerCase()}Slots`] = slots;
            return updated;
        });
    };

    const addSessionSlot = (mode) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const newSlot =
                mode === "Online"
                    ? { date: "", startTime: "", endTime: "" }
                    : { date: "", startTime: "", endTime: "", location: "" };
            updated.session[`${mode.toLowerCase()}Slots`] = [
                ...(updated.session[`${mode.toLowerCase()}Slots`] || []),
                newSlot,
            ];
            return updated;
        });
    };

    const _removeSessionSlot = (mode, index) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const slots = [...updated.session[`${mode.toLowerCase()}Slots`]];
            slots.splice(index, 1);
            updated.session[`${mode.toLowerCase()}Slots`] = slots;
            return updated;
        });
    };

    // Additional slot handlers for backward compatibility and specific use cases
    const _handleOnlineSlotChange = (index, field, value) => {
        handleSessionSlotChange("Online", index, field, value);
    };

    const _addOfflineSlot = () => {
        addSessionSlot("Offline");
    };

    const _addOnlineSlot = () => {
        addSessionSlot("Online");
    };

    const moveSlide = async (from, to) => {
        try {
            // Reorder guides themselves (each guide has a single slide used as its card)
            const updatedGuides = [...guides];
            if (
                from < 0 ||
                from >= updatedGuides.length ||
                to < 0 ||
                to >= updatedGuides.length
            ) {
                console.warn("Invalid slide move indexes");
                return;
            }

            const [movedGuide] = updatedGuides.splice(from, 1);
            updatedGuides.splice(to, 0, movedGuide);

            // Update local UI list of slides
            setSlideData(buildSlideData(updatedGuides));

            // Update Redux and persist reordered guides list (stored in Firestore as 'slides')
            dispatch(setGuides(updatedGuides));
            await saveOrUpdateGuideData(uid, "slides", updatedGuides);
        } catch (err) {
            console.error("Error moving slide:", err);
        }
    };

    const removeSlide = async (index) => {
        try {
            if (!uid) throw new Error("User not logged in");

            // Remove from Firestore first
            await deleteSlideByIndex(uid, index);

            // Remove from Redux store
            const updatedGuides = guides.filter((_, i) => i !== index);
            dispatch(setGuides(updatedGuides));

            // Update local states if you're keeping them for form rendering
            setFormData((prev) => ({
                ...prev,
                slides: prev.slides?.filter((_, i) => i !== index) || [],
            }));

            setSlideData((prev) => prev.filter((_, i) => i !== index));

            toast.success("Guide removed successfully");
        } catch (err) {
            console.error("Error removing slide:", err);
        }
    };

    const toggleSlideVisibility = async (index) => {
        try {
            const updatedGuides = [...guides];
            if (!updatedGuides[index]) return;

            updatedGuides[index] = {
                ...updatedGuides[index],
                active: updatedGuides[index].active === false,
            };

            dispatch(setGuides(updatedGuides));
            setAllData(updatedGuides);
            setSlideData(buildSlideData(updatedGuides));
            await saveOrUpdateGuideData(uid, "slides", updatedGuides);
            showSuccess(
                updatedGuides[index].active
                    ? "Guide is now visible"
                    : "Guide is now hidden",
            );
        } catch (err) {
            console.error("Error toggling guide visibility:", err);
            showError("Failed to update guide visibility");
        }
    };

    const editSlide = async (index) => {
        // Check against slideData instead of allData since that's what the UI shows
        if (index < 0 || index >= slideData.length) {
            console.error(
                "Invalid index for edit:",
                index,
                "slideData length:",
                slideData.length,
            );
            showError("Invalid slide index");
            return;
        }

        // Show loading state
        setIsLoading(true);

        let slideToEdit;

        // Resolve the full guide object for the clicked slide.
        // The list UI shows slideData (flattened slides), but the form expects a full guide object
        // containing guideCard, organizer, online/offline, etc.
        try {
            const clickedSlide = slideData[index];

            // Prefer matching by unique title to locate the parent guide
            if (clickedSlide?.title && Array.isArray(guides)) {
                slideToEdit = guides.find(
                    (g) => g?.guideCard?.title === clickedSlide.title,
                );
            }

            // If not found in current Redux state, fetch latest and try again
            if (!slideToEdit) {
                const latestData = await fetchGuideData(uid);
                setAllData(latestData);

                // Some backends return an object with a `slides` array of guides
                let guidesArray = Array.isArray(latestData) ? latestData : [];
                if (!guidesArray.length && latestData && latestData.slides) {
                    // if `slides` is an object or array of guide entries, normalize it
                    const raw = latestData.slides;
                    const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
                    guidesArray = arr;
                }

                slideToEdit = guidesArray.find(
                    (g) => g?.guideCard?.title === clickedSlide?.title,
                );
            }

            if (!slideToEdit) {
                setIsLoading(false);
                showError(
                    "Could not resolve the guide for this slide. Please ensure the slide title matches the guide title.",
                );
                return;
            }

        } catch (error) {
            console.error("Error in editSlide:", error);
            setIsLoading(false);
            showError("Failed to load slide data for editing.");
            return;
        }

        // Normalize types and add stable ids for backward compatibility
        const normalizeSlots = (slots = []) =>
            slots.map((s) => ({
                ...s,
                id: s?.id || uuidv4(),
                type: s?.type || "individual",
            }));
        const normalizeWeekly = (wp = []) =>
            (wp || []).map((r) => ({
                ...r,
                times: (r?.times || []).map((t) => ({
                    ...t,
                    id: t?.id || uuidv4(),
                    type: t?.type || "individual",
                })),
            }));

        // Update formData with the slide being edited
        setFormData((prev) => ({
            ...prev,
            guideCard: {
                title: slideToEdit?.guideCard?.title,
                category: slideToEdit?.guideCard?.category,
                subCategory: slideToEdit?.guideCard?.subCategory || "",
                price: slideToEdit?.guideCard?.price,
                gst: slideToEdit?.guideCard?.gst || "",
                thumbnail: slideToEdit?.guideCard?.thumbnail || null,
                thumbnailType: slideToEdit?.guideCard?.thumbnailType || null,
                description: slideToEdit?.guideCard?.description || "",
                listingType: slideToEdit?.guideCard?.listingType || "Listing", // Default to "Listing" if not present
            },
            organizer: {
                name: slideToEdit?.organizer?.name || "",
                email: slideToEdit?.organizer?.email || "",
                address: slideToEdit?.organizer?.address || "",
                googleMeetLink: slideToEdit?.organizer?.googleMeetLink || "",
                contactNumber: slideToEdit?.organizer?.contactNumber || "",
            },
            online: {
                planChoice: slideToEdit?.online?.planChoice || "One Time",
                monthly: {
                    price: slideToEdit?.online?.monthly?.price || "",
                    discount: slideToEdit?.online?.monthly?.discount || "",
                    description: slideToEdit?.online?.monthly?.description || "",
                    sessionsCount: slideToEdit?.online?.monthly?.sessionsCount || "",
                    slots: normalizeSlots(slideToEdit?.online?.monthly?.slots || []),
                    weeklyPattern: normalizeWeekly(
                        slideToEdit?.online?.monthly?.weeklyPattern || [],
                    ),
                    dayBasedPattern:
                        slideToEdit?.online?.monthly?.dayBasedPattern || null,
                    groupMin: slideToEdit?.online?.monthly?.groupMin || "",
                    groupMax: slideToEdit?.online?.monthly?.groupMax || "",
                    occupancies: slideToEdit?.online?.monthly?.occupancies || [
                        { type: "Individual", price: "" },
                    ],
                },
                oneTime: {
                    price: slideToEdit?.online?.oneTime?.price || "",
                    slots: normalizeSlots(slideToEdit?.online?.oneTime?.slots || []),
                    occupancies: slideToEdit?.online?.oneTime?.occupancies || [
                        { type: "Individual", price: "" },
                    ],
                },
            },
            offline: {
                planChoice: slideToEdit?.offline?.planChoice || "One Time",
                monthly: {
                    price: slideToEdit?.offline?.monthly?.price || "",
                    discount: slideToEdit?.offline?.monthly?.discount || "",
                    sessionsCount: slideToEdit?.offline?.monthly?.sessionsCount || "",
                    slots: normalizeSlots(slideToEdit?.offline?.monthly?.slots || []),
                    description: slideToEdit?.offline?.monthly?.description || "",
                    weeklyPattern: normalizeWeekly(
                        slideToEdit?.offline?.monthly?.weeklyPattern || [],
                    ),
                    dayBasedPattern:
                        slideToEdit?.offline?.monthly?.dayBasedPattern || null,
                    groupMin: slideToEdit?.offline?.monthly?.groupMin || "",
                    groupMax: slideToEdit?.offline?.monthly?.groupMax || "",
                    occupancies: slideToEdit?.offline?.monthly?.occupancies || [
                        { type: "Individual", price: "" },
                    ],
                },
                oneTime: {
                    price: slideToEdit?.offline?.oneTime?.price || "",
                    slots: normalizeSlots(slideToEdit?.offline?.oneTime?.slots || []),
                    occupancies: slideToEdit?.offline?.oneTime?.occupancies || [
                        { type: "Individual", price: "" },
                    ],
                },
            },
            session: {
                sessiondescription: slideToEdit?.session?.sessiondescription || "",
                images: slideToEdit?.session?.images || [],
                videos: slideToEdit?.session?.videos || [],
                title: slideToEdit?.session?.title || "",
                description: slideToEdit?.session?.description || "",
                freeTrialVideo: slideToEdit?.session?.freeTrialVideo || null,
            },
            guide: slideToEdit?.guide || [
                { title: "", description: "", image: null },
            ],
            slides: slideToEdit?.slides || [],
        }));

        // Update slideData to reflect the slide being edited
        setSlideData((prev) => {
            const updated = [...prev];
            updated[index] = slideToEdit;
            return updated;
        });

        setIsEditing(true);
        setEditIndex(index);

        // Preselect calendar dates (one-time) so slots are visible immediately
        try {
            const firstOnlineOT = (slideToEdit?.online?.oneTime?.slots || []).find(
                (s) => !!s?.date,
            );
            if (firstOnlineOT?.date) {
                const d = new Date(ymd(firstOnlineOT.date));
                setOtOnlineDate(ymd(firstOnlineOT.date));
                if (!isNaN(d.getTime()))
                    setOtOnlineMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }
        } catch (error) {
            console.debug("Unable to preselect online one-time date", error);
        }
        try {
            const firstOfflineOT = (slideToEdit?.offline?.oneTime?.slots || []).find(
                (s) => !!s?.date,
            );
            if (firstOfflineOT?.date) {
                const d = new Date(ymd(firstOfflineOT.date));
                setOtOfflineDate(ymd(firstOfflineOT.date));
                if (!isNaN(d.getTime()))
                    setOtOfflineMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }
        } catch (error) {
            console.debug("Unable to preselect offline one-time date", error);
        }

        // Hide loading state
        setIsLoading(false);

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditIndex(null);
        setFormData((prev) => ({
            ...prev,
            guideCard: {
                title: "",
                category: "",
                subCategory: "",
                price: "",
                gst: "",
                thumbnail: null,
                thumbnailType: null,
                description: "",
                listingType: "Listing", // Reset to default "Listing"
            },
            openSlots: [],
            online: {
                planChoice: "One Time",
                monthly: {
                    price: "",
                    individualPrice: "",
                    couplesPrice: "",
                    groupPrice: "",
                    groupMin: "",
                    groupMax: "",
                    discount: "",
                    description: "",
                    sessionsCount: "",
                    slots: [{ date: "", startTime: "", endTime: "", type: "individual" }],
                    weeklyPattern: [],
                },
                oneTime: {
                    price: "",
                    individualPrice: "",
                    couplesPrice: "",
                    groupPrice: "",
                    groupMin: "",
                    groupMax: "",
                    slots: [{ date: "", startTime: "", endTime: "", type: "individual" }],
                },
            },
            offline: {
                planChoice: "One Time",
                monthly: {
                    price: "",
                    individualPrice: "",
                    couplesPrice: "",
                    groupPrice: "",
                    groupMin: "",
                    groupMax: "",
                    discount: "",
                    description: "",
                    sessionsCount: "",
                    slots: [{ date: "", startTime: "", endTime: "", type: "individual" }],
                    weeklyPattern: [],
                },
                oneTime: {
                    price: "",
                    individualPrice: "",
                    couplesPrice: "",
                    groupPrice: "",
                    groupMin: "",
                    groupMax: "",
                    slots: [{ date: "", startTime: "", endTime: "", type: "individual" }],
                },
            },
            organizer: {
                name: "",
                email: "",
                address: "",
                googleMeetLink: "",
                contactNumber: "",
            },
            session: {
                sessiondescription: "",
                images: [],
                videos: [],
                title: "",
                description: "",
                freeTrialVideo: null,
            },
            guide: [{ title: "", description: "", image: null }],
            guideSlots: [{ date: "", startTime: "", endTime: "" }],
        }));
    };

    const addNewCategory = () => {
        const newCategory = prompt("Enter new category name:");
        if (newCategory && !categories.includes(newCategory)) {
            setCategories((prev) => [...prev, newCategory]);
        }
    };

    // ========== Common Open Slots (Weekly) Handlers ==========
    const weekdayOptions = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const _addOpenSlot = () => {
        setFormData((prev) => ({
            ...prev,
            openSlots: [
                ...(prev.openSlots || []),
                { days: [], times: [{ startTime: "", endTime: "" }] },
            ],
        }));
    };

    const _removeOpenSlot = (index) => {
        setFormData((prev) => ({
            ...prev,
            openSlots: (prev.openSlots || []).filter((_, i) => i !== index),
        }));
    };

    const _toggleOpenSlotDay = (index, day) => {
        setFormData((prev) => {
            const next = [...(prev.openSlots || [])];
            const set = new Set(next[index].days || []);
            if (set.has(day)) set.delete(day);
            else set.add(day);
            next[index].days = Array.from(set);
            return { ...prev, openSlots: next };
        });
    };

    const _addOpenSlotTime = (index) => {
        setFormData((prev) => {
            const next = [...(prev.openSlots || [])];
            next[index].times = [
                ...(next[index].times || []),
                { startTime: "", endTime: "" },
            ];
            return { ...prev, openSlots: next };
        });
    };

    const _updateOpenSlotTime = (index, tIndex, field, value) => {
        setFormData((prev) => {
            const next = [...(prev.openSlots || [])];
            const times = [...(next[index].times || [])];
            times[tIndex] = { ...times[tIndex], [field]: value };
            next[index].times = times;
            return { ...prev, openSlots: next };
        });
    };

    const _removeOpenSlotTime = (index, tIndex) => {
        setFormData((prev) => {
            const next = [...(prev.openSlots || [])];
            const times = [...(next[index].times || [])];
            times.splice(tIndex, 1);
            next[index].times = times;
            return { ...prev, openSlots: next };
        });
    };

    // ========== Monthly Weekly Pattern Handlers (Online/Offline) ==========
    const _addMonthlyPatternRow = (modeKey) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            list.push({ days: [], times: [{ startTime: "", endTime: "" }] });
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    const removeMonthlyPatternRow = (modeKey, rowIdx) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            list.splice(rowIdx, 1);
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    const toggleMonthlyPatternDay = (modeKey, rowIdx, day) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            const set = new Set(list[rowIdx].days || []);
            if (set.has(day)) set.delete(day);
            else set.add(day);
            list[rowIdx].days = Array.from(set);
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    const addMonthlyPatternTime = (modeKey, rowIdx) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            list[rowIdx].times = [
                ...(list[rowIdx].times || []),
                { startTime: "", endTime: "", type: "individual" },
            ];
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    const updateMonthlyPatternTime = (modeKey, rowIdx, tIdx, field, value) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            const times = [...(list[rowIdx].times || [])];
            times[tIdx] = { ...times[tIdx], [field]: value };
            list[rowIdx].times = times;
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    const removeMonthlyPatternTime = (modeKey, rowIdx, tIdx) => {
        setFormData((prev) => {
            const next = { ...prev };
            const list = [...(next[modeKey].monthly.weeklyPattern || [])];
            const times = [...(list[rowIdx].times || [])];
            times.splice(tIdx, 1);
            list[rowIdx].times = times;
            next[modeKey].monthly.weeklyPattern = list;
            return next;
        });
    };

    // Quick-setup: create 7 rows (Sun..Sat), each with its own times, recurring weekly
    const _initWeekdayRows = (modeKey) => {
        setFormData((prev) => {
            const next = { ...prev };
            const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            // Preserve existing weeklyPattern if it exists
            const existingPattern = next[modeKey].monthly.weeklyPattern || [];
            const existingDays = new Set();

            // Collect existing days to avoid duplicates
            existingPattern.forEach((row) => {
                if (row.days && Array.isArray(row.days)) {
                    row.days.forEach((day) => existingDays.add(day));
                }
            });

            // Only add missing weekdays, preserve existing ones
            const newRows = weekdays
                .filter((day) => !existingDays.has(day))
                .map((day) => ({
                    days: [day],
                    times: [{ startTime: "", endTime: "", type: "individual" }],
                }));

            // Combine existing pattern with new rows
            next[modeKey].monthly.weeklyPattern = [...existingPattern, ...newRows];

            return next;
        });
    };

    // ========== New Day-Based Weekly Pattern Functions ==========
    const initializeDayBasedWeeklyPattern = (modeKey) => {
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            const weekdays = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ];

            // Preserve existing dayBasedPattern if it exists
            const existingPattern = next[modeKey].monthly.dayBasedPattern || {};

            // Only initialize missing days, preserve existing ones
            const newPattern = { ...existingPattern };
            weekdays.forEach((day) => {
                if (!newPattern[day]) {
                    newPattern[day] = { slots: [] };
                }
            });

            next[modeKey].monthly.dayBasedPattern = newPattern;
            return next;
        });
    };

    const addSlotToDay = (modeKey, dayName) => {
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone to avoid frozen object issues
            if (!next[modeKey].monthly.dayBasedPattern) {
                next[modeKey].monthly.dayBasedPattern = {};
            }
            if (!next[modeKey].monthly.dayBasedPattern[dayName]) {
                next[modeKey].monthly.dayBasedPattern[dayName] = { slots: [] };
            }
            next[modeKey].monthly.dayBasedPattern[dayName].slots.push({
                startTime: "",
                endTime: "",
                type: "individual",
            });

            return next;
        });
    };

    const updateDaySlot = (modeKey, dayName, slotIndex, field, value) => {
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            if (
                next[modeKey].monthly.dayBasedPattern?.[dayName]?.slots?.[slotIndex]
            ) {
                next[modeKey].monthly.dayBasedPattern[dayName].slots[slotIndex][field] =
                    value;
            }
            return next;
        });
    };

    const removeDaySlot = (modeKey, dayName, slotIndex) => {
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            if (next[modeKey].monthly.dayBasedPattern?.[dayName]?.slots) {
                next[modeKey].monthly.dayBasedPattern[dayName].slots.splice(
                    slotIndex,
                    1,
                );
            }
            return next;
        });
    };

    const replicateWeekToMonth = (modeKey) => {
        setFormData((prev) => {
            const next = { ...prev };
            const slotBasedPattern = next[modeKey].monthly.slotBasedPattern;
            const dayPattern = next[modeKey].monthly.dayBasedPattern;

            // Check if slot-based pattern exists and has data
            if (slotBasedPattern && slotBasedPattern.length > 0) {
                // Convert slot-based pattern to weeklyPattern format
                const weeklyPattern = [];
                const dayMap = {
                    Monday: "Mon",
                    Tuesday: "Tue",
                    Wednesday: "Wed",
                    Thursday: "Thu",
                    Friday: "Fri",
                    Saturday: "Sat",
                    Sunday: "Sun",
                };

                slotBasedPattern.forEach((slot) => {
                    // Validate slot has time and at least one day selected
                    if (
                        slot &&
                        slot.startTime &&
                        slot.endTime &&
                        slot.startTime.trim() !== "" &&
                        slot.endTime.trim() !== "" &&
                        slot.days &&
                        slot.days.length > 0
                    ) {
                        // Convert selected days to short format
                        const shortDays = slot.days.map((day) => dayMap[day]).filter(Boolean);

                        if (shortDays.length > 0) {
                            weeklyPattern.push({
                                days: shortDays,
                                times: [
                                    {
                                        startTime: slot.startTime,
                                        endTime: slot.endTime,
                                        type: slot.type || "individual",
                                        bookedCount: slot.bookedCount || 0,
                                    },
                                ],
                            });
                        }
                    }
                });

                if (weeklyPattern.length === 0) {
                    showError(
                        "❌ No valid slots found. Please add time slots and select days for each slot.",
                    );
                    return prev;
                }

                next[modeKey].monthly.weeklyPattern = weeklyPattern;
                showSuccess(
                    `✅ Slot pattern applied! ${weeklyPattern.length} time slot(s) will repeat on selected days every week.`,
                );
                return next;
            }

            // Fallback to day-based pattern if slot-based doesn't exist
            if (!dayPattern || Object.keys(dayPattern).length === 0) {
                showError(
                    "❌ No pattern found to replicate. Please add slots first using either 'Slot-First Setup' or 'Day-Based Setup'.",
                );
                return prev;
            }

            // Convert day-based pattern to old weeklyPattern format for compatibility
            const weeklyPattern = [];
            Object.entries(dayPattern).forEach(([dayName, dayData]) => {
                // Check if dayData exists and has slots
                if (
                    dayData &&
                    dayData.slots &&
                    Array.isArray(dayData.slots) &&
                    dayData.slots.length > 0
                ) {
                    // Map day names to short format
                    const dayMap = {
                        Monday: "Mon",
                        Tuesday: "Tue",
                        Wednesday: "Wed",
                        Thursday: "Thu",
                        Friday: "Fri",
                        Saturday: "Sat",
                        Sunday: "Sun",
                    };
                    const shortDay = dayMap[dayName];

                    // Filter out empty slots and process valid ones
                    const validSlots = dayData.slots.filter(
                        (slot) =>
                            slot &&
                            slot.startTime &&
                            slot.endTime &&
                            slot.startTime.trim() !== "" &&
                            slot.endTime.trim() !== "",
                    );

                    if (validSlots.length > 0) {
                        // Process each slot and ensure proper format
                        const processedTimes = validSlots.map((slot) => ({
                            startTime: slot.startTime || "",
                            endTime: slot.endTime || "",
                            type: slot.type || "individual",
                            bookedCount: slot.bookedCount || 0,
                        }));

                        weeklyPattern.push({
                            days: [shortDay],
                            times: processedTimes,
                        });

                    } else {
                        console.log(`❌ ${dayName} has no valid slots (empty times)`);
                    }
                } else {
                    console.log(`❌ ${dayName} has no slots or invalid structure`);
                }
            });

            if (weeklyPattern.length === 0) {
                showError(
                    "❌ No valid slots found to replicate. Please add time slots to your days.",
                );
                return prev;
            }

            next[modeKey].monthly.weeklyPattern = weeklyPattern;

            showSuccess(
                `✅ Week pattern replicated! ${weeklyPattern.length} day(s) will repeat every week.`,
            );
            return next;
        });
    };

    // ========== NEW: Slot-First Approach Functions ==========
    // Structure: slotBasedPattern: [{ startTime, endTime, type, days: ["Monday", "Tuesday", ...] }]
    
    const initializeSlotBasedPattern = (modeKey) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (!next[modeKey].monthly.slotBasedPattern) {
                next[modeKey].monthly.slotBasedPattern = [];
            }
            return next;
        });
    };

    const addTimeSlot = (modeKey) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (!next[modeKey].monthly.slotBasedPattern) {
                next[modeKey].monthly.slotBasedPattern = [];
            }
            next[modeKey].monthly.slotBasedPattern.push({
                startTime: "",
                endTime: "",
                type: "individual",
                days: []
            });
            return next;
        });
    };

    const updateTimeSlot = (modeKey, slotIndex, field, value) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (next[modeKey].monthly.slotBasedPattern?.[slotIndex]) {
                next[modeKey].monthly.slotBasedPattern[slotIndex][field] = value;
            }
            return next;
        });
    };

    const toggleSlotDay = (modeKey, slotIndex, day) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (next[modeKey].monthly.slotBasedPattern?.[slotIndex]) {
                const slot = next[modeKey].monthly.slotBasedPattern[slotIndex];
                const daySet = new Set(slot.days || []);
                if (daySet.has(day)) {
                    daySet.delete(day);
                } else {
                    daySet.add(day);
                }
                slot.days = Array.from(daySet);
            }
            return next;
        });
    };

    const removeTimeSlot = (modeKey, slotIndex) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (next[modeKey].monthly.slotBasedPattern) {
                next[modeKey].monthly.slotBasedPattern.splice(slotIndex, 1);
            }
            return next;
        });
    };

    const [otOnlineMonth, setOtOnlineMonth] = useState(() => new Date());
    const [otOnlineDate, setOtOnlineDate] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [otOfflineMonth, setOtOfflineMonth] = useState(() => new Date());
    const [otOfflineDate, setOtOfflineDate] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [onlineMonthlyViewType, _setOnlineMonthlyViewType] =
        useState("individual");
    const [offlineMonthlyViewType, _setOfflineMonthlyViewType] =
        useState("individual");

    const fmtYMD = (d) => {
        if (!(d instanceof Date)) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    };

    // Normalize various date shapes (string, Date, Firestore Timestamp) to YYYY-MM-DD
    const ymd = (val) => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (val instanceof Date) return fmtYMD(val);
        // Firestore Timestamp support {seconds, nanoseconds}
        if (typeof val === "object" && typeof val.seconds === "number") {
            return fmtYMD(new Date(val.seconds * 1000));
        }
        try {
            return fmtYMD(new Date(val));
        } catch {
            return "";
        }
    };

    const calGrid = (monthDate) => {
        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const startIdx = start.getDay();
        const cells = [];
        for (let i = 0; i < startIdx; i++) cells.push(null);
        for (let d = 1; d <= end.getDate(); d++)
            cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
        while (cells.length % 7 !== 0 || cells.length < 42) cells.push(null);
        return cells;
    };

    const isPast = (dateObj) => {
        if (!dateObj) return true;
        const today = new Date();
        return fmtYMD(dateObj) < fmtYMD(today);
    };

    const prevMonthGuard = (setter, current) => {
        const today = new Date();
        const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const target = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        if (target < minMonth) return;
        setter(target);
    };

    // Apply pending multi slot to all selected online dates
    const applyOtOnlinePending = () => {
        const { startTime, endTime, type } = otOnlinePending;
        if (!startTime || !endTime) return;
        if (endTime <= startTime) return;
        const todayYmd = fmtYMD(new Date());
        const valid = (otOnlineSelectedDates || []).filter(
            (d) => d && d >= todayYmd,
        );
        if (valid.length === 0) return;
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            const slots = next.online.oneTime.slots || [];
            next.online.oneTime.slots = [
                ...slots,
                ...valid.map((date) => ({
                    id: uuidv4(),
                    date,
                    startTime,
                    endTime,
                    type: type || "individual",
                })),
            ];
            return next;
        });
        setOtOnlinePending({
            open: false,
            startTime: "",
            endTime: "",
            type: "individual",
        });
        // Clear multi-selection after applying
        setOtOnlineSelectedDates([]);
        setOtOnlineMulti(false);
    };

    // Apply pending multi slot to all selected offline dates
    const applyOtOfflinePending = () => {
        const { startTime, endTime, type } = otOfflinePending;
        if (!startTime || !endTime) return;
        if (endTime <= startTime) return;
        const todayYmd = fmtYMD(new Date());
        const valid = (otOfflineSelectedDates || []).filter(
            (d) => d && d >= todayYmd,
        );
        if (valid.length === 0) return;
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            const slots = next.offline.oneTime.slots || [];
            next.offline.oneTime.slots = [
                ...slots,
                ...valid.map((date) => ({
                    id: uuidv4(),
                    date,
                    startTime,
                    endTime,
                    type: type || "individual",
                })),
            ];
            return next;
        });
        setOtOfflinePending({
            open: false,
            startTime: "",
            endTime: "",
            type: "individual",
        });
        // Clear multi-selection after applying
        setOtOfflineSelectedDates([]);
        setOtOfflineMulti(false);
    };

    // One-time slot CRUD using existing add/remove handlers
    const addOneTimeSlotFor = (modeKey, dateYmd) => {
        if (!dateYmd) return;
        const todayYmd = fmtYMD(new Date());
        if (dateYmd < todayYmd) return;

        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            const newSlot = {
                id: uuidv4(),
                date: dateYmd,
                startTime: "",
                endTime: "",
                type: "individual", // Default to individual type
            };

            if (!next[modeKey].oneTime.slots) {
                next[modeKey].oneTime.slots = [];
            }
            next[modeKey].oneTime.slots.push(newSlot);

            return next;
        });
    };

    // Update/remove one-time slot by unique id for robust editing
    const updateOneTimeSlot = (modeKey, slotId, field, value) => {

        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            const slots = next[modeKey].oneTime.slots || [];
            const slotIndex = slots.findIndex((s) => s.id === slotId);

            if (slotIndex !== -1) {
                // Ensure slot has all required fields with proper defaults
                const currentSlot = slots[slotIndex];
                slots[slotIndex] = {
                    id: currentSlot.id || slotId,
                    date: currentSlot.date || "",
                    startTime: currentSlot.startTime || "",
                    endTime: currentSlot.endTime || "",
                    type: currentSlot.type || "individual",
                    [field]: value, // Update the specific field
                };

            } else {
                console.error(`❌ Slot not found: ${slotId}`);
            }

            return next;
        });
    };

    const removeOneTimeSlot = (modeKey, slotId) => {
        setFormData((prev) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            next[modeKey].oneTime.slots = (next[modeKey].oneTime.slots || []).filter(
                (s) => s.id !== slotId,
            );
            return next;
        });
    };

    // ... (rest of the code remains the same)
    //     if (!isPriceValid(formData.offline.monthly.price)) newErrors.monthlyOfflinePrice = "Invalid Monthly Offline Price";
    //     if (formData.offline.monthly.discount && isNaN(formData.offline.monthly.discount))
    //         newErrors.monthlyOfflineDiscount = "Offline Monthly Discount must be number";

    //     if (!isPriceValid(formData.online.quarterly.price)) newErrors.quarterlyOnlinePrice = "Invalid Quarterly Online Price";
    //     if (formData.online.quarterly.discount && isNaN(formData.online.quarterly.discount))
    //         newErrors.quarterlyOnlineDiscount = "Online Quarterly Discount must be number";

    //     if (!isPriceValid(formData.offline.quarterly.price)) newErrors.quarterlyOfflinePrice = "Invalid Quarterly Offline Price";
    //     if (formData.offline.quarterly.discount && isNaN(formData.offline.quarterly.discount))
    //         newErrors.quarterlyOfflineDiscount = "Offline Quarterly Discount must be number";

    //     if (!formData.organizer.name) newErrors.organizerName = "Organizer name is required";
    //     if (!formData.organizer.email) newErrors.organizerEmail = "Organizer email is required";
    //     if (!formData.organizer.googleMeetLink) newErrors.organizerGoogleMeetLink = "Google Meet link is required";

    //     if (!isPriceValid(formData.online.oneTime.price)) newErrors.oneTimeOnlinePrice = "Invalid Online One-Time Price";
    //     if (!isPriceValid(formData.offline.oneTime.price)) newErrors.oneTimeOfflinePrice = "Invalid Offline One-Time Price";

    //     setErrors(newErrors);
    //     return Object.keys(newErrors).length === 0;
    // };

    // Monitor thumbnail changes
    // useEffect(() => {
    //     if (formData?.guideCard?.thumbnail) {
    //         console.log("Thumbnail updated in state: ", formData.guideCard.thumbnail);
    //         console.log("Thumbnail type: ", formData.guideCard.thumbnailType);
    //         console.log("Is video file: ", formData.guideCard.thumbnailType?.startsWith('video/'));
    //     }
    // }, [formData?.guideCard?.thumbnail, formData?.guideCard?.thumbnailType]);

    useEffect(() => {
        const loadCards = async () => {
            try {
                const guides = await fetchGuideData(uid);

                // Handle both object and array structures
                let slidesData = [];
                if (guides.slides) {
                    // If slides is an object, convert to array
                    if (
                        typeof guides.slides === "object" &&
                        !Array.isArray(guides.slides)
                    ) {
                        slidesData = Object.values(guides.slides);
                    } else if (Array.isArray(guides.slides)) {
                        slidesData = guides.slides;
                    }
                }

                setAllData(slidesData);
                // Keep Redux state in sync with fetched data
                dispatch(setGuides(slidesData));

                if (slidesData.length > 0) {
                    setSlideData(buildSlideData(slidesData));
                }
            } catch (err) {
                console.error("Error fetching guide cards:", err);
            }
        };

        loadCards();
    }, [uid, dispatch]);

    const onSaveRetreat = async () => {
        // if (!validateFields()) {
        //     alert("Fix validation errors");
        //     return;
        // }

        // Validate organizer email, phone number, and Google Meet link (compulsory for new guides)
        if (!isEditing) {
            if (
                !formData?.organizer?.email ||
                formData?.organizer?.email.trim() === ""
            ) {
                showError("Organizer email is required!");
                return;
            }
            if (
                !formData?.organizer?.contactNumber ||
                formData?.organizer?.contactNumber.trim() === ""
            ) {
                showError("Organizer phone number is required!");
                return;
            }
            // Only require Google Meet link for Online or Both modes
            const hasOnlineMode =
                formData?.guideCard?.subCategory === "Online" ||
                formData?.guideCard?.subCategory === "Both";
            if (
                hasOnlineMode &&
                (!formData?.organizer?.googleMeetLink ||
                    formData?.organizer?.googleMeetLink.trim() === "")
            ) {
                showError("Google Meet link is required for online mode!");
                return;
            }
        }

        const newCard = {
            guideCard: { ...formData.guideCard },
            active:
                isEditing && editIndex !== null
                    ? guides[editIndex]?.active !== false
                    : true,
            organizer: { ...formData.organizer },
            openSlots: [...(formData.openSlots || [])],
            online: { ...formData.online },
            offline: { ...formData.offline },
            session: { ...formData.session },
            guide: [...formData.guide],
            slides: [
                {
                    title: formData.guideCard.title,
                    thumbnail: formData.guideCard.thumbnail,
                    thumbnailType: formData.guideCard.thumbnailType,
                },
            ],
        };

        try {
            if (!uid) throw new Error("User not logged in");

            let updatedGuides;

            if (isEditing && editIndex !== null) {
                // Replace the existing card at editIndex
                updatedGuides = [...guides];
                updatedGuides[editIndex] = newCard;
            } else {
                // Add a new card
                updatedGuides = [...guides, newCard];
            }

            // Save organizer data to root organizers collection (for both new and edit)
            // Helper function to clean undefined/null values from objects
            const cleanUndefined = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(cleanUndefined);
                } else if (obj !== null && typeof obj === "object") {
                    return Object.fromEntries(
                        Object.entries(obj)
                            .filter(([, v]) => v !== undefined && v !== null && v !== "")
                            .map(([k, v]) => [k, cleanUndefined(v)]),
                    );
                }
                return obj;
            };

            // Determine mode based on online/offline selection
            const hasOnline =
                formData?.online?.planChoice && formData.online.planChoice !== "";
            const hasOffline =
                formData?.offline?.planChoice && formData.offline.planChoice !== "";

            let mode = "";
            if (hasOnline && hasOffline) {
                mode = "both";
            } else if (hasOnline) {
                mode = "online";
            } else if (hasOffline) {
                mode = "offline";
            }

            // Build program data with only relevant mode data
            const rawProgramData = {
                title: formData?.guideCard?.title || "",
                price: formData?.guideCard?.price || "",
                category: formData?.guideCard?.category || "",
                mode: mode,
            };

            // Helper function to add slots to occupancies
            const addSlotsToOccupancies = (occupancies, slots) => {
                if (!Array.isArray(occupancies)) return [];
                return occupancies.map((occ) => ({
                    ...occ,
                    slots: Array.isArray(slots) ? slots : [],
                }));
            };

            // Add online plan details only if mode is 'online' or 'both'
            if (mode === "online" || mode === "both") {
                rawProgramData.online = {};

                if (
                    formData.online.planChoice === "Monthly" ||
                    formData.online.planChoice === "Both"
                ) {
                    rawProgramData.online.monthly = {
                        price: formData?.online?.monthly?.price || "",
                        individualPrice: formData?.online?.monthly?.individualPrice || "",
                        couplesPrice: formData?.online?.monthly?.couplesPrice || "",
                        groupPrice: formData?.online?.monthly?.groupPrice || "",
                        groupMin: formData?.online?.monthly?.groupMin || "",
                        groupMax: formData?.online?.monthly?.groupMax || "",
                        discount: formData?.online?.monthly?.discount || "",
                        sessionsCount: formData?.online?.monthly?.sessionsCount || "",
                        occupancies: addSlotsToOccupancies(
                            formData?.online?.monthly?.occupancies || [],
                            formData?.online?.monthly?.slots || [],
                        ),
                    };
                }

                if (
                    formData.online.planChoice === "One Time" ||
                    formData.online.planChoice === "Both"
                ) {
                    rawProgramData.online.oneTime = {
                        price: formData?.online?.oneTime?.price || "",
                        individualPrice: formData?.online?.oneTime?.individualPrice || "",
                        couplesPrice: formData?.online?.oneTime?.couplesPrice || "",
                        groupPrice: formData?.online?.oneTime?.groupPrice || "",
                        groupMin: formData?.online?.oneTime?.groupMin || "",
                        groupMax: formData?.online?.oneTime?.groupMax || "",
                        occupancies: addSlotsToOccupancies(
                            formData?.online?.oneTime?.occupancies || [],
                            formData?.online?.oneTime?.slots || [],
                        ),
                    };
                }
            }

            // Add offline plan details only if mode is 'offline' or 'both'
            if (mode === "offline" || mode === "both") {
                rawProgramData.offline = {};

                if (
                    formData.offline.planChoice === "Monthly" ||
                    formData.offline.planChoice === "Both"
                ) {
                    rawProgramData.offline.monthly = {
                        price: formData?.offline?.monthly?.price || "",
                        individualPrice: formData?.offline?.monthly?.individualPrice || "",
                        couplesPrice: formData?.offline?.monthly?.couplesPrice || "",
                        groupPrice: formData?.offline?.monthly?.groupPrice || "",
                        groupMin: formData?.offline?.monthly?.groupMin || "",
                        groupMax: formData?.offline?.monthly?.groupMax || "",
                        discount: formData?.offline?.monthly?.discount || "",
                        sessionsCount: formData?.offline?.monthly?.sessionsCount || "",
                        occupancies: addSlotsToOccupancies(
                            formData?.offline?.monthly?.occupancies || [],
                            formData?.offline?.monthly?.slots || [],
                        ),
                    };
                }

                if (
                    formData.offline.planChoice === "One Time" ||
                    formData.offline.planChoice === "Both"
                ) {
                    rawProgramData.offline.oneTime = {
                        price: formData?.offline?.oneTime?.price || "",
                        individualPrice: formData?.offline?.oneTime?.individualPrice || "",
                        couplesPrice: formData?.offline?.oneTime?.couplesPrice || "",
                        groupPrice: formData?.offline?.oneTime?.groupPrice || "",
                        groupMin: formData?.offline?.oneTime?.groupMin || "",
                        groupMax: formData?.offline?.oneTime?.groupMax || "",
                        occupancies: addSlotsToOccupancies(
                            formData?.offline?.oneTime?.occupancies || [],
                            formData?.offline?.oneTime?.slots || [],
                        ),
                    };
                }
            }

            // Remove undefined/null/empty fields to prevent Firestore error
            const programData = cleanUndefined(rawProgramData);

            const organizerData = {
                name: formData?.organizer?.name,
                email: formData?.organizer?.email,
                number: formData?.organizer?.contactNumber,
                address: formData?.organizer?.address,
                programData: programData,
            };

            // Save organizer data (for both new and existing programs)
            await saveGuideOrganizerData(organizerData);

            // Update Redux store
            dispatch(setGuides(updatedGuides));

            // Also update slideData
            setSlideData(buildSlideData(updatedGuides));

            // Save full updated guides array to Firestore
            await saveOrUpdateGuideData(uid, "slides", updatedGuides);
            showSuccess("Session saved successfully");

            // Reset local form state
            setFormData({
                guideCard: {
                    title: "",
                    category: "",
                    subCategory: "",
                    price: "",
                    gst: "",
                    thumbnail: null,
                    thumbnailType: null,
                    description: "",
                    listingType: "Listing", // Reset to default "Listing"
                },
                online: {
                    planChoice: "One Time",
                    monthly: {
                        price: "",
                        discount: "",
                        slots: [{ date: "", startTime: "", endTime: "" }],
                    },
                    oneTime: {
                        price: "",
                        slots: [{ date: "", startTime: "", endTime: "" }],
                    },
                },
                offline: {
                    planChoice: "One Time",
                    monthly: {
                        price: "",
                        discount: "",
                        slots: [{ date: "", startTime: "", endTime: "" }],
                    },
                    oneTime: {
                        price: "",
                        slots: [{ date: "", startTime: "", endTime: "" }],
                    },
                },
                organizer: {
                    name: "",
                    email: "",
                    address: "",
                    googleMeetLink: "",
                    contactNumber: "",
                },
                session: {
                    sessiondescription: "",
                    images: [],
                    videos: [],
                    title: "",
                    description: "",
                    freeTrialVideo: null,
                },
            });
            setIsEditing(false);
            setEditIndex(null);
        } catch (err) {
            console.error("Error saving retreat:", err);
            showError("Error saving retreat data. Please try again.");
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        const remainingSlots = 11 - formData.session.images.length;
        const filesToProcess = files.slice(0, remainingSlots);

        for (const file of filesToProcess) {
            if (!file.type.startsWith("image/")) {
                console.warn(`${file.name} is not an image, skipping...`);
                continue;
            }

            const uploadId = uuidv4();
            setIsSessionImageUploading((prev) => ({ ...prev, [uploadId]: true }));
            setSessionImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

            try {
                // Create unique path
                const filePath = `pilgrim_guides/session_images/${uuidv4()}_${file.name}`;
                const storageRef = ref(storage, filePath);

                // Upload file with progress tracking
                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress =
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setSessionImageUploadProgress((prev) => ({
                            ...prev,
                            [uploadId]: Math.round(progress),
                        }));
                    },
                    (error) => {
                        console.error(`Error uploading ${file.name}:`, error);
                        setIsSessionImageUploading((prev) => ({
                            ...prev,
                            [uploadId]: false,
                        }));
                        setSessionImageUploadProgress((prev) => ({
                            ...prev,
                            [uploadId]: 0,
                        }));
                    },
                    async () => {
                        // Get download URL
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                        // Append image URL to formData
                        setFormData((prev) => ({
                            ...prev,
                            session: {
                                ...prev.session,
                                images: [...prev.session.images, downloadURL],
                            },
                        }));

                        setIsSessionImageUploading((prev) => ({
                            ...prev,
                            [uploadId]: false,
                        }));
                        setSessionImageUploadProgress((prev) => ({
                            ...prev,
                            [uploadId]: 0,
                        }));
                    },
                );
            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
                setIsSessionImageUploading((prev) => ({ ...prev, [uploadId]: false }));
                setSessionImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));
            }
        }
    };

    const removeImage = async (index) => {
        setFormData((prev) => {
            const imageURL = prev?.session?.images[index];

            // Remove from Firebase Storage
            if (imageURL) {
                const storageRef = ref(storage, imageURL);
                deleteObject(storageRef)
                    .then(() => console.log(`Deleted image from storage: ${imageURL}`))
                    .catch((error) => console.error("Error deleting image:", error));
            }

            // Remove from local state
            return {
                ...prev,
                session: {
                    ...prev.session,
                    images: prev.session.images.filter((_, i) => i !== index),
                },
            };
        });
    };

    const handleVideoUpload = async (e) => {
        const files = Array.from(e.target.files);
        const remainingSlots = 6 - formData.session.videos.length;
        const filesToProcess = files.slice(0, remainingSlots);

        for (const file of filesToProcess) {
            if (file?.type.startsWith("video/")) {
                const uploadId = uuidv4();
                setIsSessionVideoUploading((prev) => ({ ...prev, [uploadId]: true }));
                setSessionVideoUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

                try {
                    const storageRef = ref(storage, `videos/${Date.now()}-${file.name}`);

                    // Upload file with progress tracking
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress =
                                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setSessionVideoUploadProgress((prev) => ({
                                ...prev,
                                [uploadId]: Math.round(progress),
                            }));
                        },
                        (error) => {
                            console.error("Error uploading video:", error);
                            setIsSessionVideoUploading((prev) => ({
                                ...prev,
                                [uploadId]: false,
                            }));
                            setSessionVideoUploadProgress((prev) => ({
                                ...prev,
                                [uploadId]: 0,
                            }));
                        },
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                            setFormData((prev) => ({
                                ...prev,
                                session: {
                                    ...prev.session,
                                    videos: [...prev.session.videos, downloadURL],
                                },
                            }));

                            setIsSessionVideoUploading((prev) => ({
                                ...prev,
                                [uploadId]: false,
                            }));
                            setSessionVideoUploadProgress((prev) => ({
                                ...prev,
                                [uploadId]: 0,
                            }));
                        },
                    );
                } catch (error) {
                    console.error("Error uploading video:", error);
                    setIsSessionVideoUploading((prev) => ({
                        ...prev,
                        [uploadId]: false,
                    }));
                    setSessionVideoUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));
                }
            }
        }
    };

    // Remove video from Firebase Storage & state
    const removeVideo = async (index) => {
        setFormData((prev) => {
            const videoURL = prev?.session?.videos[index];

            if (videoURL) {
                try {
                    // Extract storage path from full URL
                    const path = decodeURIComponent(
                        videoURL.split("/o/")[1].split("?")[0],
                    );
                    const storageRef = ref(storage, path);
                    deleteObject(storageRef)
                        .then(() => console.log(`Deleted video: ${videoURL}`))
                        .catch((error) => console.error("Error deleting video:", error));
                } catch (error) {
                    console.error("Invalid video URL:", error);
                }
            }

            return {
                ...prev,
                session: {
                    ...prev.session,
                    videos: prev.session.videos.filter((_, i) => i !== index),
                },
            };
        });
    };

    const handleFreeTrialVideoUpload = async (file) => {
        if (file && file.type.startsWith("video/")) {
            setIsFreeTrialVideoUploading(true);
            setFreeTrialVideoUploadProgress(0);

            try {
                const storageRef = ref(
                    storage,
                    `freeTrialVideos/${Date.now()}-${file.name}`,
                );

                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress =
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setFreeTrialVideoUploadProgress(Math.round(progress));
                    },
                    (error) => {
                        console.error("Error uploading free trial video:", error);
                        setIsFreeTrialVideoUploading(false);
                        setFreeTrialVideoUploadProgress(0);
                        alert("Error uploading video. Please try again.");
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        handleFieldChange("session", "freeTrialVideo", downloadURL);
                        setIsFreeTrialVideoUploading(false);
                        setFreeTrialVideoUploadProgress(0);
                    },
                );
            } catch (error) {
                console.error("Error uploading free trial video:", error);
                setIsFreeTrialVideoUploading(false);
                setFreeTrialVideoUploadProgress(0);
                alert("Error uploading video. Please try again.");
            }
        }
    };

    const handleFreeTrialDrop = async (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        await handleFreeTrialVideoUpload(file);
    };

    // Occupancy management functions
    const _addOccupancy = () => {
        const updated = [
            ...formData.guideCard.occupancies,
            { type: "", price: "", min: "", max: "" },
        ];
        handleFieldChange("guideCard", "occupancies", updated);
    };

    const _updateOccupancy = (index, field, value) => {
        const updated = [...formData.guideCard.occupancies];
        updated[index] = { ...updated[index], [field]: value };
        handleFieldChange("guideCard", "occupancies", updated);
    };

    const _removeOccupancy = (index) => {
        const updated = [...formData.guideCard.occupancies];
        updated.splice(index, 1);
        handleFieldChange("guideCard", "occupancies", updated);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2F6288]"></div>
                        <span className="text-gray-700">Loading latest data...</span>
                    </div>
                </div>
            )}

            <div className="md:p-8 px-4 py-0 mx-auto">
                {/* Guide Card */}
                <div className="mb-8">
                    {/* Guide Title */}
                    <div className="flex justify-between items-center mb-0">
                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                            {isEditing ? "Edit Pilgrim Guide" : "Add Pilgrim Guide"}{" "}
                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                        </h2>
                        {isEditing && (
                            <button
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    {/* image */}
                    <div className="mb-6">
                        <h3 className="block text-md font-semibold text-gray-700 mb-2">
                            Add Thumbnail
                        </h3>
                        <div
                            className={`border-2 border-dashed h-40 rounded mb-4 flex items-center justify-center cursor-pointer transition-colors ${dragActive
                                    ? "border-[#2F6288] bg-[#2F6288]/10"
                                    : "border-gray-300 hover:bg-gray-50"
                                }`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() =>
                                !isThumbnailUploading &&
                                document.getElementById("thumbnail-upload").click()
                            }
                        >
                            {formData?.guideCard?.thumbnail ? (
                                <div className="relative h-full flex items-center">
                                    {formData?.guideCard?.thumbnailType &&
                                        formData?.guideCard?.thumbnailType.startsWith("video/") ? (
                                        // Video thumbnail
                                        <>
                                            <video
                                                src={formData?.guideCard?.thumbnail}
                                                className="h-full object-contain rounded"
                                                controls
                                                muted
                                                loop
                                                playsInline
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange("guideCard", "thumbnail", null);
                                                    handleFieldChange("guideCard", "thumbnailType", null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                                title="Remove Video"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        // Image thumbnail
                                        <>
                                            <img
                                                src={formData?.guideCard?.thumbnail}
                                                alt="Thumbnail"
                                                className="h-full object-contain rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openImageEditor(formData.guideCard.thumbnail, 'thumbnail');
                                                }}
                                                className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                                                title="Edit Image - Resize, Crop, Rotate"
                                            >
                                                <Edit2 size={16} />
                                                <span className="text-xs font-semibold">Edit Size</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange("guideCard", "thumbnail", null);
                                                    handleFieldChange("guideCard", "thumbnailType", null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                                title="Remove Image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : isThumbnailUploading ? (
                                <div className="text-center flex flex-col items-center">
                                    <div className="relative w-12 h-12 mb-3">
                                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                        <div
                                            className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                            style={{
                                                background: `conic-gradient(from 0deg, #2F6288 ${thumbnailUploadProgress * 3.6}deg, transparent ${thumbnailUploadProgress * 3.6}deg)`,
                                            }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-semibold text-[#2F6288]">
                                                {thumbnailUploadProgress}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[#2F6288] font-medium">
                                        Uploading...
                                    </p>
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${thumbnailUploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-gray-500 flex flex-col items-center">
                                    <img
                                        src="/assets/admin/upload.svg"
                                        alt="Upload Icon"
                                        className="w-12 h-12 mb-2"
                                    />
                                    <p>
                                        {dragActive
                                            ? "Drop here..."
                                            : "Click to upload or drag and drop"}
                                    </p>
                                    <p className="text-gray-400">Size: (487×387)px</p>
                                    <p className="text-xs text-gray-400 mt-1">Image or Video</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={(e) => handleFileUpload(e.target.files[0])}
                                className="hidden"
                                id="thumbnail-upload"
                                disabled={isThumbnailUploading}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Title
                        </label>
                        <input
                            placeholder="Enter Title"
                            value={formData?.guideCard?.title ?? ""}
                            onChange={(e) =>
                                handleFieldChange("guideCard", "title", e.target.value)
                            }
                            className="text-sm w-full border p-3 rounded-lg"
                        />
                        {errors.title && (
                            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                        )}
                    </div>

                    {/* Category Selection */}
                    <div className="mb-4">
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Select Category
                        </label>
                        <div className="flex flex-wrap gap-3 mb-3">
                            {categories.map((cat, index) => (
                                <button
                                    key={index}
                                    onClick={() =>
                                        handleFieldChange("guideCard", "category", cat)
                                    }
                                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${formData.guideCard.category === cat
                                            ? "bg-[#2F6288] text-white border-[#2F6288]"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}

                            <button
                                onClick={addNewCategory}
                                className="text-sm px-4 py-2 rounded-full border border-gray-300 text-[#2F6288] hover:bg-[#2F6288] hover:text-white flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add New
                            </button>
                        </div>
                        {errors.category && (
                            <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                        )}
                    </div>

                    {/* Sub Category (Mode Selection) */}
                    <div className="mb-4">
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Select Mode
                        </label>
                        <div className="flex flex-wrap gap-3 mb-3">
                            {["Online", "Offline", "Both"].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() =>
                                        handleFieldChange("guideCard", "subCategory", mode)
                                    }
                                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${formData?.guideCard?.subCategory === mode
                                            ? "bg-[#2F6288] text-white border-[#2F6288]"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]"
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        {errors.subCategory && (
                            <p className="text-red-500 text-sm mt-1">{errors.subCategory}</p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Price
                        </label>
                        <input
                            placeholder="Enter Price"
                            type="number"
                            value={formData?.guideCard?.price}
                            onChange={(e) =>
                                handleFieldChange("guideCard", "price", e.target.value)
                            }
                            className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                        />
                        {errors.guidePrice && (
                            <p className="text-red-500 text-sm mt-1">{errors.guidePrice}</p>
                        )}
                    </div>

                    {/* GST */}
                    <div className="mb-4">
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            GST (%)
                        </label>
                        <input
                            placeholder="Enter GST percentage (e.g., 18)"
                            type="number"
                            value={formData?.guideCard?.gst}
                            onChange={(e) =>
                                handleFieldChange("guideCard", "gst", e.target.value)
                            }
                            className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                            min="0"
                            max="100"
                            step="0.01"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <RichTextEditor
                            value={formData?.guideCard?.description}
                            onChange={(value) =>
                                handleFieldChange("guideCard", "description", value)
                            }
                            placeholder="Enter Description"
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Listing Type */}
                    <div>
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Listing Type
                        </label>
                        <div className="flex gap-4">
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id="listing"
                                    name="listingType"
                                    value="Listing"
                                    checked={formData?.guideCard?.listingType === "Listing"}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "guideCard",
                                            "listingType",
                                            e.target.value,
                                        )
                                    }
                                    disabled={true}
                                    className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                                />
                                <label
                                    htmlFor="listing"
                                    className="text-sm font-medium text-gray-700 cursor-not-allowed"
                                >
                                    Listing
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id="own"
                                    name="listingType"
                                    value="Own"
                                    checked={formData?.guideCard?.listingType === "Own"}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "guideCard",
                                            "listingType",
                                            e.target.value,
                                        )
                                    }
                                    disabled={true}
                                    className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                                />
                                <label
                                    htmlFor="own"
                                    className="text-sm font-medium text-gray-700 cursor-not-allowed"
                                >
                                    Own
                                </label>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Default: Listing (Admin cannot modify this option)
                        </p>
                    </div>
                </div>

                {/* Conditional Subscription Plans based on SubCategory (Mode) */}
                {formData?.guideCard?.subCategory &&
                    (formData?.guideCard?.subCategory === "Online" ||
                        formData?.guideCard?.subCategory === "Both") && (
                        <>
                            {/* Plan Type Selection - Online */}
                            <div className="mb-8">
                                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                    Online Subscriptions{" "}
                                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                </h2>
                                <div className="mb-4">
                                    <label className="block text-md font-semibold text-gray-700 mb-2">
                                        Select Plan Type
                                    </label>
                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { id: "plan-online-one-time", label: "One Time" },
                                            { id: "plan-online-monthly", label: "Monthly" },
                                            { id: "plan-online-both", label: "Both" },
                                        ].map((opt) => (
                                            <label
                                                key={opt.id}
                                                htmlFor={opt.id}
                                                className="inline-flex items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="radio"
                                                    id={opt.id}
                                                    name="planChoiceOnline"
                                                    value={opt.label}
                                                    checked={formData?.online?.planChoice === opt.label}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "planChoice",
                                                            e.target.value,
                                                            "online",
                                                        )
                                                    }
                                                    className="text-[#2F6288] focus:ring-[#2F6288]"
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default: One Time. Choose Both to configure both Monthly and
                                        One Time details.
                                    </p>
                                </div>
                            </div>

                            {/* Monthly Online Subscription */}
                            {(formData?.online?.planChoice === "Monthly" ||
                                formData?.online?.planChoice === "Both") && (
                                    <div className="mb-8">
                                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                            {isEditing
                                                ? "Edit Monthly Online Subscription"
                                                : "Monthly Online Subscription"}{" "}
                                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Online Subscription Price
                                                </label>
                                                <input
                                                    placeholder="Enter Price"
                                                    type="number"
                                                    value={formData?.online?.monthly?.price}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "price",
                                                            e.target.value,
                                                            "online",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.monthlyOnlinePrice && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.monthlyOnlinePrice}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Online Subscription Discount
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Enter Discount Percentage"
                                                    value={formData?.online?.monthly?.discount}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "discount",
                                                            e.target.value,
                                                            "online",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.monthlyOnlineDiscount && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.monthlyOnlineDiscount}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Monthly Online Sessions Count */}
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Number of Sessions (per month)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="e.g., 4"
                                                    value={formData?.online?.monthly?.sessionsCount}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "sessionsCount",
                                                            e.target.value,
                                                            "online",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                            </div>

                                            {/* Occupancy & Price - Monthly Online */}
                                            <div className="mb-4">
                                                <label className="block text-md font-semibold text-gray-700 mb-2 mt-4">
                                                    Occupancy & Price
                                                </label>
                                                {formData?.online?.monthly?.occupancies?.map(
                                                    (occ, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-center"
                                                        >
                                                            <select
                                                                value={occ.type || ""}
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].type = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg bg-white"
                                                            >
                                                                <option value="">Select Occupancy</option>
                                                                <option value="Individual">Individual</option>
                                                                <option value="Couple">Couple</option>
                                                                <option value="Group">Group</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                value={occ.price || ""}
                                                                placeholder="Price"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].price = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={occ.min || ""}
                                                                placeholder="Min persons"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].min = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={occ.max || ""}
                                                                    placeholder="Max persons"
                                                                    onChange={(e) => {
                                                                        const updated = JSON.parse(
                                                                            JSON.stringify(
                                                                                formData.online.monthly.occupancies,
                                                                            ),
                                                                        );
                                                                        updated[index].max = e.target.value;
                                                                        handleFieldChange(
                                                                            null,
                                                                            "occupancies",
                                                                            updated,
                                                                            "online",
                                                                            "monthly",
                                                                        );
                                                                    }}
                                                                    className="text-sm w-full border p-3 rounded-lg"
                                                                />
                                                                {index ===
                                                                    formData?.online?.monthly?.occupancies.length -
                                                                    1 ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [
                                                                                ...JSON.parse(
                                                                                    JSON.stringify(
                                                                                        formData.online.monthly.occupancies,
                                                                                    ),
                                                                                ),
                                                                                { type: "Individual", price: "" },
                                                                            ];
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "online",
                                                                                "monthly",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        +
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = JSON.parse(
                                                                                JSON.stringify(
                                                                                    formData.online.monthly.occupancies,
                                                                                ),
                                                                            ).filter((_, i) => i !== index);
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "online",
                                                                                "monthly",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        -
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Online Subscription Description
                                                </label>
                                                <RichTextEditor
                                                    value={formData.online.monthly.description}
                                                    onChange={(value) =>
                                                        handleFieldChange(
                                                            null,
                                                            "description",
                                                            value,
                                                            "online",
                                                            "monthly",
                                                        )
                                                    }
                                                    placeholder="Enter Description"
                                                    rows={4}
                                                />
                                            </div>

                                            {/* Monthly Online Weekly Pattern */}
                                            <div className="mt-6">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                                                    Monthly Online – Weekly Hours
                                                </h3>

                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    <span className="text-sm text-gray-600">
                                                        Setup Mode:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            initializeSlotBasedPattern("online");
                                                            setTimeout(() => {
                                                                if (!formData?.online?.monthly?.slotBasedPattern || formData.online.monthly.slotBasedPattern.length === 0) {
                                                                    addTimeSlot("online");
                                                                }
                                                            }, 100);
                                                        }}
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Slot-First Setup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            initializeDayBasedWeeklyPattern("online")
                                                        }
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Day-Based Setup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => replicateWeekToMonth("online")}
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Apply Week to All Month
                                                    </button>
                                                </div>

                                                {/* NEW: Slot-First Weekly Pattern UI */}
                                                {formData?.online?.monthly?.slotBasedPattern && formData.online.monthly.slotBasedPattern.length > 0 && (
                                                    <div className="space-y-4 mb-6">
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-semibold text-gray-800">
                                                                    Time Slots (Select days for each slot)
                                                                </h4>
                                                                <button
                                                                    onClick={() => addTimeSlot("online")}
                                                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                                >
                                                                    + Add Time Slot
                                                                </button>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {formData.online.monthly.slotBasedPattern.map((slot, slotIndex) => (
                                                                    <div key={slotIndex} className="border border-gray-300 rounded-lg p-4 bg-white">
                                                                        <div className="flex flex-col gap-4">
                                                                            {/* Slot Time and Type */}
                                                                            <div className="flex flex-wrap items-center gap-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <label className="text-sm font-medium text-gray-700">Time:</label>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={slot.startTime || ""}
                                                                                        onChange={(e) => updateTimeSlot("online", slotIndex, "startTime", e.target.value)}
                                                                                        className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                                                                                    />
                                                                                    <span className="text-gray-500">to</span>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={slot.endTime || ""}
                                                                                        onChange={(e) => updateTimeSlot("online", slotIndex, "endTime", e.target.value)}
                                                                                        className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                                                                                    />
                                                                                </div>
                                                                                
                                                                                {/* Type Selection */}
                                                                                <div className="flex items-center gap-3 border-l pl-4">
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`slot-type-${slotIndex}`}
                                                                                            checked={(slot.type || "individual") === "individual"}
                                                                                            onChange={() => updateTimeSlot("online", slotIndex, "type", "individual")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Individual</span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`slot-type-${slotIndex}`}
                                                                                            checked={slot.type === "couple"}
                                                                                            onChange={() => updateTimeSlot("online", slotIndex, "type", "couple")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Couple</span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`slot-type-${slotIndex}`}
                                                                                            checked={slot.type === "group"}
                                                                                            onChange={() => updateTimeSlot("online", slotIndex, "type", "group")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Group</span>
                                                                                    </label>
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => removeTimeSlot("online", slotIndex)}
                                                                                    className="ml-auto px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                                                                >
                                                                                    Remove Slot
                                                                                </button>
                                                                            </div>

                                                                            {/* Day Selection - Checkboxes */}
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                    Available on these days:
                                                                                </label>
                                                                                <div className="flex flex-wrap gap-3">
                                                                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                                                                        <label key={day} className="inline-flex items-center">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={(slot.days || []).includes(day)}
                                                                                                onChange={() => toggleSlotDay("online", slotIndex, day)}
                                                                                                className="form-checkbox h-4 w-4 text-green-600 rounded"
                                                                                            />
                                                                                            <span className="ml-2 text-sm font-medium">{day}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                                {(!slot.days || slot.days.length === 0) && (
                                                                                    <p className="text-xs text-red-500 mt-1">⚠️ Please select at least one day</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* New Day-Based Weekly Pattern UI */}
                                                {formData?.online?.monthly?.dayBasedPattern && (
                                                    <div className="space-y-6">
                                                        {[
                                                            "Monday",
                                                            "Tuesday",
                                                            "Wednesday",
                                                            "Thursday",
                                                            "Friday",
                                                            "Saturday",
                                                            "Sunday",
                                                        ].map((dayName) => (
                                                            <div
                                                                key={dayName}
                                                                className="border border-gray-200 rounded-lg p-4 bg-blue-50"
                                                            >
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h3 className="font-semibold text-gray-800 text-lg">
                                                                        {dayName}
                                                                    </h3>
                                                                    <button
                                                                        onClick={() =>
                                                                            addSlotToDay("online", dayName)
                                                                        }
                                                                        className="px-3 py-1 bg-[#2F6288] text-white rounded text-sm hover:bg-blue-700"
                                                                    >
                                                                        Add Slot
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {(
                                                                        formData?.online?.monthly?.dayBasedPattern?.[
                                                                            dayName
                                                                        ]?.slots || []
                                                                    ).map((slot, slotIndex) => (
                                                                        <div
                                                                            key={slotIndex}
                                                                            className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded bg-white"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-${dayName}-${slotIndex}`}
                                                                                        checked={
                                                                                            (slot.type || "individual") ===
                                                                                            "individual"
                                                                                        }
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "online",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "individual",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Individual</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-${dayName}-${slotIndex}`}
                                                                                        checked={slot.type === "couple"}
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "online",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "couple",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Couple</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-${dayName}-${slotIndex}`}
                                                                                        checked={slot.type === "group"}
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "online",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "group",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Group</span>
                                                                                </label>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="time"
                                                                                    value={slot.startTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateDaySlot(
                                                                                            "online",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                            "startTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                                                                />
                                                                                <span className="text-gray-500">to</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={slot.endTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateDaySlot(
                                                                                            "online",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                            "endTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                                                                />
                                                                                <button
                                                                                    onClick={() =>
                                                                                        removeDaySlot(
                                                                                            "online",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                        )
                                                                                    }
                                                                                    className="text-red-600 text-sm hover:text-red-800"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {(
                                                                        formData?.online?.monthly?.dayBasedPattern?.[
                                                                            dayName
                                                                        ]?.slots || []
                                                                    ).length === 0 && (
                                                                            <p className="text-gray-500 text-sm italic">
                                                                                No slots added for {dayName}
                                                                            </p>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Old Weekly Pattern UI (fallback) */}
                                                {!formData?.online?.monthly?.dayBasedPattern && (
                                                    <div className="space-y-4">
                                                        {(formData?.online?.monthly?.weeklyPattern || []).map(
                                                            (row, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="border border-gray-200 rounded-lg p-4 space-y-3 bg-blue-50"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="font-semibold text-gray-700">
                                                                            Row {idx + 1}
                                                                        </p>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() =>
                                                                                    removeMonthlyPatternRow("online", idx)
                                                                                }
                                                                                className="text-red-600 text-sm"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    setFormData((prev) => {
                                                                                        const next = { ...prev };
                                                                                        const list = [
                                                                                            ...(next.online.monthly
                                                                                                .weeklyPattern || []),
                                                                                        ];
                                                                                        list.splice(
                                                                                            idx + 1,
                                                                                            0,
                                                                                            JSON.parse(
                                                                                                JSON.stringify(list[idx]),
                                                                                            ),
                                                                                        );
                                                                                        next.online.monthly.weeklyPattern =
                                                                                            list;
                                                                                        return next;
                                                                                    })
                                                                                }
                                                                                className="text-[#2F6288] text-sm"
                                                                            >
                                                                                Copy
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {weekdayOptions.map((d) => (
                                                                            <button
                                                                                key={d}
                                                                                onClick={() =>
                                                                                    toggleMonthlyPatternDay(
                                                                                        "online",
                                                                                        idx,
                                                                                        d,
                                                                                    )
                                                                                }
                                                                                className={`px-3 py-1 rounded-full border text-sm ${row.days?.includes(d) ? "bg-[#2F6288] text-white border-[#2F6288]" : "bg-white text-gray-700 border-gray-300"}`}
                                                                            >
                                                                                {d}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {(row.times || [])
                                                                            .filter(
                                                                                (t) =>
                                                                                    (t.type || "individual") ===
                                                                                    onlineMonthlyViewType,
                                                                            )
                                                                            .filter((t) => {
                                                                                if (onlineMonthlyViewType === "couple") {
                                                                                    const booked = Number(
                                                                                        t.bookedCount || 0,
                                                                                    );
                                                                                    return booked < 2; // hide if full
                                                                                }
                                                                                if (onlineMonthlyViewType === "group") {
                                                                                    const booked = Number(
                                                                                        t.bookedCount || 0,
                                                                                    );
                                                                                    const gMax = Number(
                                                                                        formData?.online?.monthly?.groupMax ||
                                                                                        0,
                                                                                    );
                                                                                    return gMax > 0 ? booked < gMax : true;
                                                                                }
                                                                                return true;
                                                                            })
                                                                            .map((t, tIdx) => (
                                                                                <div
                                                                                    key={tIdx}
                                                                                    className="flex flex-col md:flex-row md:items-center gap-2 p-2 border rounded bg-white"
                                                                                >
                                                                                    <div className="flex items-center gap-4">
                                                                                        <label className="inline-flex items-center">
                                                                                            <input
                                                                                                type="radio"
                                                                                                name={`mo-online-${idx}-${tIdx}`}
                                                                                                checked={
                                                                                                    (t.type || "individual") ===
                                                                                                    "individual"
                                                                                                }
                                                                                                onChange={() =>
                                                                                                    updateMonthlyPatternTime(
                                                                                                        "online",
                                                                                                        idx,
                                                                                                        tIdx,
                                                                                                        "type",
                                                                                                        "individual",
                                                                                                    )
                                                                                                }
                                                                                                className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                            />
                                                                                            <span className="ml-2">
                                                                                                Individual
                                                                                            </span>
                                                                                        </label>
                                                                                        <label className="inline-flex items-center">
                                                                                            <input
                                                                                                type="radio"
                                                                                                name={`mo-online-${idx}-${tIdx}`}
                                                                                                checked={t.type === "couple"}
                                                                                                onChange={() =>
                                                                                                    updateMonthlyPatternTime(
                                                                                                        "online",
                                                                                                        idx,
                                                                                                        tIdx,
                                                                                                        "type",
                                                                                                        "couple",
                                                                                                    )
                                                                                                }
                                                                                                className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                            />
                                                                                            <span className="ml-2">Couple</span>
                                                                                        </label>
                                                                                        <label className="inline-flex items-center">
                                                                                            <input
                                                                                                type="radio"
                                                                                                name={`mo-online-${idx}-${tIdx}`}
                                                                                                checked={t.type === "group"}
                                                                                                onChange={() =>
                                                                                                    updateMonthlyPatternTime(
                                                                                                        "online",
                                                                                                        idx,
                                                                                                        tIdx,
                                                                                                        "type",
                                                                                                        "group",
                                                                                                    )
                                                                                                }
                                                                                                className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                            />
                                                                                            <span className="ml-2">Group</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 flex-1">
                                                                                        <input
                                                                                            type="time"
                                                                                            value={t.startTime || ""}
                                                                                            onChange={(e) =>
                                                                                                updateMonthlyPatternTime(
                                                                                                    "online",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                    "startTime",
                                                                                                    e.target.value,
                                                                                                )
                                                                                            }
                                                                                            className="border p-2 rounded flex-1"
                                                                                        />
                                                                                        <span>-</span>
                                                                                        <input
                                                                                            type="time"
                                                                                            value={t.endTime || ""}
                                                                                            onChange={(e) =>
                                                                                                updateMonthlyPatternTime(
                                                                                                    "online",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                    "endTime",
                                                                                                    e.target.value,
                                                                                                )
                                                                                            }
                                                                                            className="border p-2 rounded flex-1"
                                                                                        />
                                                                                        {onlineMonthlyViewType !==
                                                                                            "individual" && (
                                                                                                <>
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <label className="text-xs text-gray-600">
                                                                                                            Booked
                                                                                                        </label>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            min="0"
                                                                                                            value={Number(
                                                                                                                t.bookedCount || 0,
                                                                                                            )}
                                                                                                            onChange={(e) =>
                                                                                                                updateMonthlyPatternTime(
                                                                                                                    "online",
                                                                                                                    idx,
                                                                                                                    tIdx,
                                                                                                                    "bookedCount",
                                                                                                                    Number(e.target.value),
                                                                                                                )
                                                                                                            }
                                                                                                            className="w-20 border p-2 rounded text-sm"
                                                                                                        />
                                                                                                    </div>
                                                                                                    {onlineMonthlyViewType ===
                                                                                                        "couple" && (
                                                                                                            <span className="text-xs text-gray-700">
                                                                                                                Remaining:{" "}
                                                                                                                {Math.max(
                                                                                                                    0,
                                                                                                                    2 -
                                                                                                                    Number(
                                                                                                                        t.bookedCount || 0,
                                                                                                                    ),
                                                                                                                )}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    {onlineMonthlyViewType ===
                                                                                                        "group" && (
                                                                                                            <div className="flex items-center gap-2 text-xs text-gray-700">
                                                                                                                <span>
                                                                                                                    Remaining:{" "}
                                                                                                                    {Math.max(
                                                                                                                        0,
                                                                                                                        (Number(
                                                                                                                            formData?.online
                                                                                                                                ?.monthly?.groupMax ||
                                                                                                                            0,
                                                                                                                        ) || 0) -
                                                                                                                        Number(
                                                                                                                            t.bookedCount || 0,
                                                                                                                        ),
                                                                                                                    )}
                                                                                                                </span>
                                                                                                                <span className="ml-2">
                                                                                                                    Min
                                                                                                                </span>
                                                                                                                <input
                                                                                                                    type="number"
                                                                                                                    min="0"
                                                                                                                    value={
                                                                                                                        formData?.online?.monthly
                                                                                                                            ?.groupMin || ""
                                                                                                                    }
                                                                                                                    onChange={(e) =>
                                                                                                                        handleFieldChange(
                                                                                                                            null,
                                                                                                                            "groupMin",
                                                                                                                            e.target.value,
                                                                                                                            "online",
                                                                                                                            "monthly",
                                                                                                                        )
                                                                                                                    }
                                                                                                                    className="w-16 border p-1 rounded"
                                                                                                                />
                                                                                                                <span>Max</span>
                                                                                                                <input
                                                                                                                    type="number"
                                                                                                                    min="0"
                                                                                                                    value={
                                                                                                                        formData?.online?.monthly
                                                                                                                            ?.groupMax || ""
                                                                                                                    }
                                                                                                                    onChange={(e) =>
                                                                                                                        handleFieldChange(
                                                                                                                            null,
                                                                                                                            "groupMax",
                                                                                                                            e.target.value,
                                                                                                                            "online",
                                                                                                                            "monthly",
                                                                                                                        )
                                                                                                                    }
                                                                                                                    className="w-16 border p-1 rounded"
                                                                                                                />
                                                                                                            </div>
                                                                                                        )}
                                                                                                </>
                                                                                            )}
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                removeMonthlyPatternTime(
                                                                                                    "online",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                )
                                                                                            }
                                                                                            className="text-red-600 text-sm"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                addMonthlyPatternTime(
                                                                                                    "online",
                                                                                                    idx,
                                                                                                )
                                                                                            }
                                                                                            className="text-[#2F6288] text-sm"
                                                                                        >
                                                                                            Add
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* One-Time Online Purchase */}
                            {(formData?.online?.planChoice === "One Time" ||
                                formData?.online?.planChoice === "Both") && (
                                    <div className="mb-8">
                                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                            {isEditing
                                                ? "Edit One-Time Online Purchase"
                                                : "One-Time Online Purchase"}{" "}
                                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    One-Time Online Purchase Price
                                                </label>
                                                <input
                                                    placeholder="Enter Price"
                                                    type="number"
                                                    value={formData?.online?.oneTime?.price}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "price",
                                                            e.target.value,
                                                            "online",
                                                            "oneTime",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.oneTimeOnlinePrice && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.oneTimeOnlinePrice}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Occupancy & Price - One-Time Online */}
                                            <div className="mb-4">
                                                <label className="block text-md font-semibold text-gray-700 mb-2 mt-4">
                                                    Occupancy & Price
                                                </label>
                                                {formData?.online?.oneTime?.occupancies?.map(
                                                    (occ, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-center"
                                                        >
                                                            <select
                                                                value={occ.type || ""}
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].type = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg bg-white"
                                                            >
                                                                <option value="">Select Occupancy</option>
                                                                <option value="Individual">Individual</option>
                                                                <option value="Couple">Couple</option>
                                                                <option value="Group">Group</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                value={occ.price || ""}
                                                                placeholder="Price"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].price = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={occ.min || ""}
                                                                placeholder="Min persons"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.online.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].min = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "online",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={occ.max || ""}
                                                                    placeholder="Max persons"
                                                                    onChange={(e) => {
                                                                        const updated = JSON.parse(
                                                                            JSON.stringify(
                                                                                formData.online.oneTime.occupancies,
                                                                            ),
                                                                        );
                                                                        updated[index].max = e.target.value;
                                                                        handleFieldChange(
                                                                            null,
                                                                            "occupancies",
                                                                            updated,
                                                                            "online",
                                                                            "oneTime",
                                                                        );
                                                                    }}
                                                                    className="text-sm w-full border p-3 rounded-lg"
                                                                />
                                                                {index ===
                                                                    formData?.online?.oneTime?.occupancies.length -
                                                                    1 ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [
                                                                                ...JSON.parse(
                                                                                    JSON.stringify(
                                                                                        formData.online.oneTime.occupancies,
                                                                                    ),
                                                                                ),
                                                                                { type: "Individual", price: "" },
                                                                            ];
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "online",
                                                                                "oneTime",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        +
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = JSON.parse(
                                                                                JSON.stringify(
                                                                                    formData.online.oneTime.occupancies,
                                                                                ),
                                                                            ).filter((_, i) => i !== index);
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "online",
                                                                                "oneTime",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        -
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            {/* One-Time Online Slots - Calendar Based */}
                                            <div className="mt-6">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                                                    One-Time Online – Calendar
                                                </h3>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {/* Calendar */}
                                                    <div className="border rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <button
                                                                onClick={() =>
                                                                    prevMonthGuard(setOtOnlineMonth, otOnlineMonth)
                                                                }
                                                                className="px-2 py-1 border rounded"
                                                            >
                                                                Prev
                                                            </button>
                                                            <div className="font-semibold">
                                                                {otOnlineMonth.toLocaleString("default", {
                                                                    month: "long",
                                                                })}{" "}
                                                                {otOnlineMonth.getFullYear()}
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    setOtOnlineMonth(
                                                                        new Date(
                                                                            otOnlineMonth.getFullYear(),
                                                                            otOnlineMonth.getMonth() + 1,
                                                                            1,
                                                                        ),
                                                                    )
                                                                }
                                                                className="px-2 py-1 border rounded"
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-1">
                                                            {[
                                                                "Sun",
                                                                "Mon",
                                                                "Tue",
                                                                "Wed",
                                                                "Thu",
                                                                "Fri",
                                                                "Sat",
                                                            ].map((d) => (
                                                                <div key={d}>{d}</div>
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {calGrid(otOnlineMonth).map((d, i) => {
                                                                const y = d ? fmtYMD(d) : "";
                                                                const selected =
                                                                    y && otOnlineSelectedDates.includes(y);
                                                                const hasSlots = y && (formData?.online?.oneTime?.slots || []).some(s => ymd(s.date) === y);
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        disabled={!d || isPast(d)}
                                                                        onClick={() => {
                                                                            if (!d || isPast(d)) return;
                                                                            const ymd = fmtYMD(d);
                                                                            if (otOnlineMulti) {
                                                                                setOtOnlineSelectedDates((prev) =>
                                                                                    prev.includes(ymd)
                                                                                        ? prev.filter((x) => x !== ymd)
                                                                                        : [...prev, ymd],
                                                                                );
                                                                            } else {
                                                                                setOtOnlineSelectedDates([ymd]);
                                                                                setOtOnlineDate(ymd);
                                                                            }
                                                                        }}
                                                                        className={`h-10 rounded border text-sm relative ${!d || isPast(d)
                                                                                ? "text-gray-300 border-gray-200 cursor-not-allowed"
                                                                                : selected ||
                                                                                    (y === otOnlineDate && !otOnlineMulti)
                                                                                    ? "bg-[#2F6288] text-white border-[#2F6288]"
                                                                                    : "bg-white text-gray-700 border-gray-200 hover:border-[#2F6288]"
                                                                            }`}
                                                                    >
                                                                        {d ? d.getDate() : ""}
                                                                        {hasSlots && (
                                                                            <span className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                                                                                selected || (y === otOnlineDate && !otOnlineMulti) 
                                                                                    ? 'bg-white' 
                                                                                    : 'bg-[#2F6288]'
                                                                            }`}></span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Multi-select controls */}
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 text-[#2F6288]"
                                                                    checked={otOnlineMulti}
                                                                    onChange={(e) => {
                                                                        const isMulti = e.target.checked;
                                                                        setOtOnlineMulti(isMulti);
                                                                        // When switching from multi to single, keep only first selected date
                                                                        if (!isMulti && otOnlineSelectedDates.length > 1) {
                                                                            const firstDate = otOnlineSelectedDates[0];
                                                                            setOtOnlineSelectedDates([firstDate]);
                                                                            setOtOnlineDate(firstDate);
                                                                        }
                                                                    }}
                                                                />
                                                                <span>Multi-select dates</span>
                                                            </label>
                                                            {otOnlineSelectedDates.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOtOnlineSelectedDates([])}
                                                                    className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                                                                >
                                                                    Clear All
                                                                </button>
                                                            )}
                                                        </div>
                                                        {otOnlineSelectedDates.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {otOnlineSelectedDates.map((d) => (
                                                                    <span
                                                                        key={d}
                                                                        className="text-xs bg-[#2F6288] text-white px-2 py-0.5 rounded"
                                                                    >
                                                                        {d}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="mt-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (otOnlineSelectedDates.length > 1) {
                                                                        setOtOnlinePending((p) => ({
                                                                            ...p,
                                                                            open: true,
                                                                        }));
                                                                    } else {
                                                                        const target =
                                                                            otOnlineSelectedDates[0] || otOnlineDate;
                                                                        if (target)
                                                                            addOneTimeSlotFor("online", target);
                                                                    }
                                                                }}
                                                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#2F6288]"
                                                            >
                                                                {otOnlineSelectedDates.length > 1
                                                                    ? `Add Time Range to ${otOnlineSelectedDates.length} dates`
                                                                    : `Add Slot for ${otOnlineSelectedDates[0] || otOnlineDate}`}
                                                            </button>
                                                        </div>

                                                        {otOnlinePending.open &&
                                                            otOnlineSelectedDates.length > 1 && (
                                                                <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                                                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                                                        Add a time range that will apply to all
                                                                        selected dates
                                                                    </p>
                                                                    <div className="grid sm:grid-cols-[auto_1fr_auto_1fr_auto] grid-cols-1 gap-2 items-center">
                                                                        <div className="flex items-center gap-3">
                                                                            <label className="inline-flex items-center text-xs">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="ot-online-type"
                                                                                    checked={
                                                                                        (otOnlinePending.type ||
                                                                                            "individual") === "individual"
                                                                                    }
                                                                                    onChange={() =>
                                                                                        setOtOnlinePending((p) => ({
                                                                                            ...p,
                                                                                            type: "individual",
                                                                                        }))
                                                                                    }
                                                                                    className="h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-1">Individual</span>
                                                                            </label>
                                                                            <label className="inline-flex items-center text-xs">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="ot-online-type"
                                                                                    checked={
                                                                                        otOnlinePending.type === "couple"
                                                                                    }
                                                                                    onChange={() =>
                                                                                        setOtOnlinePending((p) => ({
                                                                                            ...p,
                                                                                            type: "couple",
                                                                                        }))
                                                                                    }
                                                                                    className="h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-1">Couple</span>
                                                                            </label>
                                                                            <label className="inline-flex items-center text-xs">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="ot-online-type"
                                                                                    checked={
                                                                                        otOnlinePending.type === "group"
                                                                                    }
                                                                                    onChange={() =>
                                                                                        setOtOnlinePending((p) => ({
                                                                                            ...p,
                                                                                            type: "group",
                                                                                        }))
                                                                                    }
                                                                                    className="h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-1">Group</span>
                                                                            </label>
                                                                        </div>
                                                                        <input
                                                                            type="time"
                                                                            value={otOnlinePending.startTime}
                                                                            onChange={(e) =>
                                                                                setOtOnlinePending((p) => ({
                                                                                    ...p,
                                                                                    startTime: e.target.value,
                                                                                }))
                                                                            }
                                                                            className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                                                                        />
                                                                        <span className="hidden sm:flex justify-center text-gray-500">
                                                                            -
                                                                        </span>
                                                                        <input
                                                                            type="time"
                                                                            value={otOnlinePending.endTime}
                                                                            onChange={(e) =>
                                                                                setOtOnlinePending((p) => ({
                                                                                    ...p,
                                                                                    endTime: e.target.value,
                                                                                }))
                                                                            }
                                                                            className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={applyOtOnlinePending}
                                                                                className="text-xs px-3 py-1.5 bg-[#2F6288] text-white rounded-md"
                                                                            >
                                                                                Apply to {otOnlineSelectedDates.length}{" "}
                                                                                dates
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setOtOnlinePending({
                                                                                        open: false,
                                                                                        startTime: "",
                                                                                        endTime: "",
                                                                                        type: "individual",
                                                                                    })
                                                                                }
                                                                                className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* Slots for selected date */}
                                                    <div className="border rounded-lg p-3">
                                                        <div className="font-semibold mb-2">
                                                            Slots for {otOnlineSelectedDates[0] || otOnlineDate}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {(formData?.online?.oneTime?.slots || [])
                                                                .filter((s) => ymd(s.date) === (otOnlineSelectedDates[0] || otOnlineDate))
                                                                .map((s, idx) => {
                                                                    const slotType = s.type || "individual";
                                                                    return (
                                                                        <div
                                                                            key={s.id || `online-ot-${idx}`}
                                                                            className="border rounded-lg p-3 space-y-2 bg-gray-50"
                                                                        >
                                                                            <div className="flex items-center gap-4 mb-2">
                                                                                <label className="inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-slot-type-${s.id}`}
                                                                                        value="individual"
                                                                                        checked={slotType === "individual"}
                                                                                        onChange={() => {
                                                                                            
                                                                                            updateOneTimeSlot(
                                                                                                "online",
                                                                                                s.id,
                                                                                                "type",
                                                                                                "individual",
                                                                                            );
                                                                                        }}
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Individual</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-slot-type-${s.id}`}
                                                                                        value="couple"
                                                                                        checked={slotType === "couple"}
                                                                                        onChange={() => {
                                                                                            updateOneTimeSlot(
                                                                                                "online",
                                                                                                s.id,
                                                                                                "type",
                                                                                                "couple",
                                                                                            );
                                                                                        }}
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Couple</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`online-slot-type-${s.id}`}
                                                                                        value="group"
                                                                                        checked={slotType === "group"}
                                                                                        onChange={() => {
                                                                                            updateOneTimeSlot(
                                                                                                "online",
                                                                                                s.id,
                                                                                                "type",
                                                                                                "group",
                                                                                            );
                                                                                        }}
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Group</span>
                                                                                </label>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="time"
                                                                                    value={s.startTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateOneTimeSlot(
                                                                                            "online",
                                                                                            s.id,
                                                                                            "startTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border p-2 rounded flex-1"
                                                                                />
                                                                                <span>-</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={s.endTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateOneTimeSlot(
                                                                                            "online",
                                                                                            s.id,
                                                                                            "endTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border p-2 rounded flex-1"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        removeOneTimeSlot("online", s.id)
                                                                                    }
                                                                                    className="text-red-600 hover:text-red-800 p-1"
                                                                                    title="Delete slot"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </>
                    )}

                {formData?.guideCard?.subCategory &&
                    (formData?.guideCard?.subCategory === "Offline" ||
                        formData?.guideCard?.subCategory === "Both") && (
                        <>
                            {/* Plan Type Selection - Offline */}
                            <div className="mb-8">
                                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                    Offline Subscriptions{" "}
                                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                </h2>
                                <div className="mb-4">
                                    <label className="block text-md font-semibold text-gray-700 mb-2">
                                        Select Plan Type
                                    </label>
                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { id: "plan-offline-one-time", label: "One Time" },
                                            { id: "plan-offline-monthly", label: "Monthly" },
                                            { id: "plan-offline-both", label: "Both" },
                                        ].map((opt) => (
                                            <label
                                                key={opt.id}
                                                htmlFor={opt.id}
                                                className="inline-flex items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="radio"
                                                    id={opt.id}
                                                    name="planChoiceOffline"
                                                    value={opt.label}
                                                    checked={formData?.offline?.planChoice === opt.label}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "planChoice",
                                                            e.target.value,
                                                            "offline",
                                                        )
                                                    }
                                                    className="text-[#2F6288] focus:ring-[#2F6288]"
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default: One Time. Choose Both to configure both Monthly and
                                        One Time details.
                                    </p>
                                </div>
                            </div>

                            {/* Monthly Offline Subscription */}
                            {(formData?.offline?.planChoice === "Monthly" ||
                                formData?.offline?.planChoice === "Both") && (
                                    <div className="mb-8">
                                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                            {isEditing
                                                ? "Edit Monthly Offline Subscription"
                                                : "Monthly Offline Subscription"}{" "}
                                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Offline Subscription Price
                                                </label>
                                                <input
                                                    placeholder="Enter Price"
                                                    type="number"
                                                    value={formData?.offline?.monthly?.price}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "price",
                                                            e.target.value,
                                                            "offline",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.monthlyOfflinePrice && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.monthlyOfflinePrice}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Offline Subscription Discount
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Enter Discount Percentage"
                                                    value={formData?.offline?.monthly?.discount}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "discount",
                                                            e.target.value,
                                                            "offline",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.monthlyOfflineDiscount && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.monthlyOfflineDiscount}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Monthly Offline Sessions Count */}
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Number of Sessions (per month)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="e.g., 4"
                                                    value={formData?.offline?.monthly?.sessionsCount}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "sessionsCount",
                                                            e.target.value,
                                                            "offline",
                                                            "monthly",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                            </div>

                                            {/* Occupancy & Price - Monthly Offline */}
                                            <div className="mb-4">
                                                <label className="block text-md font-semibold text-gray-700 mb-2 mt-4">
                                                    Occupancy & Price
                                                </label>
                                                {formData?.offline?.monthly?.occupancies?.map(
                                                    (occ, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-center"
                                                        >
                                                            <select
                                                                value={occ.type || ""}
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].type = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg bg-white"
                                                            >
                                                                <option value="">Select Occupancy</option>
                                                                <option value="Individual">Individual</option>
                                                                <option value="Couple">Couple</option>
                                                                <option value="Group">Group</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                value={occ.price || ""}
                                                                placeholder="Price"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].price = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={occ.min || ""}
                                                                placeholder="Min persons"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.monthly.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].min = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "monthly",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={occ.max || ""}
                                                                    placeholder="Max persons"
                                                                    onChange={(e) => {
                                                                        const updated = JSON.parse(
                                                                            JSON.stringify(
                                                                                formData.offline.monthly.occupancies,
                                                                            ),
                                                                        );
                                                                        updated[index].max = e.target.value;
                                                                        handleFieldChange(
                                                                            null,
                                                                            "occupancies",
                                                                            updated,
                                                                            "offline",
                                                                            "monthly",
                                                                        );
                                                                    }}
                                                                    className="text-sm w-full border p-3 rounded-lg"
                                                                />
                                                                {index ===
                                                                    formData?.offline?.monthly?.occupancies.length -
                                                                    1 ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [
                                                                                ...JSON.parse(
                                                                                    JSON.stringify(
                                                                                        formData.offline.monthly.occupancies,
                                                                                    ),
                                                                                ),
                                                                                { type: "Individual", price: "" },
                                                                            ];
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "offline",
                                                                                "monthly",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        +
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = JSON.parse(
                                                                                JSON.stringify(
                                                                                    formData.offline.monthly.occupancies,
                                                                                ),
                                                                            ).filter((_, i) => i !== index);
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "offline",
                                                                                "monthly",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        -
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    Monthly Offline Subscription Description
                                                </label>
                                                <RichTextEditor
                                                    value={formData.offline.monthly.description}
                                                    onChange={(value) =>
                                                        handleFieldChange(
                                                            null,
                                                            "description",
                                                            value,
                                                            "offline",
                                                            "monthly",
                                                        )
                                                    }
                                                    placeholder="Enter Description"
                                                    rows={4}
                                                />
                                            </div>

                                            {/* Monthly Offline Weekly Pattern */}
                                            <div className="mt-6">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                                                    Monthly Offline – Weekly Hours
                                                </h3>
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    <span className="text-sm text-gray-600">
                                                        Setup Mode:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            initializeSlotBasedPattern("offline");
                                                            setTimeout(() => {
                                                                if (!formData?.offline?.monthly?.slotBasedPattern || formData.offline.monthly.slotBasedPattern.length === 0) {
                                                                    addTimeSlot("offline");
                                                                }
                                                            }, 100);
                                                        }}
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Slot-First Setup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            initializeDayBasedWeeklyPattern("offline")
                                                        }
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Day-Based Setup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => replicateWeekToMonth("offline")}
                                                        className="px-3 py-1.5 rounded border text-sm bg-[#2F6288] text-white border-[#2F6288] hover:bg-[#224b66]"
                                                    >
                                                        Apply Week to All Month
                                                    </button>
                                                </div>

                                                {/* NEW: Slot-First Weekly Pattern UI for Offline */}
                                                {formData?.offline?.monthly?.slotBasedPattern && formData.offline.monthly.slotBasedPattern.length > 0 && (
                                                    <div className="space-y-4 mb-6">
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-semibold text-gray-800">
                                                                    Time Slots (Select days for each slot)
                                                                </h4>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addTimeSlot("offline")}
                                                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                                >
                                                                    + Add Time Slot
                                                                </button>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {formData.offline.monthly.slotBasedPattern.map((slot, slotIndex) => (
                                                                    <div key={slotIndex} className="border border-gray-300 rounded-lg p-4 bg-white">
                                                                        <div className="flex flex-col gap-4">
                                                                            {/* Slot Time and Type */}
                                                                            <div className="flex flex-wrap items-center gap-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <label className="text-sm font-medium text-gray-700">Time:</label>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={slot.startTime || ""}
                                                                                        onChange={(e) => updateTimeSlot("offline", slotIndex, "startTime", e.target.value)}
                                                                                        className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                                                                                    />
                                                                                    <span className="text-gray-500">to</span>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={slot.endTime || ""}
                                                                                        onChange={(e) => updateTimeSlot("offline", slotIndex, "endTime", e.target.value)}
                                                                                        className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                                                                                    />
                                                                                </div>
                                                                                
                                                                                {/* Type Selection */}
                                                                                <div className="flex items-center gap-3 border-l pl-4">
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`offline-slot-type-${slotIndex}`}
                                                                                            checked={(slot.type || "individual") === "individual"}
                                                                                            onChange={() => updateTimeSlot("offline", slotIndex, "type", "individual")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Individual</span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`offline-slot-type-${slotIndex}`}
                                                                                            checked={slot.type === "couple"}
                                                                                            onChange={() => updateTimeSlot("offline", slotIndex, "type", "couple")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Couple</span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`offline-slot-type-${slotIndex}`}
                                                                                            checked={slot.type === "group"}
                                                                                            onChange={() => updateTimeSlot("offline", slotIndex, "type", "group")}
                                                                                            className="form-radio h-4 w-4 text-green-600"
                                                                                        />
                                                                                        <span className="ml-2 text-sm">Group</span>
                                                                                    </label>
                                                                                </div>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeTimeSlot("offline", slotIndex)}
                                                                                    className="ml-auto px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                                                                >
                                                                                    Remove Slot
                                                                                </button>
                                                                            </div>

                                                                            {/* Day Selection - Checkboxes */}
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                    Available on these days:
                                                                                </label>
                                                                                <div className="flex flex-wrap gap-3">
                                                                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                                                                        <label key={day} className="inline-flex items-center">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={(slot.days || []).includes(day)}
                                                                                                onChange={() => toggleSlotDay("offline", slotIndex, day)}
                                                                                                className="form-checkbox h-4 w-4 text-green-600 rounded"
                                                                                            />
                                                                                            <span className="ml-2 text-sm font-medium">{day}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                                {(!slot.days || slot.days.length === 0) && (
                                                                                    <p className="text-xs text-red-500 mt-1">⚠️ Please select at least one day</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* New Day-Based Weekly Pattern UI for Offline */}
                                                {formData?.offline?.monthly?.dayBasedPattern && (
                                                    <div className="space-y-6">
                                                        {[
                                                            "Monday",
                                                            "Tuesday",
                                                            "Wednesday",
                                                            "Thursday",
                                                            "Friday",
                                                            "Saturday",
                                                            "Sunday",
                                                        ].map((dayName) => (
                                                            <div
                                                                key={dayName}
                                                                className="border border-gray-200 rounded-lg p-4 bg-blue-50"
                                                            >
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h3 className="font-semibold text-gray-800 text-lg">
                                                                        {dayName}
                                                                    </h3>
                                                                    <button
                                                                        onClick={() =>
                                                                            addSlotToDay("offline", dayName)
                                                                        }
                                                                        className="px-3 py-1 bg-[#2F6288] text-white rounded text-sm hover:bg-blue-700"
                                                                    >
                                                                        Add Slot
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {(
                                                                        formData?.offline?.monthly?.dayBasedPattern?.[
                                                                            dayName
                                                                        ]?.slots || []
                                                                    ).map((slot, slotIndex) => (
                                                                        <div
                                                                            key={slotIndex}
                                                                            className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded bg-white"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`offline-${dayName}-${slotIndex}`}
                                                                                        checked={
                                                                                            (slot.type || "individual") ===
                                                                                            "individual"
                                                                                        }
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "offline",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "individual",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Individual</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`offline-${dayName}-${slotIndex}`}
                                                                                        checked={slot.type === "couple"}
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "offline",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "couple",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Couple</span>
                                                                                </label>
                                                                                <label className="inline-flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`offline-${dayName}-${slotIndex}`}
                                                                                        checked={slot.type === "group"}
                                                                                        onChange={() =>
                                                                                            updateDaySlot(
                                                                                                "offline",
                                                                                                dayName,
                                                                                                slotIndex,
                                                                                                "type",
                                                                                                "group",
                                                                                            )
                                                                                        }
                                                                                        className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                    />
                                                                                    <span className="ml-2">Group</span>
                                                                                </label>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="time"
                                                                                    value={slot.startTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateDaySlot(
                                                                                            "offline",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                            "startTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                                                                />
                                                                                <span className="text-gray-500">to</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={slot.endTime || ""}
                                                                                    onChange={(e) =>
                                                                                        updateDaySlot(
                                                                                            "offline",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                            "endTime",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                                                                />
                                                                                <button
                                                                                    onClick={() =>
                                                                                        removeDaySlot(
                                                                                            "offline",
                                                                                            dayName,
                                                                                            slotIndex,
                                                                                        )
                                                                                    }
                                                                                    className="text-red-600 text-sm hover:text-red-800"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {(
                                                                        formData?.offline?.monthly?.dayBasedPattern?.[
                                                                            dayName
                                                                        ]?.slots || []
                                                                    ).length === 0 && (
                                                                            <p className="text-gray-500 text-sm italic">
                                                                                No slots added for {dayName}
                                                                            </p>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Old Weekly Pattern UI (fallback) for Offline */}
                                                {!formData?.offline?.monthly?.dayBasedPattern && (
                                                    <div className="space-y-4">
                                                        {(
                                                            formData?.offline?.monthly?.weeklyPattern || []
                                                        ).map((row, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="border border-gray-200 rounded-lg p-4 space-y-3 bg-green-50"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <p className="font-semibold text-gray-700">
                                                                        Row {idx + 1}
                                                                    </p>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                removeMonthlyPatternRow("offline", idx)
                                                                            }
                                                                            className="text-red-600 text-sm"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                setFormData((prev) => {
                                                                                    const next = { ...prev };
                                                                                    const list = [
                                                                                        ...(next.offline.monthly
                                                                                            .weeklyPattern || []),
                                                                                    ];
                                                                                    list.splice(
                                                                                        idx + 1,
                                                                                        0,
                                                                                        JSON.parse(JSON.stringify(list[idx])),
                                                                                    );
                                                                                    next.offline.monthly.weeklyPattern =
                                                                                        list;
                                                                                    return next;
                                                                                })
                                                                            }
                                                                            className="text-[#2F6288] text-sm"
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {weekdayOptions.map((d) => (
                                                                        <button
                                                                            key={d}
                                                                            onClick={() =>
                                                                                toggleMonthlyPatternDay("offline", idx, d)
                                                                            }
                                                                            className={`px-3 py-1 rounded-full border text-sm ${row.days?.includes(d) ? "bg-[#2F6288] text-white border-[#2F6288]" : "bg-white text-gray-700 border-gray-300"}`}
                                                                        >
                                                                            {d}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {(row.times || [])
                                                                        .filter(
                                                                            (t) =>
                                                                                (t.type || "individual") ===
                                                                                offlineMonthlyViewType,
                                                                        )
                                                                        .filter((t) => {
                                                                            if (offlineMonthlyViewType === "couple") {
                                                                                const booked = Number(t.bookedCount || 0);
                                                                                return booked < 2;
                                                                            }
                                                                            if (offlineMonthlyViewType === "group") {
                                                                                const booked = Number(t.bookedCount || 0);
                                                                                const gMax = Number(
                                                                                    formData?.offline?.monthly?.groupMax ||
                                                                                    0,
                                                                                );
                                                                                return gMax > 0 ? booked < gMax : true;
                                                                            }
                                                                            return true;
                                                                        })
                                                                        .map((t, tIdx) => (
                                                                            <div
                                                                                key={tIdx}
                                                                                className="flex flex-col md:flex-row md:items-center gap-2 p-2 border rounded bg-white"
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`mo-offline-${idx}-${tIdx}`}
                                                                                            checked={
                                                                                                (t.type || "individual") ===
                                                                                                "individual"
                                                                                            }
                                                                                            onChange={() =>
                                                                                                updateMonthlyPatternTime(
                                                                                                    "offline",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                    "type",
                                                                                                    "individual",
                                                                                                )
                                                                                            }
                                                                                            className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                        />
                                                                                        <span className="ml-2">
                                                                                            Individual
                                                                                        </span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`mo-offline-${idx}-${tIdx}`}
                                                                                            checked={t.type === "couple"}
                                                                                            onChange={() =>
                                                                                                updateMonthlyPatternTime(
                                                                                                    "offline",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                    "type",
                                                                                                    "couple",
                                                                                                )
                                                                                            }
                                                                                            className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                        />
                                                                                        <span className="ml-2">Couple</span>
                                                                                    </label>
                                                                                    <label className="inline-flex items-center">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`mo-offline-${idx}-${tIdx}`}
                                                                                            checked={t.type === "group"}
                                                                                            onChange={() =>
                                                                                                updateMonthlyPatternTime(
                                                                                                    "offline",
                                                                                                    idx,
                                                                                                    tIdx,
                                                                                                    "type",
                                                                                                    "group",
                                                                                                )
                                                                                            }
                                                                                            className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                        />
                                                                                        <span className="ml-2">Group</span>
                                                                                    </label>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                    <input
                                                                                        type="time"
                                                                                        value={t.startTime || ""}
                                                                                        onChange={(e) =>
                                                                                            updateMonthlyPatternTime(
                                                                                                "offline",
                                                                                                idx,
                                                                                                tIdx,
                                                                                                "startTime",
                                                                                                e.target.value,
                                                                                            )
                                                                                        }
                                                                                        className="border p-2 rounded flex-1"
                                                                                    />
                                                                                    <span>-</span>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={t.endTime || ""}
                                                                                        onChange={(e) =>
                                                                                            updateMonthlyPatternTime(
                                                                                                "offline",
                                                                                                idx,
                                                                                                tIdx,
                                                                                                "endTime",
                                                                                                e.target.value,
                                                                                            )
                                                                                        }
                                                                                        className="border p-2 rounded flex-1"
                                                                                    />
                                                                                    {offlineMonthlyViewType !==
                                                                                        "individual" && (
                                                                                            <>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <label className="text-xs text-gray-600">
                                                                                                        Booked
                                                                                                    </label>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        value={Number(
                                                                                                            t.bookedCount || 0,
                                                                                                        )}
                                                                                                        onChange={(e) =>
                                                                                                            updateMonthlyPatternTime(
                                                                                                                "offline",
                                                                                                                idx,
                                                                                                                tIdx,
                                                                                                                "bookedCount",
                                                                                                                Number(e.target.value),
                                                                                                            )
                                                                                                        }
                                                                                                        className="w-20 border p-2 rounded text-sm"
                                                                                                    />
                                                                                                </div>
                                                                                                {offlineMonthlyViewType ===
                                                                                                    "couple" && (
                                                                                                        <span className="text-xs text-gray-700">
                                                                                                            Remaining:{" "}
                                                                                                            {Math.max(
                                                                                                                0,
                                                                                                                2 -
                                                                                                                Number(t.bookedCount || 0),
                                                                                                            )}
                                                                                                        </span>
                                                                                                    )}
                                                                                                {offlineMonthlyViewType ===
                                                                                                    "group" && (
                                                                                                        <div className="flex items-center gap-2 text-xs text-gray-700">
                                                                                                            <span>
                                                                                                                Remaining:{" "}
                                                                                                                {Math.max(
                                                                                                                    0,
                                                                                                                    (Number(
                                                                                                                        formData?.offline?.monthly
                                                                                                                            ?.groupMax || 0,
                                                                                                                    ) || 0) -
                                                                                                                    Number(
                                                                                                                        t.bookedCount || 0,
                                                                                                                    ),
                                                                                                                )}
                                                                                                            </span>
                                                                                                            <span className="ml-2">
                                                                                                                Min
                                                                                                            </span>
                                                                                                            <input
                                                                                                                type="number"
                                                                                                                min="0"
                                                                                                                value={
                                                                                                                    formData?.offline?.monthly
                                                                                                                        ?.groupMin || ""
                                                                                                                }
                                                                                                                onChange={(e) =>
                                                                                                                    handleFieldChange(
                                                                                                                        null,
                                                                                                                        "groupMin",
                                                                                                                        e.target.value,
                                                                                                                        "offline",
                                                                                                                        "monthly",
                                                                                                                    )
                                                                                                                }
                                                                                                                className="w-16 border p-1 rounded"
                                                                                                            />
                                                                                                            <span>Max</span>
                                                                                                            <input
                                                                                                                type="number"
                                                                                                                min="0"
                                                                                                                value={
                                                                                                                    formData?.offline?.monthly
                                                                                                                        ?.groupMax || ""
                                                                                                                }
                                                                                                                onChange={(e) =>
                                                                                                                    handleFieldChange(
                                                                                                                        null,
                                                                                                                        "groupMax",
                                                                                                                        e.target.value,
                                                                                                                        "offline",
                                                                                                                        "monthly",
                                                                                                                    )
                                                                                                                }
                                                                                                                className="w-16 border p-1 rounded"
                                                                                                            />
                                                                                                        </div>
                                                                                                    )}
                                                                                            </>
                                                                                        )}
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            removeMonthlyPatternTime(
                                                                                                "offline",
                                                                                                idx,
                                                                                                tIdx,
                                                                                            )
                                                                                        }
                                                                                        className="text-red-600 text-sm"
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            addMonthlyPatternTime(
                                                                                                "offline",
                                                                                                idx,
                                                                                            )
                                                                                        }
                                                                                        className="text-[#2F6288] text-sm"
                                                                                    >
                                                                                        Add
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* One-Time Offline Purchase */}
                            {(formData?.offline?.planChoice === "One Time" ||
                                formData?.offline?.planChoice === "Both") && (
                                    <div className="mb-8">
                                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                                            {isEditing
                                                ? "Edit One-Time Offline Purchase"
                                                : "One-Time Offline Purchase"}{" "}
                                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-md font-semibold text-gray-700 mb-2">
                                                    One-Time Offline Purchase Price
                                                </label>
                                                <input
                                                    placeholder="Enter Price"
                                                    type="number"
                                                    value={formData?.offline?.oneTime?.price}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            null,
                                                            "price",
                                                            e.target.value,
                                                            "offline",
                                                            "oneTime",
                                                        )
                                                    }
                                                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                                />
                                                {errors.oneTimeOfflinePrice && (
                                                    <p className="text-red-500 text-sm mt-1">
                                                        {errors.oneTimeOfflinePrice}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Occupancy & Price - One-Time Offline */}
                                            <div className="mb-4">
                                                <label className="block text-md font-semibold text-gray-700 mb-2 mt-4">
                                                    Occupancy & Price
                                                </label>
                                                {formData?.offline?.oneTime?.occupancies?.map(
                                                    (occ, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-center"
                                                        >
                                                            <select
                                                                value={occ.type || ""}
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].type = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg bg-white"
                                                            >
                                                                <option value="">Select Occupancy</option>
                                                                <option value="Individual">Individual</option>
                                                                <option value="Couple">Couple</option>
                                                                <option value="Group">Group</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                value={occ.price || ""}
                                                                placeholder="Price"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].price = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={occ.min || ""}
                                                                placeholder="Min persons"
                                                                onChange={(e) => {
                                                                    const updated = JSON.parse(
                                                                        JSON.stringify(
                                                                            formData.offline.oneTime.occupancies,
                                                                        ),
                                                                    );
                                                                    updated[index].min = e.target.value;
                                                                    handleFieldChange(
                                                                        null,
                                                                        "occupancies",
                                                                        updated,
                                                                        "offline",
                                                                        "oneTime",
                                                                    );
                                                                }}
                                                                className="text-sm w-full border p-3 rounded-lg"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={occ.max || ""}
                                                                    placeholder="Max persons"
                                                                    onChange={(e) => {
                                                                        const updated = JSON.parse(
                                                                            JSON.stringify(
                                                                                formData.offline.oneTime.occupancies,
                                                                            ),
                                                                        );
                                                                        updated[index].max = e.target.value;
                                                                        handleFieldChange(
                                                                            null,
                                                                            "occupancies",
                                                                            updated,
                                                                            "offline",
                                                                            "oneTime",
                                                                        );
                                                                    }}
                                                                    className="text-sm w-full border p-3 rounded-lg"
                                                                />
                                                                {index ===
                                                                    formData?.offline?.oneTime?.occupancies.length -
                                                                    1 ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [
                                                                                ...JSON.parse(
                                                                                    JSON.stringify(
                                                                                        formData.offline.oneTime.occupancies,
                                                                                    ),
                                                                                ),
                                                                                { type: "Individual", price: "" },
                                                                            ];
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "offline",
                                                                                "oneTime",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        +
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = JSON.parse(
                                                                                JSON.stringify(
                                                                                    formData.offline.oneTime.occupancies,
                                                                                ),
                                                                            ).filter((_, i) => i !== index);
                                                                            handleFieldChange(
                                                                                null,
                                                                                "occupancies",
                                                                                updated,
                                                                                "offline",
                                                                                "oneTime",
                                                                            );
                                                                        }}
                                                                        type="button"
                                                                        className="border border-dashed px-2 py-1 rounded text-xl"
                                                                    >
                                                                        -
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        {/* One-Time Offline Slots - Calendar Based */}
                                        <div className="mt-6">
                                            <h3 className="text-lg font-semibold text-gray-700 mb-4">
                                                One-Time Offline – Calendar
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {/* Calendar */}
                                                <div className="border rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button
                                                            onClick={() =>
                                                                prevMonthGuard(setOtOfflineMonth, otOfflineMonth)
                                                            }
                                                            className="px-2 py-1 border rounded"
                                                        >
                                                            Prev
                                                        </button>
                                                        <div className="font-semibold">
                                                            {otOfflineMonth.toLocaleString("default", {
                                                                month: "long",
                                                            })}{" "}
                                                            {otOfflineMonth.getFullYear()}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                setOtOfflineMonth(
                                                                    new Date(
                                                                        otOfflineMonth.getFullYear(),
                                                                        otOfflineMonth.getMonth() + 1,
                                                                        1,
                                                                    ),
                                                                )
                                                            }
                                                            className="px-2 py-1 border rounded"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-1">
                                                        {[
                                                            "Sun",
                                                            "Mon",
                                                            "Tue",
                                                            "Wed",
                                                            "Thu",
                                                            "Fri",
                                                            "Sat",
                                                        ].map((d) => (
                                                            <div key={d}>{d}</div>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1">
                                                        {calGrid(otOfflineMonth).map((d, i) => {
                                                            const y = d ? fmtYMD(d) : "";
                                                            const selected =
                                                                y && otOfflineSelectedDates.includes(y);
                                                            const hasSlots = y && (formData?.offline?.oneTime?.slots || []).some(s => ymd(s.date) === y);
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    disabled={!d || isPast(d)}
                                                                    onClick={() => {
                                                                        if (!d || isPast(d)) return;
                                                                        const ymd = fmtYMD(d);
                                                                        if (otOfflineMulti) {
                                                                            setOtOfflineSelectedDates((prev) =>
                                                                                prev.includes(ymd)
                                                                                    ? prev.filter((x) => x !== ymd)
                                                                                    : [...prev, ymd],
                                                                            );
                                                                        } else {
                                                                            setOtOfflineSelectedDates([ymd]);
                                                                            setOtOfflineDate(ymd);
                                                                        }
                                                                    }}
                                                                    className={`h-10 rounded border text-sm relative ${!d || isPast(d)
                                                                            ? "text-gray-300 border-gray-200 cursor-not-allowed"
                                                                            : selected ||
                                                                                (y === otOfflineDate && !otOfflineMulti)
                                                                                ? "bg-[#2F6288] text-white border-[#2F6288]"
                                                                                : "bg-white text-gray-700 border-gray-200 hover:border-[#2F6288]"
                                                                        }`}
                                                                >
                                                                    {d ? d.getDate() : ""}
                                                                    {hasSlots && (
                                                                        <span className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                                                                            selected || (y === otOfflineDate && !otOfflineMulti) 
                                                                                ? 'bg-white' 
                                                                                : 'bg-[#2F6288]'
                                                                        }`}></span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Multi-select controls */}
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 text-[#2F6288]"
                                                                checked={otOfflineMulti}
                                                                onChange={(e) => {
                                                                    const isMulti = e.target.checked;
                                                                    setOtOfflineMulti(isMulti);
                                                                    // When switching from multi to single, keep only first selected date
                                                                    if (!isMulti && otOfflineSelectedDates.length > 1) {
                                                                        const firstDate = otOfflineSelectedDates[0];
                                                                        setOtOfflineSelectedDates([firstDate]);
                                                                        setOtOfflineDate(firstDate);
                                                                    }
                                                                }}
                                                            />
                                                            <span>Multi-select dates</span>
                                                        </label>
                                                        {otOfflineSelectedDates.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOtOfflineSelectedDates([])}
                                                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                                                            >
                                                                Clear All
                                                            </button>
                                                        )}
                                                    </div>
                                                    {otOfflineSelectedDates.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {otOfflineSelectedDates.map((d) => (
                                                                <span
                                                                    key={d}
                                                                    className="text-xs bg-[#2F6288] text-white px-2 py-0.5 rounded"
                                                                >
                                                                    {d}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (otOfflineSelectedDates.length > 1) {
                                                                    setOtOfflinePending((p) => ({
                                                                        ...p,
                                                                        open: true,
                                                                    }));
                                                                } else {
                                                                    const target =
                                                                        otOfflineSelectedDates[0] || otOfflineDate;
                                                                    if (target)
                                                                        addOneTimeSlotFor("offline", target);
                                                                }
                                                            }}
                                                            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#2F6288]"
                                                        >
                                                            {otOfflineSelectedDates.length > 1
                                                                ? `Add Time Range to ${otOfflineSelectedDates.length} dates`
                                                                : `Add Slot for ${otOfflineSelectedDates[0] || otOfflineDate}`}
                                                        </button>
                                                    </div>

                                                    {otOfflinePending.open &&
                                                        otOfflineSelectedDates.length > 1 && (
                                                            <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                                    Add a time range that will apply to all selected
                                                                    dates
                                                                </p>
                                                                <div className="grid sm:grid-cols-[auto_1fr_auto_1fr_auto] grid-cols-1 gap-2 items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <label className="inline-flex items-center text-xs">
                                                                            <input
                                                                                type="radio"
                                                                                name="ot-offline-type"
                                                                                checked={
                                                                                    (otOfflinePending.type ||
                                                                                        "individual") === "individual"
                                                                                }
                                                                                onChange={() =>
                                                                                    setOtOfflinePending((p) => ({
                                                                                        ...p,
                                                                                        type: "individual",
                                                                                    }))
                                                                                }
                                                                                className="h-4 w-4 text-[#2F6288]"
                                                                            />
                                                                            <span className="ml-1">Individual</span>
                                                                        </label>
                                                                        <label className="inline-flex items-center text-xs">
                                                                            <input
                                                                                type="radio"
                                                                                name="ot-offline-type"
                                                                                checked={
                                                                                    otOfflinePending.type === "couple"
                                                                                }
                                                                                onChange={() =>
                                                                                    setOtOfflinePending((p) => ({
                                                                                        ...p,
                                                                                        type: "couple",
                                                                                    }))
                                                                                }
                                                                                className="h-4 w-4 text-[#2F6288]"
                                                                            />
                                                                            <span className="ml-1">Couple</span>
                                                                        </label>
                                                                        <label className="inline-flex items-center text-xs">
                                                                            <input
                                                                                type="radio"
                                                                                name="ot-offline-type"
                                                                                checked={
                                                                                    otOfflinePending.type === "group"
                                                                                }
                                                                                onChange={() =>
                                                                                    setOtOfflinePending((p) => ({
                                                                                        ...p,
                                                                                        type: "group",
                                                                                    }))
                                                                                }
                                                                                className="h-4 w-4 text-[#2F6288]"
                                                                            />
                                                                            <span className="ml-1">Group</span>
                                                                        </label>
                                                                    </div>
                                                                    <input
                                                                        type="time"
                                                                        value={otOfflinePending.startTime}
                                                                        onChange={(e) =>
                                                                            setOtOfflinePending((p) => ({
                                                                                ...p,
                                                                                startTime: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                                                                    />
                                                                    <span className="hidden sm:flex justify-center text-gray-500">
                                                                        -
                                                                    </span>
                                                                    <input
                                                                        type="time"
                                                                        value={otOfflinePending.endTime}
                                                                        onChange={(e) =>
                                                                            setOtOfflinePending((p) => ({
                                                                                ...p,
                                                                                endTime: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                                                                    />
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={applyOtOfflinePending}
                                                                            className="text-xs px-3 py-1.5 bg-[#2F6288] text-white rounded-md"
                                                                        >
                                                                            Apply to {otOfflineSelectedDates.length}{" "}
                                                                            dates
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setOtOfflinePending({
                                                                                    open: false,
                                                                                    startTime: "",
                                                                                    endTime: "",
                                                                                    type: "individual",
                                                                                })
                                                                            }
                                                                            className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>
                                                {/* Slots for selected date */}
                                                <div className="border rounded-lg p-3">
                                                    <div className="font-semibold mb-2">
                                                        Slots for {otOfflineSelectedDates[0] || otOfflineDate}
                                                    </div>
                                                    <div className="space-y-3">
                                                        {(formData?.offline?.oneTime?.slots || [])
                                                            .filter((s) => ymd(s.date) === (otOfflineSelectedDates[0] || otOfflineDate))
                                                            .map((s, idx) => {
                                                                const slotType = s.type || "individual";
                                                                return (
                                                                    <div
                                                                        key={s.id || `offline-ot-${idx}`}
                                                                        className="border rounded-lg p-3 space-y-2 bg-gray-50"
                                                                    >
                                                                        <div className="flex items-center gap-4 mb-2">
                                                                            <label className="inline-flex items-center cursor-pointer">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`offline-slot-type-${s.id}`}
                                                                                    value="individual"
                                                                                    checked={slotType === "individual"}
                                                                                    onChange={() => {
                                                                                        updateOneTimeSlot(
                                                                                            "offline",
                                                                                            s.id,
                                                                                            "type",
                                                                                            "individual",
                                                                                        );
                                                                                    }}
                                                                                    className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-2">Individual</span>
                                                                            </label>
                                                                            <label className="inline-flex items-center cursor-pointer">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`offline-slot-type-${s.id}`}
                                                                                    value="couple"
                                                                                    checked={slotType === "couple"}
                                                                                    onChange={() => {
                                                                                        updateOneTimeSlot(
                                                                                            "offline",
                                                                                            s.id,
                                                                                            "type",
                                                                                            "couple",
                                                                                        );
                                                                                    }}
                                                                                    className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-2">Couple</span>
                                                                            </label>
                                                                            <label className="inline-flex items-center cursor-pointer">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`offline-slot-type-${s.id}`}
                                                                                    value="group"
                                                                                    checked={slotType === "group"}
                                                                                    onChange={() => {
                                                                                        updateOneTimeSlot(
                                                                                            "offline",
                                                                                            s.id,
                                                                                            "type",
                                                                                            "group",
                                                                                        );
                                                                                    }}
                                                                                    className="form-radio h-4 w-4 text-[#2F6288]"
                                                                                />
                                                                                <span className="ml-2">Group</span>
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="time"
                                                                                value={s.startTime || ""}
                                                                                onChange={(e) =>
                                                                                    updateOneTimeSlot(
                                                                                        "offline",
                                                                                        s.id,
                                                                                        "startTime",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                className="border p-2 rounded flex-1"
                                                                            />
                                                                            <span>-</span>
                                                                            <input
                                                                                type="time"
                                                                                value={s.endTime || ""}
                                                                                onChange={(e) =>
                                                                                    updateOneTimeSlot(
                                                                                        "offline",
                                                                                        s.id,
                                                                                        "endTime",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                className="border p-2 rounded flex-1"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    removeOneTimeSlot("offline", s.id)
                                                                                }
                                                                                className="text-red-600 hover:text-red-800 p-1"
                                                                                title="Delete slot"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </>
                    )}

                {/* Organizer Information */}
                <div className="mb-8">
                    <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                        {isEditing ? "Edit Organizer Information" : "Organizer Information"}{" "}
                        <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Organizer Name
                            </label>
                            <input
                                placeholder="Enter Organizer Name"
                                value={formData?.organizer?.name || ""}
                                onChange={(e) =>
                                    handleFieldChange("organizer", "name", e.target.value)
                                }
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Organizer Email <span className="text-red-500">*</span>
                                {isEditing && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        (Cannot be changed during edit)
                                    </span>
                                )}
                            </label>
                            <input
                                placeholder="Enter Organizer Email (Required)"
                                type="email"
                                value={formData?.organizer?.email}
                                onChange={(e) =>
                                    handleFieldChange("organizer", "email", e.target.value)
                                }
                                className={`text-sm w-full border border-gray-300 p-3 rounded-lg ${isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                disabled={isEditing}
                                required
                            />
                            {errors?.organizerEmail && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors?.organizerEmail}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Organizer Address
                            </label>
                            <textarea
                                placeholder="Enter Organizer Address"
                                value={formData?.organizer?.address}
                                onChange={(e) =>
                                    handleFieldChange("organizer", "address", e.target.value)
                                }
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg  h-24 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Google Meet Link{" "}
                                {(formData?.guideCard?.subCategory === "Online" ||
                                    formData?.guideCard?.subCategory === "Both") && (
                                        <span className="text-red-500">*</span>
                                    )}
                                {formData?.guideCard?.subCategory === "Offline" && (
                                    <span className="text-gray-500 text-sm">
                                        (Optional for offline mode)
                                    </span>
                                )}
                            </label>
                            <input
                                placeholder={
                                    formData?.guideCard?.subCategory === "Offline"
                                        ? "Enter Google Meet Link (Optional)"
                                        : "Enter Google Meet Link (Required)"
                                }
                                type="url"
                                value={formData?.organizer?.googleMeetLink}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "organizer",
                                        "googleMeetLink",
                                        e.target.value,
                                    )
                                }
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                disabled={isEditing}
                                required={
                                    formData?.guideCard?.subCategory === "Online" ||
                                    formData?.guideCard?.subCategory === "Both"
                                }
                            />
                            {isEditing && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Google Meet link cannot be edited
                                </p>
                            )}
                            {errors?.organizerGoogleMeetLink && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors?.organizerGoogleMeetLink}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Contact Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                placeholder="Enter Contact Number (Required)"
                                type="tel"
                                value={formData?.organizer?.contactNumber}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "organizer",
                                        "contactNumber",
                                        e.target.value,
                                    )
                                }
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Session */}
                <div className="mb-8">
                    {/* session title/description */}
                    <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                        {isEditing ? "Edit Session" : "Session"}{" "}
                        <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                    </h2>
                    <div>
                        <label className="block text-md font-semibold text-gray-700 mb-2">
                            Session Description
                        </label>
                        <RichTextEditor
                            value={formData?.session?.sessiondescription}
                            onChange={(value) =>
                                handleFieldChange("session", "sessiondescription", value)
                            }
                            placeholder="Enter Description"
                            rows={4}
                        />
                    </div>

                    {/* images */}
                    <label className="block font-semibold mb-2">
                        Add Images ( Maximum 11 Images )
                    </label>
                    <div className="mb-6">
                        {formData?.session?.images &&
                            formData?.session?.images?.length < 11 && (
                                <label className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                                    <img
                                        src="/assets/admin/upload.svg"
                                        alt="Upload Icon"
                                        className="w-10 h-10 mb-2"
                                    />
                                    <span>Click to upload image</span>
                                    <p className="text-gray-400">Size: (700×400)px</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={Object.keys(isSessionImageUploading || {}).some(
                                            (key) => isSessionImageUploading[key],
                                        )}
                                    />
                                </label>
                            )}

                        {/* Show upload progress loaders */}
                        <div className="flex flex-wrap gap-4 mt-4">
                            {Object.keys(isSessionImageUploading || {})
                                .filter((key) => isSessionImageUploading[key])
                                .map((uploadId) => (
                                    <div
                                        key={uploadId}
                                        className="w-40 h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center"
                                    >
                                        <div className="text-center flex flex-col items-center">
                                            <div className="relative w-8 h-8 mb-2">
                                                <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                                                <div
                                                    className="absolute inset-0 border-2 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                                    style={{
                                                        background: `conic-gradient(from 0deg, #2F6288 ${(sessionImageUploadProgress[uploadId] || 0) * 3.6}deg, transparent ${(sessionImageUploadProgress[uploadId] || 0) * 3.6}deg)`,
                                                    }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xs font-semibold text-[#2F6288]">
                                                        {sessionImageUploadProgress[uploadId] || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-[#2F6288] font-medium">
                                                Uploading...
                                            </p>
                                            <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                                                <div
                                                    className="bg-[#2F6288] h-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${sessionImageUploadProgress[uploadId] || 0}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-4">
                            {formData?.session?.images &&
                                formData?.session?.images.map((img, index) => (
                                    <div key={index} className="relative w-40 h-28">
                                        <img
                                            src={img}
                                            alt={`img-${index}`}
                                            className="w-full h-full object-cover rounded shadow"
                                        />
                                        <button
                                            onClick={() => openImageEditor(img, 'session', index)}
                                            className="absolute top-1 left-1 bg-blue-500 text-white border border-blue-600 rounded-full p-1 hover:bg-blue-600 transition-colors"
                                            title="Edit Image"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                                            title="Remove Image"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* videos */}
                    <label className="block font-semibold mb-2">
                        Add Videos ( Maximum 6 Videos )
                    </label>
                    <div className="mb-4">
                        {formData?.session?.videos &&
                            formData?.session?.videos.length < 6 && (
                                <label className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                                    <img
                                        src="/assets/admin/upload.svg"
                                        alt="Upload Icon"
                                        className="w-10 h-10 mb-2"
                                    />
                                    <span>Click to upload Videos</span>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        multiple
                                        onChange={handleVideoUpload}
                                        className="hidden"
                                        disabled={Object.keys(isSessionVideoUploading || {}).some(
                                            (key) => isSessionVideoUploading[key],
                                        )}
                                    />
                                </label>
                            )}

                        {/* Show upload progress loaders */}
                        <div className="flex flex-wrap gap-4 mt-4">
                            {Object.keys(isSessionVideoUploading || {})
                                .filter((key) => isSessionVideoUploading[key])
                                .map((uploadId) => (
                                    <div
                                        key={uploadId}
                                        className="w-40 h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-black"
                                    >
                                        <div className="text-center flex flex-col items-center">
                                            <div className="relative w-8 h-8 mb-2">
                                                <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                                                <div
                                                    className="absolute inset-0 border-2 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                                    style={{
                                                        background: `conic-gradient(from 0deg, #2F6288 ${(sessionVideoUploadProgress[uploadId] || 0) * 3.6}deg, transparent ${(sessionVideoUploadProgress[uploadId] || 0) * 3.6}deg)`,
                                                    }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xs font-semibold text-white">
                                                        {sessionVideoUploadProgress[uploadId] || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-white font-medium">
                                                Uploading...
                                            </p>
                                            <div className="w-16 bg-gray-600 rounded-full h-1 mt-1">
                                                <div
                                                    className="bg-[#2F6288] h-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${sessionVideoUploadProgress[uploadId] || 0}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-4">
                            {formData?.session &&
                                formData?.session?.videos.map((vid, index) => (
                                    <div key={index} className="relative w-40 h-28 bg-black">
                                        <video
                                            src={vid}
                                            controls
                                            className="w-full h-full rounded shadow object-cover"
                                        />
                                        <button
                                            onClick={() => removeVideo(index)}
                                            className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* title/description/free trial video upload */}
                    <div className="mb-6 space-y-4">
                        {/* title */}
                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Title"
                                value={formData?.session?.title}
                                onChange={(e) =>
                                    handleFieldChange("session", "title", e.target.value)
                                }
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                            />
                            {errors?.monthlyDiscount && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors?.monthlyDiscount}
                                </p>
                            )}
                        </div>

                        {/* description */}
                        <div>
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Description
                            </label>
                            <RichTextEditor
                                value={formData?.session?.description}
                                onChange={(value) =>
                                    handleFieldChange("session", "description", value)
                                }
                                placeholder="Enter Description"
                                rows={4}
                            />
                        </div>

                        {/* free trial video upload */}
                        <div>
                            <h3 className="block text-md font-semibold text-gray-700 mb-2">
                                Free Trial Video Upload
                            </h3>
                            <div
                                className={`border-2 border-dashed h-40 rounded mb-4 flex items-center justify-center cursor-pointer transition-colors ${dragActive
                                        ? "border-[#2F6288] bg-[#2F6288]/10"
                                        : "border-gray-300 hover:bg-gray-50"
                                    }`}
                                onDrop={handleFreeTrialDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() =>
                                    !isFreeTrialVideoUploading &&
                                    document.getElementById("free-trial-upload").click()
                                }
                            >
                                {formData?.session && formData?.session?.freeTrialVideo ? (
                                    <div className="relative h-full flex items-center">
                                        <video
                                            src={formData?.session?.freeTrialVideo}
                                            className="h-full object-contain rounded"
                                            controls
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange("session", "freeTrialVideo", null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : isFreeTrialVideoUploading ? (
                                    <div className="text-center flex flex-col items-center">
                                        <div className="relative w-12 h-12 mb-3">
                                            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                            <div
                                                className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                                style={{
                                                    background: `conic-gradient(from 0deg, #2F6288 ${freeTrialVideoUploadProgress * 3.6}deg, transparent ${freeTrialVideoUploadProgress * 3.6}deg)`,
                                                }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-[#2F6288]">
                                                    {freeTrialVideoUploadProgress}%
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[#2F6288] font-medium">
                                            Uploading Video...
                                        </p>
                                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                                            <div
                                                className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${freeTrialVideoUploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 flex flex-col items-center">
                                        <img
                                            src="/assets/admin/upload.svg"
                                            alt="Upload Icon"
                                            className="w-12 h-12 mb-2"
                                        />
                                        <p>
                                            {dragActive
                                                ? "Drop video here..."
                                                : "Click to upload or drag and drop"}
                                        </p>
                                        <p className="text-sm text-gray-400">Upload trial video</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) =>
                                        handleFreeTrialVideoUpload(e.target.files[0])
                                    }
                                    className="hidden"
                                    id="free-trial-upload"
                                    disabled={isFreeTrialVideoUploading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meet Your Pilgrim Guide */}
                    <div className="mb-8">
                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                            {isEditing
                                ? "Edit Meet Your Pilgrim Guide"
                                : "Meet Your Pilgrim Guide"}{" "}
                            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                        </h2>

                        <div className="mb-6 pt-4 relative flex flex-col space-y-4">
                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Add Photo
                            </label>
                            {formData?.guide?.[0]?.image ? (
                                <div className="relative inline-block mb-4">
                                    <img
                                        src={formData.guide[0].image}
                                        alt="Preview"
                                        className="w-64 h-auto object-contain rounded shadow"
                                    />
                                    <button
                                        onClick={() => openImageEditor(formData.guide[0].image, 'guide')}
                                        className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                                        title="Edit Image - Resize, Crop, Rotate"
                                    >
                                        <Edit2 size={16} />
                                        <span className="text-xs font-semibold">Edit Size</span>
                                    </button>
                                    <button
                                        onClick={handleGuideImageRemove}
                                        className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-2 hover:bg-gray-200"
                                        title="Remove Image"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : isGuideUploading ? (
                                <div className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
                                    <div className="text-center flex flex-col items-center">
                                        <div className="relative w-12 h-12 mb-3">
                                            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                            <div
                                                className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                                style={{
                                                    background: `conic-gradient(from 0deg, #2F6288 ${guideUploadProgress * 3.6}deg, transparent ${guideUploadProgress * 3.6}deg)`,
                                                }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-[#2F6288]">
                                                    {guideUploadProgress}%
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[#2F6288] font-medium">
                                            Uploading Guide Image...
                                        </p>
                                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                                            <div
                                                className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${guideUploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <label
                                        htmlFor="guide-upload"
                                        className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                                    >
                                        <img
                                            src="/assets/admin/upload.svg"
                                            alt="Upload Icon"
                                            className="w-12 h-12 mb-2"
                                        />
                                        <span>Click to upload image</span>
                                        <span className="text-sm text-gray-400">
                                            Size: (400×540)px
                                        </span>
                                        <input
                                            id="guide-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleGuideImageChange(e.target.files[0])
                                            }
                                            className="hidden"
                                            disabled={isGuideUploading}
                                        />
                                    </label>
                                </div>
                            )}

                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData?.guide?.[0]?.title || ""}
                                placeholder="Enter title"
                                onChange={(e) => handleGuideChange("title", e.target.value)}
                                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                            />

                            <label className="block text-md font-semibold text-gray-700 mb-2">
                                Description
                            </label>
                            <RichTextEditor
                                value={formData?.guide?.[0]?.description || ""}
                                onChange={(value) => handleGuideChange("description", value)}
                                placeholder="Enter description"
                                rows={4}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-4">
                    <button
                        onClick={onSaveRetreat}
                        className="text-sm flex p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                    >
                        {isEditing ? "Update Pilgrim Guide" : "Add Pilgrim Guide"}
                    </button>
                    {isEditing && (
                        <button
                            onClick={cancelEdit}
                            className="text-sm px-8 py-4 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Current Guides */}
                {allData && (
                    <div className="mt-8">
                        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                            Current Guides
                        </h2>
                        <DndProvider backend={HTML5Backend}>
                            <div className="space-y-3">
                                {slideData.map((slide, index) => (
                                    <SlideItem
                                        key={index}
                                        index={index}
                                        slide={slide}
                                        moveSlide={moveSlide}
                                        removeSlide={removeSlide}
                                        editSlide={editSlide}
                                        toggleSlideVisibility={toggleSlideVisibility}
                                        isLoading={isLoading}
                                    />
                                ))}
                            </div>
                        </DndProvider>
                    </div>
                )}
            </div>

            {/* Image Editor Modal */}
            {isImageEditorOpen && editingImage && (
                <ImageEditor
                    imageUrl={editingImage}
                    onSave={handleImageEditorSave}
                    onCancel={handleImageEditorCancel}
                />
            )}

            {/* Loading Overlay - Shows while saving edited image */}
            {isSavingEditedImage && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-800">Saving Image...</p>
                            <p className="text-sm text-gray-600 mt-2">Please wait while we upload your changes</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
