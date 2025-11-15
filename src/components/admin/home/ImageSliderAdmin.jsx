import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDragIndicator } from "react-icons/md";
import { FaTrash, FaEdit } from "react-icons/fa";
import { add_Or_Update_Slide, deleteSlideFromFirestore } from "../../../services/home_service/slidesService";
import { doc, getDoc } from "firebase/firestore";
import { db, storage } from "../../../services/firebase";
import { useDispatch, useSelector } from "react-redux";
import { setLoading, setSlides } from "../../../features/home_slices/slidesSlice";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { showSuccess } from "../../../utils/toast";

const ItemType = "SLIDE";

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
                <img src={slide.image} alt="thumb" className="h-12 w-12 rounded object-cover" />
                <div>
                    <p className="font-semibold">{slide.title}</p>
                    <p className="text-sm text-gray-500">Link: {slide.link}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onToggle(index)}
                    className={`text-xs px-3 py-1 rounded font-semibold cursor-pointer ${slide.active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}
                >
                    {slide.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => onEdit(index)} className="text-blue-600"><FaEdit /></button>
                <button onClick={() => onDelete(index)} className="text-gray-600"><FaTrash /></button>
            </div>
        </div>
    );
}

export default function ImageSlider() {
    // const [slides, setSlides] = useState([]);
    const [image, setImage] = useState(null);
    const [link, setLink] = useState("");
    const [displayOrder, setDisplayOrder] = useState("1");
    const [editingIndex, setEditingIndex] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const dispatch = useDispatch();
    const uid = "your-unique-id";
    const slides = useSelector((state) => state.slides.data);

    useEffect(() => {
        const fetchSlidesOnce = async () => {
            dispatch(setLoading(true));
            const slidesRef = doc(db, `homepage/${uid}/image_slider/slides`);
            const snapshot = await getDoc(slidesRef);

            if (snapshot.exists()) {
                dispatch(setSlides(snapshot.data().slides || []));
            } else {
                dispatch(setSlides([]));
            }

            dispatch(setLoading(false));
        };

        fetchSlidesOnce();
    }, [uid, dispatch]);

    const onDrop = async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        try {
            setIsUploading(true);
            setUploadProgress(0);
            
            // create a unique path in storage
            const storageRef = ref(storage, `slides/${uid}/${uuidv4()}-${file.name}`);
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
                    setImage(url);
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

    const addOrUpdateSlide = async () => {
        if (!image || !link) return;

        const newSlide = {
            image,
            link,
            title: link.split("/").pop().replace(/[-_]/g, " "),
            active: true,
        };

        let updated;
        if (editingIndex !== null) {
            updated = [...slides];
            updated[editingIndex] = newSlide;
            setEditingIndex(null);
        } else {
            updated = [...slides];
            updated.splice(parseInt(displayOrder) - 1, 0, newSlide);
        }

        setSlides(updated);
        dispatch(setSlides(updated));
        await add_Or_Update_Slide(uid, updated);
        showSuccess("Slide added successfully!");

        setImage(null);
        setLink("");
        setDisplayOrder("1");
    };

    const editSlide = (index) => {
        const slide = slides[index];
        setImage(slide.image);
        setLink(slide.link);
        setEditingIndex(index);
    };

    const deleteSlide = (index) => {
        const updated = [...slides];
        updated.splice(index, 1);
        setSlides(updated);
        dispatch(setSlides(updated));
        deleteSlideFromFirestore(uid, index);
    };

    const toggleActive = (index) => {
        const updated = [...slides];
        updated[index].active = !updated[index].active;
        setSlides(updated);
    };

    const moveSlide = async (from, to) => {
        // prevent invalid moves
        if (to < 0 || to >= slides.length) return;

        const updated = [...slides];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);

        setSlides(updated);
        dispatch(setSlides(updated));

        // persist new order in Firestore
        try {
            await add_Or_Update_Slide(uid, updated);
        } catch (error) {
            console.error("Error updating slide order:", error);
        }
    };

    return (
        <div className="md:p-8 px-4 py-0 mx-auto">
            {/* Upload & Form */}
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                Image Slider <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>

            <div className="mb-6">

                {/* Image Upload */}
                <h3 className="text-md font-semibold text-gray-700 mb-2">Add Image</h3>
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
                    ) : image ? (
                        <img src={image} alt="preview" className="h-full object-contain" />
                    ) : (
                        <div className="text-center text-gray-500 flex flex-col items-center">
                            <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                            <p>{isDragActive ? "Drop here..." : "Click to upload or drag and drop"}</p>
                        </div>
                    )}

                </div>

                <button
                    onClick={addOrUpdateSlide}
                    className="bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white px-4 py-2 rounded hover:bg-gradient-to-b hover:from-[#C16A00] hover:to-[#C5703F] transition-colors"
                >
                    {editingIndex !== null ? "Update Slide" : "Add Slide"}
                </button>
            </div>

            {/* Slide List */}
            <h3 className="text-md font-semibold text-gray-700 mb-2">Current Slides</h3>
            <DndProvider backend={HTML5Backend}>
                {
                    slides.map((slide, index) => (
                        <SlideItem
                            key={index}
                            index={index}
                            slide={slide}
                            moveSlide={moveSlide}
                            onEdit={editSlide}
                            onDelete={deleteSlide}
                            onToggle={toggleActive}
                        />
                    ))}
            </DndProvider>
        </div>
    );
}
