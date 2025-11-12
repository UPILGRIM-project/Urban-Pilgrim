import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { setSectionThree, setLoading } from "../../../features/home_slices/sectionThreeSlice";
import { fetchSectionThree, saveSectionThree } from "../../../services/home_service/sectionThreeService";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../../../services/firebase";
import { v4 as uuidv4 } from "uuid";
import { showSuccess } from "../../../utils/toast";

function SectionThree() {
    const [image, setImage] = useState(null);
    const [title, setTitle] = useState("Begin your pilgrimage here");
    const [programs, setPrograms] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState({});
    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionThree(uid);
            dispatch(setSectionThree(data.sectionThree));
            setPrograms(data.sectionThree.programs || []);
            dispatch(setLoading(false));
        };

    const handleProgramImageError = (index) => {
        // If the image fails to load, clear it so the upload UI shows
        const updated = [...programs];
        updated[index].image = null;
        setPrograms(updated);
    };
        loadData();
    }, [uid, dispatch]);

    const handleAddProgram = () => {
        setPrograms((prev) => [...prev, { title: "", image: null }]);
    };

    const handleProgramTitleChange = (index, value) => {
        const updated = [...programs];
        updated[index].title = value;
        setPrograms(updated);
    };

    const handleProgramImageChange = async (index, file) => {
        if (!file) return;

        try {
            // Set uploading state for this specific program
            setIsUploading(prev => ({ ...prev, [index]: true }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
            
            // Create a storage reference
            const storageRef = ref(storage, `slides/sectionThree/${uuidv4()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Track upload progress for this specific program
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [index]: Math.round(progress) }));
                },
                (error) => {
                    console.error("Error uploading image:", error);
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Update local state with download URL
                    const updated = [...programs];
                    updated[index].image = downloadURL;
                    setPrograms(updated);
                    
                    // Reset upload states
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                    
                }
            );
        } catch (error) {
            console.error("Error uploading image:", error);
            setIsUploading(prev => ({ ...prev, [index]: false }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
        }
    };

    const handleProgramImageRemove = async (index) => {
        try {
            const updated = [...programs];

            // check if an image exists before removing
            if (updated[index].image) {
                try {
                    // Extract the file path from the Firebase Storage URL
                    const imageUrl = updated[index].image;
                    
                    // For Firebase Storage URLs, extract the path after '/o/' and before '?'
                    const pathMatch = imageUrl.match(/\/o\/(.+?)\?/);
                    if (pathMatch) {
                        const filePath = decodeURIComponent(pathMatch[1]);
                        const storageRef = ref(storage, filePath);
                        await deleteObject(storageRef);
                    } else {
                        // Fallback: try using the URL directly (for older implementations)
                        const storageRef = ref(storage, imageUrl);
                        await deleteObject(storageRef);
                    }
                } catch (deleteError) {
                    console.warn("Could not delete image from storage:", deleteError);
                    // Continue with removing from local state even if storage deletion fails
                }

                // set image field to null after deletion attempt
                updated[index].image = null;
                setPrograms(updated);

                showSuccess("Image removed successfully");
            } else {
                console.log("No image to delete for this program");
            }
        } catch (error) {
            console.error("Error removing program image:", error);
            // Still try to remove from local state
            const updated = [...programs];
            updated[index].image = null;
            setPrograms(updated);
        }
    };

    const handleDiscard = async () => {
        try {
            dispatch(setLoading(true));
            // Reload the latest saved data from backend and reset local state
            const data = await fetchSectionThree(uid);
            const section = data?.sectionThree || { title: "", programs: [] };

            setImage(null);
            setTitle(section.title || "");
            setPrograms(section.programs || []);
            setUploadProgress({});
            setIsUploading({});

            dispatch(setSectionThree(section));
            showSuccess("Changes discarded");
        } catch (err) {
            console.error("Failed to discard changes:", err);
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleSave = async () => {
        dispatch(setSectionThree({ title, programs })); // update store
        await saveSectionThree(uid, { title, programs }); // update Firestore
        showSuccess("Data saved successfully");
    };

    const handleDeleteProgram = (index) => {
        const updated = [...programs];
        updated.splice(index, 1);
        setPrograms(updated);
        dispatch(setSectionThree(updated)); // update store
        saveSectionThree(uid, updated); // update Firestore
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Section 1</h3>
            <label className="block font-semibold mb-1">Title</label>
            <div className="relative mb-4">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {programs && programs.map((program, index) => (
                <div key={index} className="mb-6 pt-4 relative">
                    <button
                        onClick={() => handleDeleteProgram(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
                    >
                        Delete
                    </button>

                    <label className="block font-semibold mb-1">Title for Program {index + 1}</label>
                    <input
                        type="text"
                        value={program.title}
                        placeholder="Enter program title"
                        onChange={(e) => handleProgramTitleChange(index, e.target.value)}
                        className="w-full border rounded p-2 mb-4"
                    />

                    <label className="block font-semibold mb-1">Image for Program {index + 1}</label>

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
                    ) : (typeof program.image === 'string' && /^https?:\/\//.test(program.image)) ? (
                        <div className="relative inline-block mb-4">
                            <img
                                src={program.image}
                                alt="Preview"
                                className="w-64 h-auto object-cover rounded shadow"
                                onError={() => handleProgramImageError(index)}
                            />
                            <button
                                onClick={() => handleProgramImageRemove(index)}
                                className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label
                                htmlFor={`program-upload-${index}`}
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                            >
                                <img
                                    src="/assets/admin/upload.svg"
                                    alt="Upload Icon"
                                    className="w-12 h-12 mb-2"
                                />
                                <span>Click to upload</span>
                                <input
                                    id={`program-upload-${index}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleProgramImageChange(index, e.target.files[0])}
                                    className="hidden"
                                    disabled={isUploading[index]}
                                />
                            </label>
                        </div>
                    )}
                </div>
            ))}

            <div
                onClick={handleAddProgram}
                className="w-full text-center my-4 bg-[#2F6288] text-white py-2 rounded-md cursor-pointer hover:bg-[#224b66]"
            >
                Add Program
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

export default SectionThree;
