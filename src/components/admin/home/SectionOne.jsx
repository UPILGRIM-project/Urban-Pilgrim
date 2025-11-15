import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setSectionOne, setLoading } from "../../../features/home_slices/sectionOneSlice";
import { fetchSectionOne, saveSectionOne } from "../../../services/home_service/sectionOneService";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../../../services/firebase";
import { v4 as uuidv4 } from "uuid";
import { showSuccess } from "../../../utils/toast";

function SectionOne() {
    const dispatch = useDispatch();
    const { title, description, image } = useSelector((state) => state.sectionOne);
    const uid = "your-unique-id";

    const [localTitle, setLocalTitle] = useState(title);
    const [localDescription, setLocalDescription] = useState(description);
    const [localImage, setLocalImage] = useState(image);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionOne(uid);
            dispatch(setSectionOne(data.sectionOne));
            setLocalTitle(data.sectionOne.title);
            setLocalDescription(data.sectionOne.description);
            setLocalImage(data.sectionOne.image);
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const onDrop = async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        try {
            setIsUploading(true);
            setUploadProgress(0);
            
            // create a unique path in storage
            const storageRef = ref(storage, `slides/sesctionOne/${uuidv4()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Track upload progress
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Error uploading image:", error);
                    setIsUploading(false);
                    setUploadProgress(0);
                },
                async () => {
                    // Upload completed successfully
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setLocalImage(url);
                    setIsUploading(false);
                    setUploadProgress(0);
                }
            );
        } catch (error) {
            console.error("Error uploading image:", error);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleDiscard = () => {
        setLocalTitle(title);
        setLocalDescription(description);
        setLocalImage(image);
    };

    const handleRemoveImage = async () => {
        try {
            if (image) {
                const storageRef = ref(storage, image);
                await deleteObject(storageRef);

                setLocalTitle(title);
                setLocalDescription(description);
                setLocalImage(null); 

                const newData = {
                    title: localTitle,
                    description: localDescription,
                    image: localImage
                };
                dispatch(setSectionOne(newData)); 
            } else {
                console.log("No image to delete");
            }
            
            
        } catch (error) {
            console.error("Error discarding image:", error);
        }
    };

    const handleSave = async () => {
        const newData = {
            title: localTitle,
            description: localDescription,
            image: localImage
        };
        dispatch(setSectionOne(newData)); // update store
        await saveSectionOne(uid, newData); // update Firestore
        showSuccess("Data saved successfully");
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Section 1</h3>
            <label className="block font-semibold mb-1">Image</label>

            {/* Image Upload */}
            <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 h-40 rounded mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative"
            >
                <input {...getInputProps()} disabled={isUploading} />
                {isUploading ? (
                    <div className="text-center flex flex-col items-center">
                        <div className="w-16 h-16 mb-4 relative">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-[#2F6288] rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-semibold text-[#2F6288]">{uploadProgress}%</span>
                            </div>
                        </div>
                        <p className="text-sm text-[#2F6288] font-medium">Uploading...</p>
                        <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                                className="bg-[#2F6288] h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                ) : localImage ? (
                    <div className="relative h-full flex items-center">
                        <img
                            src={localImage}
                            alt="Preview"
                            className="h-full object-contain rounded"
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // prevent triggering upload
                                handleRemoveImage();
                            }}
                            className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 flex flex-col items-center">
                        <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                        <p>{isDragActive ? "Drop here..." : "Click to upload or drag and drop"}</p>
                    </div>
                )}
            </div>

            <label className="block font-semibold mb-1">Title</label>
            <div className="relative mb-4">
                <input
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <label className="block font-semibold mb-1">Description</label>
            <div className="relative mb-6">
                <textarea
                    rows="4"
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-3 text-gray-400" />
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
                    className="px-4 py-2 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white rounded-md hover:from-[#C16A00] hover:to-[#C5703F]"
                >
                    Save Changes
                </button>
            </div>
        </>
    );
}

export default SectionOne;
