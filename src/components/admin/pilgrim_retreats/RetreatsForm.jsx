import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDragIndicator } from "react-icons/md";
import { FaEdit, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import { useDrag, useDrop } from "react-dnd";
import { useDropzone } from "react-dropzone";
import { Plus, Edit2, X } from "lucide-react";
import {
    deleteRetreatItem,
    fetchRetreatData,
    saveOrUpdateRetreatData,
    saveOrganizerData,
} from "../../../services/pilgrim_retreat/retreatService";
import { setRetreatData } from "../../../features/pilgrim_retreat/pilgrimRetreatSlice";
import { useDispatch } from "react-redux";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { storage } from "../../../services/firebase";
import { showError, showSuccess } from "../../../utils/toast";
import RichTextEditor from "../../common/RichTextEditor";
import ImageEditor from "../../common/ImageEditor";
import { v4 as uuidv4 } from "uuid";

const ItemType = "RETREAT";

function SlideItem({ slide, index, moveSlide, onEdit, onDelete, onToggle }) {
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
            className="flex items-center justify-between p-3 rounded-lg shadow bg-white mb-2 border"
        >
            <div className="flex items-center gap-3">
                <MdDragIndicator className="text-gray-400 cursor-move" />
                {(slide?.thumbnailType && slide?.thumbnailType.startsWith("video/")) ||
                    (slide?.image &&
                        (slide.image.includes(".mp4") || slide.image.includes("video"))) ? (
                    <video
                        src={slide?.image}
                        className="w-16 h-16 object-cover rounded mt-1"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => e.target.pause()}
                    />
                ) : (
                    <img
                        src={slide?.image}
                        alt="Slide Thumbnail"
                        className="w-16 h-16 object-cover rounded mt-1"
                    />
                )}
                <div>
                    <p className="font-semibold">{slide?.title}</p>
                    <p className="text-sm text-gray-500">Link: {slide?.link}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onToggle(index)}
                    className={`text-xs px-3 py-1 rounded font-semibold cursor-pointer
                        ${slide?.active !== false ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                >
                    {slide?.active !== false ? "Visible" : "Not Visible"}
                </button>
                <button onClick={() => onEdit(index)} className="text-blue-600">
                    <FaEdit />
                </button>
                <button onClick={() => onDelete(index)} className="text-gray-600">
                    <FaTrash />
                </button>
            </div>
        </div>
    );
}

export default function RetreatsForm() {
    const [formData, setFormData] = useState({
        pilgrimRetreatCard: {
            title: "",
            image: null,
            thumbnailType: null,
            location: "",
            price: "",
            gst: "",
            category: "",
            categories: [],
            description: "",
            duration: "",
            listingType: "Listing", // Default to "Listing"
        },
        monthlySubscription: {
            price: "",
            discount: "",
            description: "",
        },
        oneTimePurchase: {
            price: "",
            images: [],
            videos: [],
            description: "",
        },
        session: {
            title: "",
            description1: "",
            description2: "",
            description3: "",
            dateOptions: [{ start: "", end: "" }],
            occupancies: [{ type: "Single", price: "" }],
            showOccupancyInRetreat: false,
        },
        features: [],
        location: "",
        programSchedule: [], // This will now be populated with objects that have title, description, and points array
        retreatDescription: [],
        faqs: [],
        meetGuide: {
            title: "",
            description: "",
            email: "",
            number: "",
            image: null,
        },
    });
    const dispatch = useDispatch();

    // Current items in the list
    const [items, setItems] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    // const [dragActive, setDragActive] = useState(false);

    // Image Editor States
    const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
    const [editingImage, setEditingImage] = useState(null);
    const [editingImageType, setEditingImageType] = useState(null); // 'card', 'meetGuide', 'oneTime', 'feature'
    const [editingImageIndex, setEditingImageIndex] = useState(null); // for arrays
    const [isSavingEditedImage, setIsSavingEditedImage] = useState(false);

    const handleFieldChange = (section, field, value) => {
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    };

    // Pilgrim Retreat Card
    const {
        getRootProps: getCardImageRootProps,
        getInputProps: getCardImageInputProps,
        isDragActive: isCardDragActive,
    } = useDropzone({
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file) {
                // Validate file type
                if (
                    !file.type.startsWith("image/") &&
                    !file.type.startsWith("video/")
                ) {
                    alert("Please upload an image or video file");
                    return;
                }

                try {
                    setFormData((prev) => ({
                        ...prev,
                        isCardUploading: true,
                        cardUploadProgress: 0,
                    }));

                    const storageRef = ref(
                        storage,
                        `pilgrimCards/${file.name}_${Date.now()}`,
                    );
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress =
                                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setFormData((prev) => ({
                                ...prev,
                                cardUploadProgress: Math.round(progress),
                            }));
                        },
                        (error) => {
                            console.error("Upload failed:", error);
                            setFormData((prev) => ({
                                ...prev,
                                isCardUploading: false,
                                cardUploadProgress: 0,
                            }));
                        },
                        async () => {
                            // Upload complete
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            handleFieldChange("pilgrimRetreatCard", "image", downloadURL);
                            handleFieldChange(
                                "pilgrimRetreatCard",
                                "thumbnailType",
                                file.type,
                            );

                            setFormData((prev) => ({
                                ...prev,
                                isCardUploading: false,
                                cardUploadProgress: 0,
                            }));
                        },
                    );
                } catch (err) {
                    console.error("Error uploading file:", err);
                    setFormData((prev) => ({
                        ...prev,
                        isCardUploading: false,
                        cardUploadProgress: 0,
                    }));
                }
            }
        },
    });

    // const toggleCategory = (cat) => {
    //     const categories = [...formData.pilgrimRetreatCard.categories];
    //     const index = categories.indexOf(cat);

    //     if (index === -1) {
    //         categories.push(cat);
    //     } else {
    //         categories.splice(index, 1);
    //     }

    //     handleFieldChange("pilgrimRetreatCard", "categories", categories);
    // };

    const handleCategorySelect = (cat) => {
        handleFieldChange("pilgrimRetreatCard", "category", cat);
    };

    const addNewCategory = () => {
        const newCategory = prompt("Enter new category name:");
        if (
            newCategory &&
            !formData.pilgrimRetreatCard.categories.includes(newCategory)
        ) {
            setFormData((prev) => ({
                ...prev,
                pilgrimRetreatCard: {
                    ...prev.pilgrimRetreatCard,
                    categories: [...prev.pilgrimRetreatCard.categories, newCategory],
                },
            }));
        }
    };

    // Session Functions
    const addDateOption = () => {
        const updated = [...formData.session.dateOptions, { start: "", end: "" }];
        handleFieldChange("session", "dateOptions", updated);
    };

    const updateDateOption = (index, field, value) => {
        const updated = [...formData.session.dateOptions];
        updated[index][field] = value;
        handleFieldChange("session", "dateOptions", updated);
    };

    const removeDateOption = (index) => {
        const updated = [...formData.session.dateOptions];
        updated.splice(index, 1);
        handleFieldChange("session", "dateOptions", updated);
    };

    const addOccupancy = () => {
        const updated = [...formData.session.occupancies, { type: "", price: "" }];
        handleFieldChange("session", "occupancies", updated);
    };

    const updateOccupancy = (index, field, value) => {
        const updated = [...formData.session.occupancies];
        updated[index] = { ...updated[index], [field]: value };
        handleFieldChange("session", "occupancies", updated);
    };

    const removeOccupancy = (index) => {
        const updated = [...formData.session.occupancies];
        updated.splice(index, 1);
        handleFieldChange("session", "occupancies", updated);
    };

    const addFeature = () => {
        setFormData((prev) => ({
            ...prev,
            features: [
                ...prev.features,
                { id: Date.now(), title: "", shortdescription: "", image: null },
            ],
        }));
    };

    const handleFeatureChange = (index, field, value) => {
        const updated = [...formData.features];
        updated[index][field] = value;
        setFormData((prev) => ({ ...prev, features: updated }));
    };

    const handleFeatureImageChange = async (index, file) => {
        if (!file) return;

        try {
            const storageRef = ref(
                storage,
                `featureImages/${file.name}_${Date.now()}`,
            ); // unique file name
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    // Optional: track upload progress
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                },
                (error) => {
                    console.error("Upload failed:", error);
                },
                async () => {
                    // Upload complete, get the download URL
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const updated = [...formData.features];
                    updated[index].image = downloadURL;
                    setFormData((prev) => ({ ...prev, features: updated }));
                },
            );
        } catch (err) {
            console.error("Error uploading file:", err);
        }
    };

    const removeFeature = (index) => {
        const updated = [...formData.features];
        updated.splice(index, 1);
        setFormData((prev) => ({ ...prev, features: updated }));
    };

    // Program Schedule Functions
    const addProgram = () => {
        setFormData((prev) => ({
            ...prev,
            programSchedule: [
                ...prev.programSchedule,
                {
                    title: "",
                    points: [{ title: "", subpoints: [] }],
                },
            ],
        }));
    };

    const handleProgramChange = (index, field, value) => {
        const updated = [...formData.programSchedule];
        updated[index][field] = value;
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const handleProgramPointChange = (programIndex, pointIndex, value) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points[pointIndex].title = value;
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const handleProgramSubPointChange = (
        programIndex,
        pointIndex,
        subIndex,
        value,
    ) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points[pointIndex].subpoints[subIndex] = value;
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const addProgramPoint = (programIndex) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points.push({ title: "", subpoints: [] });
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const removeProgramPoint = (programIndex, pointIndex) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points.splice(pointIndex, 1);
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const addProgramSubPoint = (programIndex, pointIndex) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points[pointIndex].subpoints.push("");
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const removeProgramSubPoint = (programIndex, pointIndex, subIndex) => {
        const updated = [...formData.programSchedule];
        updated[programIndex].points[pointIndex].subpoints.splice(subIndex, 1);
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    const removeProgram = (index) => {
        const updated = [...formData.programSchedule];
        updated.splice(index, 1);
        setFormData((prev) => ({ ...prev, programSchedule: updated }));
    };

    // Retreat Description Functions
    const addDescriptionPoint = () => {
        setFormData((prev) => ({
            ...prev,
            retreatDescription: [
                ...prev.retreatDescription,
                { id: Date.now(), title: "", subpoints: [""] },
            ],
        }));
    };

    const handlePointTitleChange = (index, value) => {
        const updated = [...formData.retreatDescription];
        updated[index].title = value;
        setFormData((prev) => ({ ...prev, retreatDescription: updated }));
    };

    const handleSubPointChange = (pointIndex, subIndex, value) => {
        const updated = [...formData.retreatDescription];
        updated[pointIndex].subpoints[subIndex] = value;
        setFormData((prev) => ({ ...prev, retreatDescription: updated }));
    };

    const addSubPoint = (index) => {
        const updated = [...formData.retreatDescription];
        updated[index].subpoints.push("");
        setFormData((prev) => ({ ...prev, retreatDescription: updated }));
    };

    const removeDescriptionPoint = (index) => {
        const updated = [...formData.retreatDescription];
        updated.splice(index, 1);
        setFormData((prev) => ({ ...prev, retreatDescription: updated }));
    };

    const removeSubPoint = (pointIndex, subIndex) => {
        const updated = [...formData.retreatDescription];
        updated[pointIndex].subpoints.splice(subIndex, 1);
        setFormData((prev) => ({ ...prev, retreatDescription: updated }));
    };

    // FAQ Functions - Updated to match RecordedSessionForm.jsx functionality
    const handleFaqChange = (index, field, value) => {
        const updated = [...formData.faqs];
        updated[index][field] = value;
        setFormData((prev) => ({ ...prev, faqs: updated }));
    };

    const addFaq = () => {
        setFormData((prev) => ({
            ...prev,
            faqs: [...prev.faqs, { title: "", description: "" }],
        }));
    };

    const removeFaq = (index) => {
        const updated = [...formData.faqs];
        updated.splice(index, 1);
        setFormData((prev) => ({ ...prev, faqs: updated }));
    };

    // One Time Purchase Image Functions
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const currentImages = formData?.oneTimePurchase?.images || [];
        const allowed = 5 - currentImages.length;

        files.slice(0, allowed).forEach((file, fileIndex) => {
            const uploadId = `img_${Date.now()}_${fileIndex}`;

            setFormData((prev) => ({
                ...prev,
                isImageUploading: { ...prev.isImageUploading, [uploadId]: true },
                imageUploadProgress: { ...prev.imageUploadProgress, [uploadId]: 0 },
            }));

            const storageRef = ref(
                storage,
                `oneTimePurchase/${file.name}_${Date.now()}`,
            );
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setFormData((prev) => ({
                        ...prev,
                        imageUploadProgress: {
                            ...prev.imageUploadProgress,
                            [uploadId]: Math.round(progress),
                        },
                    }));
                },
                (error) => {
                    console.error("Upload failed:", error);
                    setFormData((prev) => {
                        const newImageUploading = { ...prev.isImageUploading };
                        const newImageProgress = { ...prev.imageUploadProgress };
                        delete newImageUploading[uploadId];
                        delete newImageProgress[uploadId];
                        return {
                            ...prev,
                            isImageUploading: newImageUploading,
                            imageUploadProgress: newImageProgress,
                        };
                    });
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const currentImagesNow = formData?.oneTimePurchase?.images || [];
                    const updatedImages = [
                        ...currentImagesNow,
                        downloadURL,
                    ];
                    handleFieldChange("oneTimePurchase", "images", updatedImages);

                    setFormData((prev) => {
                        const newImageUploading = { ...prev.isImageUploading };
                        const newImageProgress = { ...prev.imageUploadProgress };
                        delete newImageUploading[uploadId];
                        delete newImageProgress[uploadId];
                        return {
                            ...prev,
                            isImageUploading: newImageUploading,
                            imageUploadProgress: newImageProgress,
                        };
                    });
                },
            );
        });
    };

    const removeImage = async (index) => {
        try {
            const updated = [...formData.oneTimePurchase.images];
            const urlToDelete = updated[index];

            // Delete from Firebase Storage
            const fileRef = ref(storage, urlToDelete);
            await deleteObject(fileRef);

            // Remove from state
            updated.splice(index, 1);
            handleFieldChange("oneTimePurchase", "images", updated);
        } catch (err) {
            console.error("Error removing image:", err);
            // Even if deletion fails, remove from UI
            const updated = [...formData.oneTimePurchase.images];
            updated.splice(index, 1);
            handleFieldChange("oneTimePurchase", "images", updated);
        }
    };

    // One Time Purchase Video Functions
    const handleVideoUpload = (e) => {
        const files = Array.from(e.target.files);
        const currentVideos = formData?.oneTimePurchase?.videos || [];
        const allowed = 6 - currentVideos.length;

        files.slice(0, allowed).forEach((file, fileIndex) => {
            const uploadId = `vid_${Date.now()}_${fileIndex}`;

            setFormData((prev) => ({
                ...prev,
                isVideoUploading: { ...prev.isVideoUploading, [uploadId]: true },
                videoUploadProgress: { ...prev.videoUploadProgress, [uploadId]: 0 },
            }));

            const storageRef = ref(
                storage,
                `oneTimePurchase/videos/${file.name}_${Date.now()}`,
            );
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setFormData((prev) => ({
                        ...prev,
                        videoUploadProgress: {
                            ...prev.videoUploadProgress,
                            [uploadId]: Math.round(progress),
                        },
                    }));
                },
                (error) => {
                    console.error("Video upload failed:", error);
                    setFormData((prev) => {
                        const newVideoUploading = { ...prev.isVideoUploading };
                        const newVideoProgress = { ...prev.videoUploadProgress };
                        delete newVideoUploading[uploadId];
                        delete newVideoProgress[uploadId];
                        return {
                            ...prev,
                            isVideoUploading: newVideoUploading,
                            videoUploadProgress: newVideoProgress,
                        };
                    });
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const currentVideosNow = formData?.oneTimePurchase?.videos || [];
                    const updatedVideos = [
                        ...currentVideosNow,
                        downloadURL,
                    ];
                    handleFieldChange("oneTimePurchase", "videos", updatedVideos);

                    setFormData((prev) => {
                        const newVideoUploading = { ...prev.isVideoUploading };
                        const newVideoProgress = { ...prev.videoUploadProgress };
                        delete newVideoUploading[uploadId];
                        delete newVideoProgress[uploadId];
                        return {
                            ...prev,
                            isVideoUploading: newVideoUploading,
                            videoUploadProgress: newVideoProgress,
                        };
                    });
                },
            );
        });
    };

    const removeVideo = async (index) => {
        try {
            const updated = [...formData.oneTimePurchase.videos];
            const urlToDelete = updated[index];

            // Delete from Firebase Storage
            const fileRef = ref(storage, urlToDelete);
            await deleteObject(fileRef);

            // Remove from state
            updated.splice(index, 1);
            handleFieldChange("oneTimePurchase", "videos", updated);
        } catch (err) {
            console.error("Error removing video:", err);
            // Even if deletion fails, remove from UI
            const updated = [...formData.oneTimePurchase.videos];
            updated.splice(index, 1);
            handleFieldChange("oneTimePurchase", "videos", updated);
        }
    };

    // Guide Image Functions
    const handleGuideImageChange = (file) => {
        if (!file) return;

        setFormData((prev) => ({
            ...prev,
            isGuideUploading: true,
            guideUploadProgress: 0,
        }));

        const storageRef = ref(storage, `meetGuide/${file.name}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress =
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setFormData((prev) => ({
                    ...prev,
                    guideUploadProgress: Math.round(progress),
                }));
            },
            (error) => {
                console.error("Upload failed:", error);
                setFormData((prev) => ({
                    ...prev,
                    isGuideUploading: false,
                    guideUploadProgress: 0,
                }));
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                handleFieldChange("meetGuide", "image", downloadURL);
                setFormData((prev) => ({
                    ...prev,
                    isGuideUploading: false,
                    guideUploadProgress: 0,
                }));
            },
        );
    };

    // Image Editor Functions
    const openImageEditor = (imageUrl, type, index = null) => {
        setEditingImage(imageUrl);
        setEditingImageType(type);
        setEditingImageIndex(index);
        setIsImageEditorOpen(true);
    };

    const handleImageEditorCancel = () => {
        setIsImageEditorOpen(false);
        setEditingImage(null);
        setEditingImageType(null);
        setEditingImageIndex(null);
    };

    const handleImageEditorSave = async (editedFile) => {
        try {
            setIsSavingEditedImage(true);
            setIsImageEditorOpen(false);

            const filePath = `retreat_images/${uuidv4()}_${editedFile.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, editedFile);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${Math.round(progress)}%`);
                },
                (error) => {
                    console.error("Upload failed:", error);
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

                    // Update based on type
                    if (editingImageType === 'card') {
                        handleFieldChange("pilgrimRetreatCard", "image", downloadURL);
                        handleFieldChange("pilgrimRetreatCard", "thumbnailType", editedFile.type);
                    } else if (editingImageType === 'meetGuide') {
                        handleFieldChange("meetGuide", "image", downloadURL);
                    } else if (editingImageType === 'oneTime' && editingImageIndex !== null) {
                        setFormData((prev) => {
                            const updatedImages = [...prev.oneTimePurchase.images];
                            updatedImages[editingImageIndex] = downloadURL;
                            return {
                                ...prev,
                                oneTimePurchase: {
                                    ...prev.oneTimePurchase,
                                    images: updatedImages,
                                },
                            };
                        });
                    } else if (editingImageType === 'feature' && editingImageIndex !== null) {
                        setFormData((prev) => {
                            const updatedFeatures = [...prev.features];
                            updatedFeatures[editingImageIndex] = {
                                ...updatedFeatures[editingImageIndex],
                                image: downloadURL,
                            };
                            return {
                                ...prev,
                                features: updatedFeatures,
                            };
                        });
                    }

                    setIsSavingEditedImage(false);
                    showSuccess("Image updated successfully");

                    // Reset editor state
                    setEditingImage(null);
                    setEditingImageType(null);
                    setEditingImageIndex(null);
                }
            );
        } catch (error) {
            console.error("Error saving edited image:", error);
            setIsSavingEditedImage(false);
            showError("Failed to save edited image");
        }
    };

    // List Functions
    const addItem = (form) => {
        const source = Array.isArray(form) ? form[0] : form;
        if (!source || typeof source !== "object") {
            setItems([]);
            return;
        }

        const loadedItems = Object.entries(source)
            .filter(([key, value]) => !Number.isNaN(Number(key)) && value)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([key, retreatData]) => {
                const title = retreatData?.pilgrimRetreatCard?.title || "Retreat";
                const image = retreatData?.pilgrimRetreatCard?.image || "";

                return {
                    id: Date.now() + Math.random(),
                    type: "retreat",
                    active: retreatData?.active !== false,
                    title,
                    image,
                    link: title.replace(/\s+/g, "-"),
                    data: retreatData,
                    arrayName: Number(key),
                };
            });

        setItems(loadedItems);
    };

    const addItem2 = (formData) => {
        const newItem = {
            id: Date.now() + Math.random(),
            type: "retreat",
            active: true,
            title: formData?.pilgrimRetreatCard?.title || "Retreat",
            image: formData?.pilgrimRetreatCard?.image || "",
            link: (formData?.pilgrimRetreatCard?.title || "").replace(/\s+/g, "-"),
            data: formData,
        };

        setItems((prevItems) => [...prevItems, newItem]);
    };

    const updateItem = (index) => {
        const updatedItems = [...items];
        const updatedItem = {
            ...items[index],
            title: formData?.pilgrimRetreatCard?.title || items[index].title || "",
            image: formData?.pilgrimRetreatCard?.image || items[index].image || "",
            link: (
                formData?.pilgrimRetreatCard?.title ||
                items[index].title ||
                ""
            ).replace(/\s+/g, "-"),
        };

        // Update local items array
        updatedItems[index] = updatedItem;
        setItems(updatedItems);

        updatedItem.data = formData;

        setEditingIndex(null);
    };

    const editItem = (index) => {
        const item = items[index];
        // If you ever stored an array in data, grab the first element; otherwise use the object.

        setFormData(item?.data || {}); // <- put the real form data back into the form
        setEditingIndex(index + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const deleteItem = async (index) => {
        const backendIndex = index + 1;

        // Create new array without the deleted item
        const updatedItems = items.filter((_, i) => i !== index);

        // Reindex locally so frontend matches backend
        const reindexedItems = updatedItems.map((item, idx) => ({
            ...item,
            arrayName: idx + 1, // or whatever field you use for backend index
        }));

        // Update state immediately
        setItems(reindexedItems);

        // Update backend
        await deleteRetreatItem(uid, backendIndex);

        // Update Redux state
        dispatch(setRetreatData(uid, backendIndex, reindexedItems));

    };

    const toggleItem = async (index) => {
        const previousItems = [...items];
        const currentItem = previousItems[index];
        if (!currentItem) return;

        const nextActive = currentItem.active === false;
        const updatedItem = {
            ...currentItem,
            active: nextActive,
            data: {
                ...(currentItem.data || {}),
                active: nextActive,
            },
        };

        const newItems = [...previousItems];
        newItems[index] = updatedItem;
        setItems(newItems);

        try {
            await saveOrUpdateRetreatData(uid, index + 1, updatedItem.data);
            showSuccess(
                `Retreat ${nextActive ? "set to visible" : "set to not visible"}`,
            );
        } catch (error) {
            setItems(previousItems);
            showError(`Failed to update visibility: ${error?.message || "Unknown error"}`);
        }
    };

    const moveItem = (from, to) => {
        const updated = [...items];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        setItems(updated);
    };

    const resetForm = () => {
        setFormData({
            pilgrimRetreatCard: {
                title: "",
                image: null,
                thumbnailType: null,
                location: "",
                price: "",
                gst: "",
                category: "",
                categories: [],
                description: "",
            },
            cardUploadProgress: 0,
            isCardUploading: false,
            imageUploadProgress: {},
            isImageUploading: {},
            videoUploadProgress: {},
            isVideoUploading: {},
            guideUploadProgress: 0,
            isGuideUploading: false,
            monthlySubscription: {
                price: "",
                discount: "",
                description: "",
            },
            oneTimePurchase: {
                price: "",
                images: [],
                videos: [],
                description: "",
            },
            session: {
                title: "",
                description1: "",
                description2: "",
                description3: "",
                dateOptions: [{ start: "", end: "" }],
                occupancies: [{ type: "", price: "" }],
                showOccupancyInRetreat: false,
            },
            features: [],
            location: "",
            programSchedule: [], // This will now be populated with objects that have title, description, and points array
            retreatDescription: [],
            faqs: [],
            meetGuide: {
                title: "",
                description: "",
                email: "",
                number: "",
                image: null,
            },
        });
    };

    const uid = "user-uid";

    useEffect(() => {
        const loadCards = async () => {
            try {
                const cards = await fetchRetreatData(uid);
                if (cards !== null) {
                    addItem(cards);
                }
            } catch (err) {
                console.error("Error fetching retreat cards:", err);
            }
        };

        loadCards();
    }, [uid, dispatch]);

    const handleSubmitRetreatCard = async () => {
        try {
            // Validate organizer email and phone number (compulsory for new retreats)
            if (editingIndex === null) {
                if (
                    !formData?.meetGuide?.email ||
                    formData?.meetGuide?.email.trim() === ""
                ) {
                    showError("Organizer email is required!");
                    return;
                }
                if (
                    !formData?.meetGuide?.number ||
                    formData?.meetGuide?.number.trim() === ""
                ) {
                    showError("Organizer phone number is required!");
                    return;
                }
            }

            // Save organizer data to root organizers collection (for both new and edit)
            // Helper function to clean undefined/null values from objects
            const cleanUndefined = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(cleanUndefined);
                } else if (obj !== null && typeof obj === "object") {
                    return Object.fromEntries(
                        Object.entries(obj)
                            .filter(([_, v]) => v !== undefined && v !== null && v !== "")
                            .map(([k, v]) => [k, cleanUndefined(v)]),
                    );
                }
                return obj;
            };

            const rawProgramData = {
                retreatTitle: formData?.pilgrimRetreatCard?.title || "",
                price: formData?.pilgrimRetreatCard?.price || "",
                category: formData?.pilgrimRetreatCard?.category || "",
                location: formData?.pilgrimRetreatCard?.location || "",
                duration: formData?.pilgrimRetreatCard?.duration || "",
                session: {
                    dateOptions: formData?.session?.dateOptions || [],
                    occupancies: formData?.session?.occupancies || [],
                },
                programSchedule: formData?.programSchedule || [],
            };

            // Remove undefined/null/empty fields to prevent Firestore error
            const programData = cleanUndefined(rawProgramData);

            const organizerData = {
                email: formData?.meetGuide?.email,
                number: formData?.meetGuide?.number,
                programData: programData,
            };

            await saveOrganizerData(organizerData);

            if (editingIndex !== null) {
                // Update the existing card
                await saveOrUpdateRetreatData(uid, editingIndex, formData);
                dispatch(setRetreatData(uid, editingIndex, items));
                updateItem(editingIndex - 1);
                showSuccess("Retreat updated successfully!");
                resetForm();
                setEditingIndex(null);
            } else {
                // Create a new card
                await saveOrUpdateRetreatData(uid, items.length + 1, formData);
                dispatch(setRetreatData(uid, items.length + 1, items));
                resetForm();
                addItem2(formData);
                showSuccess("Retreat saved successfully!");
            }
        } catch (error) {
            console.error(`Failed to save Retreat: ${error.message}`);
            showError(`Failed to save Retreat: ${error.message}`);
        }
    };

    return (
        <>
            {/* Pilgrim Retreat Card */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-0">
                    Pilgrim Retreat Card
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                {/* Image Upload */}
                <div className="mb-4">
                    <h3 className="block text-md font-semibold text-gray-700 mb-2">
                        Add Thumbnail
                    </h3>
                    <div
                        {...getCardImageRootProps()}
                        className={`border-2 border-dashed border-gray-300 h-52 w-full rounded-md flex items-center justify-center cursor-pointer text-center text-sm text-gray-500 relative ${formData.isCardUploading ? "pointer-events-none opacity-75" : ""}`}
                    >
                        <input
                            {...getCardImageInputProps()}
                            disabled={formData.isCardUploading}
                        />
                        {formData.isCardUploading ? (
                            <div className="text-center flex flex-col items-center">
                                <div className="relative w-16 h-16 mb-3">
                                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                    <div
                                        className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                        style={{
                                            background: `conic-gradient(from 0deg, #2F6288 ${formData.cardUploadProgress * 3.6}deg, transparent ${formData.cardUploadProgress * 3.6}deg)`,
                                        }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-[#2F6288]">
                                            {formData.cardUploadProgress}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-[#2F6288] font-medium">
                                    Uploading...
                                </p>
                                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${formData.cardUploadProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : formData?.pilgrimRetreatCard?.image ? (
                            <div className="relative h-full flex items-center">
                                {formData?.pilgrimRetreatCard?.thumbnailType &&
                                    formData?.pilgrimRetreatCard?.thumbnailType.startsWith(
                                        "video/",
                                    ) ? (
                                    // Video thumbnail
                                    <>
                                        <video
                                            src={formData?.pilgrimRetreatCard?.image}
                                            className="h-full object-contain rounded-md"
                                            controls
                                            muted
                                            loop
                                            playsInline
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange("pilgrimRetreatCard", "image", null);
                                                handleFieldChange("pilgrimRetreatCard", "thumbnailType", null);
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
                                            src={formData.pilgrimRetreatCard.image}
                                            alt="Uploaded"
                                            className="h-full object-contain rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openImageEditor(formData.pilgrimRetreatCard.image, 'card');
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
                                                handleFieldChange("pilgrimRetreatCard", "image", null);
                                                handleFieldChange("pilgrimRetreatCard", "thumbnailType", null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                            title="Remove Image"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 flex flex-col items-center">
                                <img
                                    src="/assets/admin/upload.svg"
                                    alt="Upload Icon"
                                    className="w-12 h-12 mb-2"
                                />
                                <p>
                                    {isCardDragActive
                                        ? "Drop here..."
                                        : "Click to upload or drag and drop"}
                                </p>
                                <p>Size: (1126×626)px</p>
                                <p className="text-xs mt-1">
                                    Supported: JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG, AVI, MOV
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Title
                </h3>
                <input
                    type="text"
                    placeholder="Enter Title"
                    value={formData?.pilgrimRetreatCard?.title}
                    onChange={(e) =>
                        handleFieldChange("pilgrimRetreatCard", "title", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                />

                {/* Category Selection - Updated to match LiveSessions.jsx */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Category
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                        {[
                            ...(formData &&
                                formData.pilgrimRetreatCard &&
                                Array.isArray(formData.pilgrimRetreatCard.categories)
                                ? formData.pilgrimRetreatCard.categories
                                : []),
                            "Cultural and Heritage immersion",
                            "Spiritual and wellness immersion",
                        ]
                            .filter((cat, index, arr) => arr.indexOf(cat) === index) // remove duplicates
                            .map((cat, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleCategorySelect(cat)}
                                    className={`px-4 py-2 rounded-full border transition-colors
                                        ${formData?.pilgrimRetreatCard
                                            ?.category === cat
                                            ? "bg-[#2F6288] text-white border-[#2F6288]"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        <button
                            type="button"
                            onClick={addNewCategory}
                            className="px-4 py-2 rounded-full border border-gray-300 text-[#2F6288]
                            hover:bg-[#2F6288] hover:text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Category
                        </button>
                    </div>
                </div>

                {/* Location */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Location
                </h3>
                <input
                    type="text"
                    placeholder="Enter Location"
                    value={formData?.pilgrimRetreatCard?.location}
                    onChange={(e) =>
                        handleFieldChange("pilgrimRetreatCard", "location", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                />

                {/* Price */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Price
                </h3>
                <input
                    type="number"
                    placeholder="Enter Price"
                    value={formData?.pilgrimRetreatCard?.price}
                    onChange={(e) =>
                        handleFieldChange("pilgrimRetreatCard", "price", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                />

                {/* GST */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    GST (%)
                </h3>
                <input
                    type="number"
                    placeholder="Enter GST percentage (e.g., 18)"
                    value={formData?.pilgrimRetreatCard?.gst}
                    onChange={(e) =>
                        handleFieldChange("pilgrimRetreatCard", "gst", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                    min="0"
                    max="100"
                    step="0.01"
                />

                {/* Description */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Description
                </h3>
                <RichTextEditor
                    value={formData?.pilgrimRetreatCard?.description}
                    onChange={(value) =>
                        handleFieldChange("pilgrimRetreatCard", "description", value)
                    }
                    placeholder="Enter Description"
                    rows={3}
                />
                <div className="mb-3" />

                {/* Duration */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Duration
                </h3>
                <input
                    type="text"
                    placeholder="Enter Duration"
                    value={formData?.pilgrimRetreatCard?.duration}
                    onChange={(e) =>
                        handleFieldChange("pilgrimRetreatCard", "duration", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                />

                {/* Listing Type */}
                <div className="">
                    <h3 className="block text-md font-semibold text-gray-700 mb-2">
                        Listing Type
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose one from the below
                    </p>
                    <div className="flex gap-4">
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="listing"
                                name="listingType"
                                value="Listing"
                                checked={
                                    formData?.pilgrimRetreatCard?.listingType === "Listing"
                                }
                                onChange={(e) =>
                                    handleFieldChange(
                                        "pilgrimRetreatCard",
                                        "listingType",
                                        e.target.value,
                                    )
                                }
                                className="mr-2 text-[#2F6288] focus:ring-[#2F6288]"
                            />
                            <label
                                htmlFor="listing"
                                className="text-sm font-medium text-gray-700"
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
                                checked={formData?.pilgrimRetreatCard?.listingType === "Own"}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "pilgrimRetreatCard",
                                        "listingType",
                                        e.target.value,
                                    )
                                }
                                className="mr-2 text-[#2F6288] focus:ring-[#2F6288]"
                            />
                            <label
                                htmlFor="own"
                                className="text-sm font-medium text-gray-700"
                            >
                                Own
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Session */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Session <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                {/* Title */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Title
                </h3>
                <input
                    type="text"
                    placeholder="Enter Title"
                    value={formData?.session?.title}
                    onChange={(e) =>
                        handleFieldChange("session", "title", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-3"
                />

                {/* Session Description 1 */}
                <label className="block text-md font-semibold text-gray-700 mb-2">
                    Session Description 1
                </label>
                <RichTextEditor
                    value={formData?.session?.description1}
                    onChange={(value) =>
                        handleFieldChange("session", "description1", value)
                    }
                    placeholder="Enter Description"
                    rows={4}
                />
                <div className="mb-4" />

                {/* Session Description 2 */}
                <label className="block text-md font-semibold text-gray-700 mb-2">
                    Session Description 2
                </label>
                <RichTextEditor
                    value={formData?.session?.description2}
                    onChange={(value) =>
                        handleFieldChange("session", "description2", value)
                    }
                    placeholder="Enter Description"
                    rows={4}
                />
                <div className="mb-4" />

                {/* Session Description 3 */}
                <label className="block text-md font-semibold text-gray-700 mb-2">
                    Session Description 3
                </label>
                <RichTextEditor
                    value={formData?.session?.description3}
                    onChange={(value) =>
                        handleFieldChange("session", "description3", value)
                    }
                    placeholder="Enter Description"
                    rows={4}
                />
                <div className="mb-4" />

                {/* Date Option */}
                <label className="block text-md font-semibold text-gray-700 mb-2">
                    Date Option
                </label>
                {formData?.session?.dateOptions.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                        <input
                            type="date"
                            value={option?.start}
                            onChange={(e) => updateDateOption(index, "start", e.target.value)}
                            className="text-sm w-full border p-3 rounded-lg"
                        />
                        <input
                            type="date"
                            value={option?.end}
                            onChange={(e) => updateDateOption(index, "end", e.target.value)}
                            className="text-sm w-full border p-3 rounded-lg"
                        />
                        {index === formData?.session?.dateOptions.length - 1 ? (
                            <button
                                onClick={addDateOption}
                                type="button"
                                className="border border-dashed px-2 py-1 rounded text-xl"
                            >
                                +
                            </button>
                        ) : (
                            <button
                                onClick={() => removeDateOption(index)}
                                type="button"
                                className="border border-dashed px-2 py-1 rounded text-xl"
                            >
                                -
                            </button>
                        )}
                    </div>
                ))}

                {/* occupency */}
                <label className="block text-md font-semibold text-gray-700 mb-2 mt-4">
                    Occupancy & Price
                </label>
                {formData?.session?.occupancies.map((occ, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                        <input
                            type="text"
                            value={occ.type || ""}
                            placeholder="Enter Occupancy Type"
                            onChange={(e) => updateOccupancy(index, "type", e.target.value)}
                            className="text-sm w-full border p-3 rounded-lg"
                        />
                        <input
                            type="number"
                            value={occ.price || ""}
                            placeholder="Price"
                            onChange={(e) => updateOccupancy(index, "price", e.target.value)}
                            className="text-sm w-full border p-3 rounded-lg"
                        />
                        {index === formData?.session?.occupancies.length - 1 ? (
                            <button
                                onClick={addOccupancy}
                                type="button"
                                className="border border-dashed px-2 py-1 rounded text-xl"
                            >
                                +
                            </button>
                        ) : (
                            <button
                                onClick={() => removeOccupancy(index)}
                                type="button"
                                className="border border-dashed px-2 py-1 rounded text-xl"
                            >
                                -
                            </button>
                        )}
                    </div>
                ))}

                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="showOccupancy"
                        checked={formData?.session?.showOccupancyInRetreat}
                        onChange={() =>
                            handleFieldChange(
                                "session",
                                "showOccupancyInRetreat",
                                !formData?.session?.showOccupancyInRetreat,
                            )
                        }
                        className="w-4 h-4"
                    />
                    <label htmlFor="showOccupancy" className="text-sm text-gray-600">
                        *Tick it to Show Occupancy in Pilgrim Retreat
                    </label>
                </div>
            </div>

            {/* One-Time Purchase */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    One-Time Purchase{" "}
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                {/* Price */}
                <h3 className="block text-md font-semibold text-gray-700 mb-2">
                    Price
                </h3>
                <input
                    type="number"
                    placeholder="Enter Price"
                    value={formData?.oneTimePurchase?.price}
                    onChange={(e) =>
                        handleFieldChange("oneTimePurchase", "price", e.target.value)
                    }
                    className="text-sm w-full border p-3 rounded-lg mb-4"
                />

                {/* Description */}
                <label className="block text-md font-semibold text-gray-700 mb-2">
                    Description
                </label>
                <RichTextEditor
                    value={formData?.oneTimePurchase?.description}
                    onChange={(value) =>
                        handleFieldChange("oneTimePurchase", "description", value)
                    }
                    placeholder="Enter Description"
                    rows={4}
                />
                <div className="mb-6" />

                {/* Images */}
                <label className="block font-semibold mb-2">Images (Max 5)</label>
                <div className="mb-4">
                    {(!formData?.oneTimePurchase?.images || formData?.oneTimePurchase?.images?.length < 5) && (
                        <label className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                            <img
                                src="/assets/admin/upload.svg"
                                alt="Upload Icon"
                                className="w-10 h-10 mb-2"
                            />
                            <span>Click to upload image(s)</span>
                            <p>Size: (1126×626)px</p>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={Object.keys(formData?.isImageUploading || {}).some(
                                    (key) => (formData?.isImageUploading || {})[key],
                                )}
                            />
                        </label>
                    )}

                    {/* Upload progress for images */}
                    <div className="flex flex-wrap gap-4 mt-4">
                        {Object.keys(formData?.isImageUploading || {})
                            .filter((key) => (formData?.isImageUploading || {})[key])
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
                                                    background: `conic-gradient(from 0deg, #2F6288 ${((formData?.imageUploadProgress || {})[uploadId] || 0) * 3.6}deg, transparent ${((formData?.imageUploadProgress || {})[uploadId] || 0) * 3.6}deg)`,
                                                }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-[#2F6288]">
                                                    {(formData?.imageUploadProgress || {})[uploadId] || 0}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#2F6288] font-medium">
                                            Uploading...
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Render uploaded images */}
                    {formData?.oneTimePurchase?.images?.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4">
                            {formData.oneTimePurchase.images.map((img, idx) => (
                                <div key={idx} className="relative w-40 h-28">
                                    <img
                                        src={img}
                                        alt={`otp-img-${idx}`}
                                        className="w-full h-full object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openImageEditor(img, 'oneTime', idx)}
                                        className="absolute top-1 left-1 bg-blue-500 text-white border border-blue-600 rounded-md px-2 py-1 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-1"
                                        title="Edit Image - Resize, Crop, Rotate"
                                    >
                                        <Edit2 size={12} />
                                        <span className="text-xs font-semibold">Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                                        title="Remove"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Videos */}
                <label className="block font-semibold mb-2 mt-6">Videos (Max 6)</label>
                <div className="mb-4">
                    {(!formData?.oneTimePurchase?.videos || formData?.oneTimePurchase?.videos?.length < 6) && (
                        <label className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                            <img
                                src="/assets/admin/upload.svg"
                                alt="Upload Icon"
                                className="w-10 h-10 mb-2"
                            />
                            <span>Click to upload video(s)</span>
                            <input
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={handleVideoUpload}
                                className="hidden"
                                disabled={Object.keys(formData?.isVideoUploading || {}).some(
                                    (key) => (formData?.isVideoUploading || {})[key],
                                )}
                            />
                        </label>
                    )}

                    {/* Upload progress for videos */}
                    <div className="flex flex-wrap gap-4 mt-4">
                        {Object.keys(formData?.isVideoUploading || {})
                            .filter((key) => (formData?.isVideoUploading || {})[key])
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
                                                    background: `conic-gradient(from 0deg, #2F6288 ${((formData?.videoUploadProgress || {})[uploadId] || 0) * 3.6}deg, transparent ${((formData?.videoUploadProgress || {})[uploadId] || 0) * 3.6}deg)`,
                                                }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-[#2F6288]">
                                                    {(formData?.videoUploadProgress || {})[uploadId] || 0}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#2F6288] font-medium">
                                            Uploading...
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Render uploaded videos */}
                    {formData?.oneTimePurchase?.videos?.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4">
                            {formData.oneTimePurchase.videos.map((vid, idx) => (
                                <div key={idx} className="relative w-56 h-32">
                                    <video
                                        src={vid}
                                        className="w-full h-full object-cover rounded"
                                        controls
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeVideo(idx)}
                                        className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                                        title="Remove"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* features */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Features<span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                <div className="space-y-6">
                    {formData?.features &&
                        formData?.features.map((feature, index) => (
                            <div
                                key={index}
                                className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative"
                            >
                                <button
                                    onClick={() => removeFeature(index)}
                                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                                    title="Delete Feature"
                                >
                                    <FaTrash className="w-4 h-4" />
                                </button>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Feature Icon
                                    </label>
                                    {feature.image ? (
                                        <div className="relative inline-block mb-4">
                                            <img
                                                src={feature?.image}
                                                alt="Preview"
                                                className="w-32 h-32 object-contain rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => openImageEditor(feature.image, 'feature', index)}
                                                className="absolute top-1 left-1 bg-blue-500 text-white border border-blue-600 rounded-md px-2 py-1 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-1"
                                                title="Edit Image - Resize, Crop, Rotate"
                                            >
                                                <Edit2 size={12} />
                                                <span className="text-xs font-semibold">Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleFeatureChange(index, "image", null)
                                                }
                                                className="absolute top-1 right-1 bg-white border border-gray-300
                                            rounded-full p-1 hover:bg-gray-200"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mb-4">
                                            <label
                                                htmlFor={`feature-upload-${index}`}
                                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex
                                            flex-col items-center justify-center text-gray-500 cursor-pointer
                                            hover:bg-gray-50"
                                            >
                                                <img
                                                    src="/assets/admin/upload.svg"
                                                    alt="Upload Icon"
                                                    className="w-12 h-12 mb-2"
                                                />
                                                <span>Click to upload feature icon</span>
                                                <input
                                                    id={`feature-upload-${index}`}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        handleFeatureImageChange(index, e.target.files[0])
                                                    }
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={feature?.title}
                                        placeholder="Enter title"
                                        onChange={(e) =>
                                            handleFeatureChange(index, "title", e.target.value)
                                        }
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <RichTextEditor
                                        value={feature?.shortdescription}
                                        onChange={(value) =>
                                            handleFeatureChange(index, "shortdescription", value)
                                        }
                                        placeholder="Enter short description"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        ))}

                    <button
                        onClick={addFeature}
                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg
                        transition-colors flex items-center justify-center gap-2"
                    >
                        <FaPlus className="w-5 h-5" />
                        Add Feature
                    </button>
                </div>
            </div>

            {/* Location */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Location <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>
                <input
                    type="text"
                    value={formData?.location}
                    placeholder="Enter location"
                    onChange={(e) =>
                        setFormData((prev) => ({
                            ...prev,
                            location: e.target.value,
                        }))
                    }
                    className="w-full border rounded p-2 mb-4"
                />
            </div>

            {/* Program Schedule */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Program Schedule
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                <div className="space-y-6">
                    {formData?.programSchedule &&
                        formData?.programSchedule.map((program, programIndex) => (
                            <div
                                key={programIndex}
                                className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative"
                            >
                                <button
                                    onClick={() => removeProgram(programIndex)}
                                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                                    title="Delete Program"
                                >
                                    <FaTrash className="w-4 h-4" />
                                </button>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Day {programIndex + 1} Title
                                    </label>
                                    <input
                                        type="text"
                                        value={program?.title}
                                        placeholder="Enter title"
                                        onChange={(e) =>
                                            handleProgramChange(programIndex, "title", e.target.value)
                                        }
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description Points
                                    </label>

                                    {program?.points &&
                                        program?.points.map((point, pointIndex) => (
                                            <div key={pointIndex} className="mb-4 relative">
                                                {/* Points */}
                                                <div className="mb-3">
                                                    <label className="block text-sm text-gray-700 mb-2">
                                                        Point {pointIndex + 1} Title
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={point?.title}
                                                            placeholder={`Point ${pointIndex + 1}`}
                                                            onChange={(e) =>
                                                                handleProgramPointChange(
                                                                    programIndex,
                                                                    pointIndex,
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full border border-gray-300 p-3 rounded-lg"
                                                        />

                                                        {program?.points.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeProgramPoint(programIndex, pointIndex)
                                                                }
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <FaTrash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Sub Points Section */}
                                                <div>
                                                    <div className="flex flex-col items-start justify-between">
                                                        <label className="block text-sm text-gray-700 mb-2">
                                                            Sub Points (Optional)
                                                        </label>
                                                    </div>

                                                    {point?.subpoints && point?.subpoints.length > 0 && (
                                                        <div className="space-y-3 mb-3">
                                                            {point.subpoints.map((subpoint, subIndex) => (
                                                                <div
                                                                    key={subIndex}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        value={subpoint}
                                                                        placeholder={`Sub Point ${subIndex + 1}`}
                                                                        onChange={(e) =>
                                                                            handleProgramSubPointChange(
                                                                                programIndex,
                                                                                pointIndex,
                                                                                subIndex,
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeProgramSubPoint(
                                                                                programIndex,
                                                                                pointIndex,
                                                                                subIndex,
                                                                            )
                                                                        }
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <FaTimes className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            addProgramSubPoint(programIndex, pointIndex)
                                                        }
                                                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <FaPlus className="w-3 h-3" /> Add Sub Point
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    <button
                                        type="button"
                                        onClick={() => addProgramPoint(programIndex)}
                                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg
                                    transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaPlus className="w-3 h-3" /> Add Point
                                    </button>
                                </div>
                            </div>
                        ))}

                    <button
                        onClick={addProgram}
                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors
                        flex items-center justify-center gap-2"
                    >
                        <FaPlus className="w-5 h-5" />
                        Add Program Day
                    </button>
                </div>
            </div>

            {/* Retreat Description */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Retreat Description
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                <div className="space-y-6">
                    {formData?.retreatDescription &&
                        formData?.retreatDescription.map((point, index) => (
                            <div
                                key={index}
                                className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative"
                            >
                                <button
                                    onClick={() => removeDescriptionPoint(index)}
                                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                                    title="Delete Description Point"
                                >
                                    <FaTrash className="w-4 h-4" />
                                </button>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Point {index + 1} Title
                                    </label>
                                    <input
                                        type="text"
                                        value={point?.title}
                                        placeholder="Enter title"
                                        onChange={(e) =>
                                            handlePointTitleChange(index, e.target.value)
                                        }
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Sub Points
                                    </label>
                                    {point?.subpoints.map((subpoint, subIndex) => (
                                        <div
                                            key={subIndex}
                                            className="flex items-center gap-2 mb-3"
                                        >
                                            <input
                                                type="text"
                                                value={subpoint}
                                                placeholder={`Sub Point ${subIndex + 1}`}
                                                onChange={(e) =>
                                                    handleSubPointChange(index, subIndex, e.target.value)
                                                }
                                                className="w-full border border-gray-300 p-3 rounded-lg"
                                            />
                                            {point.subpoints.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSubPoint(index, subIndex)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <FaTimes className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addSubPoint(index)}
                                        className="mt-3 flex items-center gap-1 text-sm text-[#2F6288] font-semibold hover:underline"
                                    >
                                        <FaPlus className="w-3 h-3" /> Add Sub Point
                                    </button>
                                </div>
                            </div>
                        ))}

                    <button
                        onClick={addDescriptionPoint}
                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors
                        flex items-center justify-center gap-2"
                    >
                        <FaPlus className="w-5 h-5" />
                        Add Description Point
                    </button>
                </div>
            </div>

            {/* FAQs */}
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="text-2xl font-bold text-[#2F6288] mb-6">
                    {editingIndex !== null ? "Edit FAQS" : "FAQS"}
                </h2>
                <div className="relative space-y-4">
                    {formData?.faqs &&
                        formData?.faqs.map((faq, i) => (
                            <div key={i} className="space-y-4">
                                <div className="absolute right-0 justify-between items-center">
                                    {formData?.faqs.length > 1 && (
                                        <button
                                            onClick={() => removeFaq(i)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <FaTrash className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        FAQ Title
                                    </label>
                                    <input
                                        placeholder="Enter FAQ Title"
                                        value={faq?.title}
                                        onChange={(e) =>
                                            handleFaqChange(i, "title", e.target.value)
                                        }
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <RichTextEditor
                                        value={faq?.description}
                                        onChange={(value) =>
                                            handleFaqChange(i, "description", value)
                                        }
                                        placeholder="Enter FAQ Description"
                                        rows={4}
                                    />
                                </div>
                            </div>
                        ))}

                    <button
                        onClick={addFaq}
                        className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors
                        flex items-center justify-center gap-2"
                    >
                        <FaPlus className="w-5 h-5" />
                        Add New FAQ
                    </button>
                </div>
            </div>

            {/* Meet Guide */}
            <div className="md:p-8 p-4 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                    Meet Your Pilgrim Guide
                    <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                <div className="mb-6 pt-4 relative">
                    <label className="block font-semibold mb-1">Add Icon</label>
                    {formData?.meetGuide?.image ? (
                        <div className="relative inline-block mb-4">
                            <img
                                src={formData?.meetGuide?.image}
                                alt="Preview"
                                className="w-64 h-auto object-contain rounded shadow"
                            />
                            <button
                                type="button"
                                onClick={() => openImageEditor(formData.meetGuide.image, 'meetGuide')}
                                className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                                title="Edit Image - Resize, Crop, Rotate"
                            >
                                <Edit2 size={16} />
                                <span className="text-xs font-semibold">Edit Size</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFieldChange("meetGuide", "image", null)}
                                className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full
                                p-2 hover:bg-gray-200"
                                title="Remove Image"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : formData.isGuideUploading ? (
                        <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
                            <div className="text-center flex flex-col items-center">
                                <div className="relative w-12 h-12 mb-3">
                                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                    <div
                                        className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                        style={{
                                            background: `conic-gradient(from 0deg, #2F6288 ${formData.guideUploadProgress * 3.6}deg, transparent ${formData.guideUploadProgress * 3.6}deg)`,
                                        }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-[#2F6288]">
                                            {formData.guideUploadProgress}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-[#2F6288] font-medium">
                                    Uploading Guide Image...
                                </p>
                                <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${formData.guideUploadProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label
                                htmlFor="guide-upload"
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                            >
                                <img
                                    src="/assets/admin/upload.svg"
                                    alt="Upload Icon"
                                    className="w-12 h-12 mb-2"
                                />
                                <span>Click to upload</span>
                                <input
                                    id="guide-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleGuideImageChange(e.target.files[0])}
                                    className="hidden"
                                    disabled={formData.isGuideUploading}
                                />
                                <span>Click to upload image</span>
                                <span className="text-sm text-gray-400">
                                    Size: (400×540)px
                                </span>
                            </label>
                        </div>
                    )}

                    <label className="block font-semibold mb-1">Title</label>
                    <input
                        type="text"
                        value={formData?.meetGuide?.title}
                        placeholder="Enter title"
                        onChange={(e) =>
                            handleFieldChange("meetGuide", "title", e.target.value)
                        }
                        className="w-full border rounded p-2 mb-4"
                    />

                    <label className="block font-semibold mb-1">Description</label>
                    <RichTextEditor
                        value={formData?.meetGuide?.description}
                        onChange={(value) =>
                            handleFieldChange("meetGuide", "description", value)
                        }
                        placeholder="Enter description"
                        rows={4}
                    />
                    <div className="mb-4" />

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organizer Email <span className="text-red-500">*</span>
                        {editingIndex !== null && (
                            <span className="text-xs text-gray-500 ml-2">
                                (Cannot be changed during edit)
                            </span>
                        )}
                    </label>
                    <input
                        type="email"
                        value={formData?.meetGuide?.email}
                        placeholder="Enter email address (Required)"
                        onChange={(e) =>
                            handleFieldChange("meetGuide", "email", e.target.value)
                        }
                        className={`w-full border rounded p-2 mb-4 ${editingIndex !== null ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        disabled={editingIndex !== null}
                        required
                    />

                    <label className="block font-semibold mb-1">
                        Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        value={formData?.meetGuide?.number}
                        placeholder="Enter phone number (Required)"
                        onChange={(e) =>
                            handleFieldChange("meetGuide", "number", e.target.value)
                        }
                        className="w-full border rounded p-2 mb-4"
                        required
                    />
                </div>
            </div>

            {/* Submit Button */}
            <div className="px-8 text-left">
                <button
                    onClick={handleSubmitRetreatCard}
                    className="p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white px-8 py-3
                    rounded-md text-lg font-semibold hover:bg-[#224b66] transition-colors"
                >
                    {editingIndex !== null ? "Update Retreat Card" : "Add Retreat Card"}
                </button>
            </div>

            {/* Current Retreats */}
            <div className="p-8">
                <h3 className="text-lg font-bold mt-6 mb-3">Current Retreat Items</h3>
                <DndProvider backend={HTML5Backend}>
                    {items &&
                        items.map((item, index) => (
                            <SlideItem
                                key={index}
                                index={index}
                                slide={item}
                                moveSlide={moveItem}
                                onEdit={(i) => editItem(i)}
                                onDelete={deleteItem}
                                onToggle={toggleItem}
                            />
                        ))}
                </DndProvider>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-800">Saving Image...</p>
                            <p className="text-sm text-gray-600 mt-2">Please wait while we upload your changes</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
