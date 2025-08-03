import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";


function SectionFour() {
    const [image, setImage] = useState(null);

    const [features, setFeatures] = useState([]);

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

    const handleFeatureImageChange = (index, file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const updated = [...features];
            updated[index].image = reader.result;
            setFeatures(updated);
        };
        reader.readAsDataURL(file);
    };

    const handleFeatureImageRemove = (index) => {
    const updated = [...features];
    updated[index].image = null;
    setFeatures(updated);
    };

    const handleDiscard = () => {
    setImage(null);
    setFeatures([]);
    };

    const handleSave = () => {
    console.log({
        image,
        features,
    });
    };

    const handleDeleteFeature = (index) => {
    const updated = [...features];
    updated.splice(index, 1);
    setFeatures(updated);
    };

    const onDrop = (acceptedFiles) => {
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleRemoveImage = () => setImage(null);
    return (
    <>
        <h3 className="text-lg font-bold mb-2">Section 4</h3>
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
            <input {...getInputProps()} />
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
            {feature.image ? (
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
          Add One More Feature
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