import { useEffect, useState } from "react";
import { setTestimonials, setLoading } from "../../../features/home_slices/testimonials";
import { fetchTestimonials, saveTestimonials, deleteTestimonial } from "../../../services/home_service/testimonialService";
import { useDispatch } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../../services/firebase";
import { showSuccess } from "../../../utils/toast";

function TestimonialsEdit() {
    const [testimonial, setTestimonial] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState({});

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchTestimonials(uid);
            setTestimonial(data?.testimonial || []);
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const handleAddTestimonial = () => {
        setTestimonial((prev) => [...prev, { name: "", shortdesignation: "", quotedText: "", image: null }]);
    };

    const handleTestimonialNameChange = (index, value) => {
        setTestimonial(prev => {
            const updated = [...prev];
            updated[index].name = value;
            return updated;
        });
    };

    const handleTestimonialShortDesignationChange = (index, value) => {
        setTestimonial(prev => {
            const updated = [...prev];
            updated[index].shortdesignation = value;
            return updated;
        });
    };

    const handleTestimonialQuotedTextChange = (index, value) => {
        setTestimonial(prev => {
            const updated = [...prev];
            updated[index].quotedText = value;
            return updated;
        });
    };

    const handleProgramImageChange = async (index, file) => {
        if (!file) return;
        
        try {
            setIsUploading(prev => ({ ...prev, [index]: true }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
            
            const storageRef = ref(storage, `testimonials/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [index]: Math.round(progress) }));
                },
                (error) => {
                    console.error("Image upload failed:", error);
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    const updated = [...testimonial];
                    updated[index].image = url;
                    setTestimonial(updated);
                    // Remove Redux dispatch during upload - only dispatch on save
                    
                    setIsUploading(prev => ({ ...prev, [index]: false }));
                    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
                }
            );
        } catch (error) {
            console.error("Image upload failed:", error);
            setIsUploading(prev => ({ ...prev, [index]: false }));
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));
        }
    };

    const handleTestimonialImageRemove = async (index) => {
        try {
            const imageUrl = testimonial[index].image;
            
            if (imageUrl) {
                try {
                    // Extract the file path from the download URL
                    const url = new URL(imageUrl);
                    const pathMatch = url.pathname.match(/\/o\/(.*?)\?/);
                    
                    if (pathMatch && pathMatch[1]) {
                        const filePath = decodeURIComponent(pathMatch[1]);
                        const fileRef = ref(storage, filePath);
                        
                        await deleteObject(fileRef);
                    }
                } catch (storageError) {
                    console.warn("Could not delete media file from storage:", storageError);
                    // Continue with removal even if storage deletion fails
                }
            }

            const updated = [...testimonial];
            updated[index].image = null;
            setTestimonial(updated);
            // Remove Redux dispatch during image removal - only dispatch on save
        } catch (error) {
            console.error("Image remove failed:", error);
        }
    };

    const handleDiscard = async () => {
        setTestimonial([]);
        dispatch(setTestimonials([]));
        await saveTestimonials(uid, []);
    };

    const handleSave = async () => {
        setTestimonial(testimonial);
        dispatch(setTestimonials(testimonial));
        await saveTestimonials(uid, testimonial);
        showSuccess("Testimonials saved successfully");
    };

    const handleDeleteTestimonial = async (index) => {
        const testimonialToDelete = testimonial[index];
        
        try {
            // Delete the media file from Firebase Storage if it exists
            if (testimonialToDelete.image) {
                try {
                    // Extract the file path from the download URL
                    const url = new URL(testimonialToDelete.image);
                    const pathMatch = url.pathname.match(/\/o\/(.*?)\?/);
                    
                    if (pathMatch && pathMatch[1]) {
                        const filePath = decodeURIComponent(pathMatch[1]);
                        const fileRef = ref(storage, filePath);
                        
                        await deleteObject(fileRef);
                    }
                } catch (storageError) {
                    console.warn("Could not delete media file from storage:", storageError);
                    // Continue with deletion even if storage deletion fails
                }
            }
            
            // Remove from local state and Firestore
            const updated = [...testimonial];
            updated.splice(index, 1);
            setTestimonial(updated);
            dispatch(setTestimonials(updated));
            await deleteTestimonial(uid, index);
            
        } catch (error) {
            console.error("Error deleting testimonial:", error);
        }
    };

    return (
        <>
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                    Testimonial Edits <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                {testimonial.map((testimonial, index) => (
                    <div key={index} className="mb-6 pt-4 relative">
                        <button
                            onClick={() => handleDeleteTestimonial(index)}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                            Delete
                        </button>

                        <label className="block font-semibold mb-2">Person {index + 1}</label>
                        <label className="block font-semibold mb-1">Name</label>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Enter name"
                                value={testimonial.name}
                                onChange={(e) => handleTestimonialNameChange(index, e.target.value)}
                                className="w-full border rounded p-2 pr-10"
                            />
                            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        <label className="block font-semibold mb-1">Short Designation</label>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={testimonial.shortdesignation}
                                placeholder="General Manager"
                                onChange={(e) => handleTestimonialShortDesignationChange(index, e.target.value)}
                                className="w-full border rounded p-2 pr-10"
                            />
                            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        <label className="block font-semibold mb-1">Quoted Text</label>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={testimonial.quotedText}
                                placeholder="Enter quoted text here"
                                onChange={(e) => handleTestimonialQuotedTextChange(index, e.target.value)}
                                className="w-full border rounded p-2 pr-10"
                            />
                            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        {testimonial.image ? (
                            <div className="relative inline-block mb-4">
                                <img
                                    src={testimonial.image}
                                    alt="Preview"
                                    className="w-64 h-auto object-cover rounded shadow"
                                />
                                <button
                                    onClick={() => handleTestimonialImageRemove(index)}
                                    className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                                >
                                    <FaTimes size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <label className="block font-semibold mb-1">Add Photo</label>
                                <label
                                    htmlFor={`testimonial-upload-${index}`}
                                    className={`w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 relative ${isUploading[index] ? 'pointer-events-none opacity-75' : ''}`}
                                >
                                    {isUploading[index] ? (
                                        <div className="text-center flex flex-col items-center">
                                            <div className="relative w-16 h-16 mb-3">
                                                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                                <div 
                                                    className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                                    style={{
                                                        background: `conic-gradient(from 0deg, #2F6288 ${(uploadProgress[index] || 0) * 3.6}deg, transparent ${(uploadProgress[index] || 0) * 3.6}deg)`
                                                    }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xs font-semibold text-[#2F6288]">{uploadProgress[index] || 0}%</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-[#2F6288] font-medium">Uploading...</p>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                                                <div 
                                                    className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress[index] || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <img
                                                src="/assets/admin/upload.svg"
                                                alt="Upload Icon"
                                                className="w-12 h-12 mb-2"
                                            />
                                            <span>Click to upload</span>
                                            <span>Ratio: 1:1</span>
                                        </>
                                    )}
                                    <input
                                        id={`testimonial-upload-${index}`}
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

                {/* Add Testimonial Button */}
                <div
                    onClick={handleAddTestimonial}
                    className="w-full text-center my-4 bg-[#2F6288] text-white py-2 rounded-md cursor-pointer hover:bg-[#224b66]"
                >
                    Add Testimonial
                </div>
            
                {/* buttons */}
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
            </div>
        </>
    )
}

export default TestimonialsEdit