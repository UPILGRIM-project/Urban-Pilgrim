import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";
import { fetchSectionFour, saveSectionFour } from "../../../services/home_service/sectionFourServices";
import { setLoading, setSectionFour } from "../../../features/home_slices/sectionFourSlice";
import { useDispatch } from "react-redux";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../../services/firebase";
import { v4 as uuidv4 } from "uuid";
import { showSuccess } from "../../../utils/toast";

function SectionFour() {
    const [image, setImage] = useState(null);
    const [features, setFeatures] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState({});
    const [mainImageProgress, setMainImageProgress] = useState(0);
    const [isMainImageUploading, setIsMainImageUploading] = useState(false);

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionFour(uid);
            dispatch(setSectionFour(data?.sectionFour));
            setFeatures(data?.sectionFour?.features || []);
            setImage(data?.sectionFour?.image || null);
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const handleAddFeature = () => {
        setFeatures((prev) => [...prev, { title: "", shorttitle: "", image: null }]);
    };

    const handleFeatureTitleChange = (index, value) => {
        const updated = [...features];
        updated[index].title = value;
        setFeatures(updated);
    };

    const handleFeatureShortTitleChange = (index, value) => {
        const updated = [...features];
        updated[index].shorttitle = value;
        setFeatures(updated);
    };

    // Remove feature image (from state + storage)
    const handleFeatureImageRemove = async (index) => {
        try {
            const updated = [...features];
            const imageUrl = updated[index].image;

            if (imageUrl) {
                // Create reference from URL
                const storageRef = ref(storage, imageUrl);

                // Delete from Firebase Storage
                await deleteObject(storageRef);
            }

            // Remove from local state
            updated[index].image = null;
            setFeatures(updated);
        } catch (error) {
            console.error("Error removing feature image:", error);
        }
    };

    // Upload new image for a feature
    const handleFeatureImageChange = async (index, file) => {
        if (!file) return;

        try {
            // Set uploading state for this specific feature
            setIsUploading(prev => ({ ...prev, [index]: true }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
            
            // Create a unique storage path for each feature image
            const storageRef = ref(storage, `slides/sesctionFour/${uuidv4()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Track upload progress for this specific feature
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [index]: Math.round(progress) }));
                },
                (error) => {
                    console.error("Error uploading feature image:", error);
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Update local state with download URL
                    const updated = [...features];
                    updated[index].image = downloadURL;
                    setFeatures(updated);
                    
                    // Reset upload states
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                }
            );
        } catch (error) {
            console.error("Error uploading feature image:", error);
            setIsUploading(prev => ({ ...prev, [index]: false }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
        }
    };

    const handleDiscard = async () => {
        setImage(null);
        setFeatures([]);
        dispatch(setSectionFour({ image: null, features: [] }));
        await saveSectionFour(uid, { image: null, features: [] });
    };

    const handleSave = async () => {
        dispatch(setSectionFour({ image, features })); // update store
        await saveSectionFour(uid, { image, features }); // update Firestore
        showSuccess("Section data saved successfully", { image, features });
    };

    const handleDeleteFeature = async (index) => {
        const updated = [...features];
        updated.splice(index, 1);
        dispatch(setSectionFour({ image, features: updated })); // update store
        await saveSectionFour(uid, { image, features: updated }); // update Firestore
        setFeatures(updated);
    };

    const onDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            setIsMainImageUploading(true);
            setMainImageProgress(0);
            
            // Create a unique path for the file
            const storageRef = ref(storage, `slides/sesctionFour/features/${uuidv4()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Track upload progress for main image
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setMainImageProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Error uploading file:", error);
                    setIsMainImageUploading(false);
                    setMainImageProgress(0);
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Store only the URL in state (not base64)
                    setImage(downloadURL);
                    setIsMainImageUploading(false);
                    setMainImageProgress(0);
                }
            );
        } catch (error) {
            console.error("Error uploading file:", error);
            setIsMainImageUploading(false);
            setMainImageProgress(0);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleRemoveImage = () => setImage(null);

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Section 2</h3>
            <label className="block font-semibold mb-1">Image</label>

            {isMainImageUploading ? (
                <div className="mb-4">
                    <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center">
                        <div className="w-16 h-16 mb-4 relative">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-[#2F6288] rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-semibold text-[#2F6288]">{mainImageProgress}%</span>
                            </div>
                        </div>
                        <p className="text-sm text-[#2F6288] font-medium">Uploading...</p>
                        <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                                className="bg-[#2F6288] h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${mainImageProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ) : image ? (
                <div className="relative inline-block mb-4">
                    <img src={image} alt="Preview" className="w-64 h-auto object-cover rounded shadow" />
                    <button
                        onClick={handleRemoveImage}
                        className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 cursor-pointer mb-4 hover:bg-gray-50 flex-col"
                >
                    <input {...getInputProps()} disabled={isMainImageUploading} />
                    <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                    {isDragActive ? "Drop the image here..." : "Click to upload or drag and drop"}
                </div>
            )}

            {features.map((feature, index) => (
                <div key={index} className="mb-6 pt-4 relative">
                    <button
                        onClick={() => handleDeleteFeature(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
                    >
                        Delete
                    </button>

                    <label className="block font-semibold mb-1">Title {index + 1}</label>
                    <input
                        type="text"
                        value={feature.title}
                        placeholder="Enter feature title"
                        onChange={(e) => handleFeatureTitleChange(index, e.target.value)}
                        className="w-full border rounded p-2 mb-4"
                    />

                    <label className="block font-semibold mb-1">Short Text {index + 1}</label>

                    <input
                        type="text"
                        value={feature.shorttitle}
                        placeholder="Enter feature short title"
                        onChange={(e) => handleFeatureShortTitleChange(index, e.target.value)}
                        className="w-full border rounded p-2 mb-4"
                    />

                    <label className="block font-semibold mb-1">Add Icon {index + 1}</label>
                    {isUploading[index] ? (
                        <div className="mb-4">
                            <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center">
                                <div className="w-16 h-16 mb-4 relative">
                                    <div className="w-16 h-16 border-4 border-gray-200 border-t-[#2F6288] rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-[#2F6288]">{uploadProgress[index] || 0}%</span>
                                    </div>
                                </div>
                                <p className="text-sm text-[#2F6288] font-medium">Uploading...</p>
                                <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                                    <div 
                                        className="bg-[#2F6288] h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${uploadProgress[index] || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ) : feature.image ? (
                        <div className="relative inline-block mb-4">
                            <img
                                src={feature.image}
                                alt="Preview"
                                className="w-64 h-auto object-contain rounded shadow"
                            />
                            <button
                                onClick={() => handleFeatureImageRemove(index)}
                                className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label
                                htmlFor={`feature-upload-${index}`}
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                            >
                                <img
                                    src="/assets/admin/upload.svg"
                                    alt="Upload Icon"
                                    className="w-12 h-12 mb-2"
                                />
                                <span>Click to upload</span>
                                <span>Size: 40 * 40 px</span>
                                <input
                                    id={`feature-upload-${index}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFeatureImageChange(index, e.target.files[0])}
                                    className="hidden"
                                    disabled={isUploading[index]}
                                />
                            </label>
                        </div>
                    )}
                </div>
            ))}

            <div
                onClick={handleAddFeature}
                className="w-full text-center my-4 bg-[#2F6288] text-white py-2 rounded-md cursor-pointer hover:bg-[#224b66]"
            >
                Add Feature
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={handleDiscard}
                    className="px-4 py-2 font-semibold border border-gray-800 rounded-md"
                >
                    Discard Changes
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-gradient-to-b  from-[#C5703F] to-[#C16A00] text-white rounded-md hover:from-[#C16A00] hover:to-[#C5703F]"
                >
                    Save Changes
                </button>
            </div>
        </>
    )
}

export default SectionFour