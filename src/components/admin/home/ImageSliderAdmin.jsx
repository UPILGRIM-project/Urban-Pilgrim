import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDragIndicator } from "react-icons/md";
import { FaTrash, FaEdit } from "react-icons/fa";

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
          className={`text-xs px-3 py-1 rounded font-semibold cursor-pointer ${
            slide.active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
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
  const [slides, setSlides] = useState([]);
  const [image, setImage] = useState(null);
  const [link, setLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [editingIndex, setEditingIndex] = useState(null);

  const onDrop = (acceptedFiles) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const addOrUpdateSlide = () => {
    if (!image || !link) return;
    const newSlide = {
      image,
      link,
      title: link.split("/").pop().replace(/[-_]/g, " "),
      active: true,
    };
    if (editingIndex !== null) {
      const updated = [...slides];
      updated[editingIndex] = newSlide;
      setSlides(updated);
      setEditingIndex(null);
    } else {
      const updated = [...slides];
      updated.splice(parseInt(displayOrder) - 1, 0, newSlide);
      setSlides(updated);
    }
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
  };

  const toggleActive = (index) => {
    const updated = [...slides];
    updated[index].active = !updated[index].active;
    setSlides(updated);
  };

  const moveSlide = (from, to) => {
    const updated = [...slides];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setSlides(updated);
  };

  return (
    <div className="p-8 mx-auto">
      {/* Upload & Form */}
      <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
        Image Slider <span className="bg-[#2F6288] mt-4 max-w-xs h-1 block"></span>
      </h2>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Add Image</h3>
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
        <h3 className="text-lg font-semibold mb-3">Link Url</h3>
        <input
          type="text"
          placeholder="http://example.com"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />
        <h3 className="text-lg font-semibold mb-3">Display Order</h3>
        <select
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        >
          {Array.from({ length: slides.length + 1 }).map((_, i) => (
            <option key={i} value={i + 1}>
              Position {i + 1}
            </option>
          ))}
        </select>

        <button
          onClick={addOrUpdateSlide}
          className="bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white px-4 py-2 rounded hover:bg-gradient-to-b hover:from-[#C16A00] hover:to-[#C5703F] transition-colors"
        >
          {editingIndex !== null ? "Update Slide" : "Add Slide"}
        </button>
      </div>

      {/* Slide List */}
      <h3 className="text-lg font-semibold mb-3">Current Slides</h3>
      <DndProvider backend={HTML5Backend}>
        {slides.map((slide, index) => (
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
