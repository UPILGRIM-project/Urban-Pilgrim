import { useDrag, useDrop } from "react-dnd";
import { MdDragIndicator } from "react-icons/md";
import { FaTrash, FaEdit, FaEye, FaEyeSlash } from "react-icons/fa";

const ItemType = "WORKSHOP";

function WorkshopItem({ slide, index, moveSlide, onEdit, onDelete, onToggle }) {
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
                <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                    {slide.thumbnail ? (
                        <img src={slide.thumbnail} alt="Workshop thumbnail" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold">{slide.title || 'Untitled Workshop'}</p>
                    <p className="text-sm text-gray-500">Price: ₹{slide.price || 'Free'}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>📸 {slide.images?.length || 0}</span>
                        <span>🎥 {slide.videos?.length || 0}</span>
                        <span>👥 {slide.minPerson || 0}-{slide.maxPerson || '∞'}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onToggle(index)}
                    className={`text-xs px-3 py-1 rounded font-semibold cursor-pointer ${
                        slide.active !== false 
                            ? "bg-green-100 text-green-600" 
                            : "bg-red-100 text-red-600"
                    }`}
                >
                    {slide.active !== false ? (
                        <>
                            <FaEye className="inline mr-1" />
                            Visible
                        </>
                    ) : (
                        <>
                            <FaEyeSlash className="inline mr-1" />
                            Not Visible
                        </>
                    )}
                </button>
                <button
                    onClick={() => {
                        onEdit(index);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-blue-600 hover:text-blue-800 p-2"
                    title="Edit Workshop"
                >
                    <FaEdit />
                </button>
                <button
                    onClick={() => onDelete(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Delete Workshop"
                >
                    <FaTrash />
                </button>
            </div>
        </div>
    );
}

export default WorkshopItem;
