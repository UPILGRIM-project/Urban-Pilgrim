import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";


function SectionOne() {
    const [image, setImage] = useState(null);
    const [title, setTitle] = useState("A journey for the modern seeker");
    const [description, setDescription] = useState(
        "We live in a world that celebrates hustle—but forgets healing. Every scroll, every deadline, every city noise pulls us outward. Yet somewhere inside, a quieter voice longs to be heard."
    );

    const onDrop = (acceptedFiles) => {
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleRemoveImage = () => setImage(null);

    const handleDiscard = () => {
        setImage(null);
        setTitle("");
        setDescription("");
    };

    const handleSave = () => {
        console.log({ title, description, image });
        // You can connect this to backend logic
    };
    return (
    <>
        <h3 className="text-lg font-bold mb-2">Section 1</h3>
        <label className="block font-semibold mb-1">Image</label>

        {image ? (
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
            <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
            <input {...getInputProps()} />
            {isDragActive ? "Drop the image here..." : "Click to upload or drag and drop"}
            </div>
        )}
        <label className="block font-semibold mb-1">Title</label>
        <div className="relative mb-4">
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded p-2 pr-10"
            />
            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        <label className="block font-semibold mb-1">Description</label>
        <div className="relative mb-6">
            <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            className="px-4 py-2 bg-gradient-to-b  from-[#C5703F] to-[#C16A00] text-white rounded-md hover:from-[#C16A00] hover:to-[#C5703F]"
          >
            Save Changes
          </button>
        </div>
    </>
  )
}

export default SectionOne