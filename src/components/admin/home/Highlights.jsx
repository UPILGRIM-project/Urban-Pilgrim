import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDragIndicator } from "react-icons/md";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { add_Or_Update_Highlight, deleteHighlightFromFirestore, fetchHighlights } from "../../../services/home_service/highlights";
import { setHighlight, setLoading } from "../../../features/home_slices/highlightSlice";

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
                <img src={highlight.image} alt="thumb" className="h-12 w-12 rounded object-cover" />
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

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    const onDrop = (acceptedFiles) => {
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchHighlights(uid);
            console.log("data from highlights: ", data);
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
            console.log("Highlight updated:", newHighlight);
        } else {
            const updated = [...highlights];
            updated.splice(parseInt(displayOrder) - 1, 0, newHighlight);
            setHighlights(updated);
            dispatch(setHighlight(updated));
            add_Or_Update_Highlight(uid, updated);
            console.log("Highlight added:", newHighlight);
        }
        setImage(null);
        setTitle("");
        setDescription("");
        setDisplayOrder("1");
        
    };

    const editHighlight = (index) => {
        const highlight = highlights[index];
        setImage(highlight.image);
        setTitle(highlight.title);
        setDescription(highlight.description);
        setEditingIndex(index);
    };

    const deleteHighlight = (index) => {
        const updated = [...highlights];
        updated.splice(index, 1);
        setHighlights(updated);
        dispatch(setHighlight(updated));
        deleteHighlightFromFirestore(uid, index);
        console.log("Highlight deleted at index:", index);
    };

    const toggleActive = (index) => {
        const updated = [...highlights];
        updated[index].active = !updated[index].active;
        setHighlights(updated);
    };

    const moveHighlight = (from, to) => {
        const updated = [...highlights];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        setHighlights(updated);
    };

    return (
        <div className="md:p-8 px-4 py-0 mx-auto">
            {/* Upload & Form */}
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                Highlights <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
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
                <h3 className="text-md font-semibold text-gray-700 mb-2">Add Image</h3>
                <div
                    {...getRootProps()}
                    className="border-2 border-dashed border-gray-300 h-40 rounded mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                >
                    <input {...getInputProps()} />
                    {image ? (
                        <img src={image} alt="preview" className="h-full object-contain" />
                    ) : (
                        <div className="text-center text-gray-500 flex flex-col items-center">
                            <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                            <p>{isDragActive ? "Drop here..." : "Click to upload or drag and drop"}</p>
                        </div>
                    )}
                </div>


                <button
                    onClick={addOrUpdateHighlight}
                    className="bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white px-4 py-2 rounded hover:bg-gradient-to-b hover:from-[#C16A00] hover:to-[#C5703F] transition-colors"
                >
                    {editingIndex !== null ? "Update Highlight" : "Add Highlights"}
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
