import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDragIndicator } from "react-icons/md";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { add_Or_Update_Highlight, deleteHighlightFromFirestore, fetchHighlights } from "../../../services/home_service/highlights";
import { setHighlight, setLoading } from "../../../features/home_slices/highlightSlice";
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../../../services/firebase";
import { showSuccess } from "../../../utils/toast";

const ItemType = "HIGHLIGHT";

function HighlightItem({ highlight, index, moveHighlight, onEdit, onDelete, onToggle }) {
    const [, ref] = useDrop({
        accept: ItemType,
        hover: (item) => {
            if (item.index !== index) {
                moveHighlight(item.index, index);
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
                {highlight.image && highlight.image.includes('video') || 
                 (highlight.image && (highlight.image.includes('.mp4') || highlight.image.includes('.webm') || 
                  highlight.image.includes('.ogg') || highlight.image.includes('.avi') || highlight.image.includes('.mov'))) ? (
                    <video 
                        src={highlight.image} 
                        className="h-12 w-12 rounded object-cover"
                        muted
                        loop
                        preload="metadata"
                    />
                ) : (
                    <img src={highlight.image} alt="thumb" className="h-12 w-12 rounded object-cover" />
                )}
                <div>
                    <p className="font-semibold">{highlight.title}</p>
                    <p className="text-sm text-gray-500">Description: {highlight.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onToggle(index)}
                    className={`text-xs px-3 py-1 rounded font-semibold cursor-pointer ${highlight.active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}
                >
                    {highlight.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => onEdit(index)} className="text-blue-600"><FaEdit /></button>
                <button onClick={() => onDelete(index)} className="text-gray-600"><FaTrash /></button>
            </div>
        </div>
    );
}

export default function Highlights() {
    const [highlights, setHighlights] = useState([]);
    const [image, setImage] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [displayOrder, setDisplayOrder] = useState("1");
    const [editingIndex, setEditingIndex] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileType, setFileType] = useState(null);

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    const onDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);
            
            // Determine file type
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            
            if (!isVideo && !isImage) {
                console.error('Only image and video files are allowed');
                setIsUploading(false);
                return;
            }
            
            setFileType(isVideo ? 'video' : 'image');
            
            // Create a unique path for the file
            const storageRef = ref(storage, `slides/upcomingEvents/${uuidv4()}-${file.name}`);

            // Upload file with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Error uploading file:", error);
                    setIsUploading(false);
                    setUploadProgress(0);
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setImage(downloadURL);
                    setIsUploading(false);
                    setUploadProgress(0);
                }
            );
        } catch (error) {
            console.error("Error uploading file:", error);
            setIsUploading(false);
            setUploadProgress(0);
            setFileType(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
            'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov']
        }
    });

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchHighlights(uid);
            setHighlights(data?.highlight || []);
            dispatch(setHighlight(data?.highlight));
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const addOrUpdateHighlight = () => {
        if (!image || !title) return;
        const newHighlight = {
            image,
            title,
            description,
            active: true,
        };
        if (editingIndex !== null) {
            const updated = [...highlights];
            updated[editingIndex] = newHighlight;
            setHighlights(updated);
            setEditingIndex(null);
            dispatch(setHighlight(updated));
            add_Or_Update_Highlight(uid, updated);
        } else {
            const updated = [...highlights];
            updated.splice(parseInt(displayOrder) - 1, 0, newHighlight);
            setHighlights(updated);
            dispatch(setHighlight(updated));
            add_Or_Update_Highlight(uid, updated);
        }
        setImage(null);
        setTitle("");
        setDescription("");
        setDisplayOrder("1");
        setFileType(null);
        showSuccess("Highlight added successfully!");
    };

    const editHighlight = (index) => {
        const highlight = highlights[index];
        setImage(highlight.image);
        setTitle(highlight.title);
        setDescription(highlight.description);
        setEditingIndex(index);
    };

    const deleteHighlight = async (index) => {
        const highlightToDelete = highlights[index];
        
        try {
            // Delete the media file from Firebase Storage if it exists
            if (highlightToDelete.image) {
                try {
                    // Extract the file path from the download URL
                    const url = new URL(highlightToDelete.image);
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
            const updated = [...highlights];
            updated.splice(index, 1);
            setHighlights(updated);
            dispatch(setHighlight(updated));
            await deleteHighlightFromFirestore(uid, index);
        } catch (error) {
            console.error("Error deleting highlight:", error);
        }
    };

    const toggleActive = (index) => {
        const updated = [...highlights];
        updated[index].active = !updated[index].active;
        setHighlights(updated);
    };

    const moveHighlight = async (from, to) => {
        if (to < 0 || to >= highlights.length) return; // prevent invalid moves

        const updated = [...highlights];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);

        setHighlights(updated);

        try {
            // persist updated order in Firestore
            await add_Or_Update_Highlight(uid, updated);
        } catch (error) {
            console.error("Error updating highlight order:", error);
        }
    };

    return (
        <div className="md:p-8 px-4 py-0 mx-auto">
            {/* Upload & Form */}
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                Pilgrim Says <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>

            <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Highlight Title</h3>
                <input
                    type="text"
                    placeholder="Enter Highlight title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border p-2 rounded mb-3"
                />
                <h3 className="text-md font-semibold text-gray-700 mb-2">Highlight Description</h3>
                <input
                    type="textarea"
                    rows="4"
                    placeholder="Enter Highlight description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border p-2 rounded mb-3"
                />
                <h3 className="text-md font-semibold text-gray-700 mb-2">Add Image or Video</h3>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed border-gray-300 h-40 rounded mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
                >
                    <input {...getInputProps()} disabled={isUploading} />
                    {isUploading ? (
                        <div className="text-center flex flex-col items-center">
                            <div className="relative w-16 h-16 mb-3">
                                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                <div 
                                    className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                    style={{
                                        background: `conic-gradient(from 0deg, #2F6288 ${uploadProgress * 3.6}deg, transparent ${uploadProgress * 3.6}deg)`
                                    }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-[#2F6288]">{uploadProgress}%</span>
                                </div>
                            </div>
                            <p className="text-sm text-[#2F6288] font-medium">Uploading...</p>
                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                    className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : image ? (
                        fileType === 'video' ? (
                            <video 
                                src={image} 
                                controls 
                                className="h-full max-w-full object-contain"
                                preload="metadata"
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <img src={image} alt="preview" className="h-full object-contain" />
                        )
                    ) : (
                        <div className="text-center text-gray-500 flex flex-col items-center">
                            <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                            <p>{isDragActive ? "Drop here..." : "Click to upload images or videos"}</p>
                            <p className="text-xs mt-1">Supported: JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG, AVI, MOV</p>
                        </div>
                    )}
                </div>


                <button
                    onClick={addOrUpdateHighlight}
                    disabled={isUploading}
                    className={`bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white px-4 py-2 rounded hover:bg-gradient-to-b hover:from-[#C16A00] hover:to-[#C5703F] transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {editingIndex !== null ? "Update Pilgrim Says" : "Add Pilgrim Says"}
                </button>
            </div>

            {/* Highlight List */}
            <h3 className="text-md font-semibold text-gray-700 mb-2">Current Highlights</h3>
            <DndProvider backend={HTML5Backend}>
                {highlights.map((highlight, index) => (
                    <HighlightItem
                        key={index}
                        index={index}
                        highlight={highlight}
                        moveHighlight={moveHighlight}
                        onEdit={editHighlight}
                        onDelete={deleteHighlight}
                        onToggle={toggleActive}
                    />
                ))}
            </DndProvider>
        </div>
    );
}
