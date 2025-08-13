import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setSectionOne, setLoading } from "../../../features/home_slices/sectionOneSlice";
import { fetchSectionOne, saveSectionOne } from "../../../services/home_service/sectionOneService";

function SectionOne() {
    const dispatch = useDispatch();
    const { title, description, image } = useSelector((state) => state.sectionOne);
    const uid = "your-unique-id"; 

    const [localTitle, setLocalTitle] = useState(title);
    const [localDescription, setLocalDescription] = useState(description);
    const [localImage, setLocalImage] = useState(image);

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionOne(uid);
            // console.log("data: ", data);
            dispatch(setSectionOne(data.sectionOne));
            setLocalTitle(data.sectionOne.title);
            setLocalDescription(data.sectionOne.description);
            setLocalImage(data.sectionOne.image);
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const onDrop = (acceptedFiles) => {
        const reader = new FileReader();
        reader.onload = () => setLocalImage(reader.result);
        reader.readAsDataURL(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleRemoveImage = () => setLocalImage(null);

    const handleDiscard = () => {
        setLocalTitle(title);
        setLocalDescription(description);
        setLocalImage(image);
    };

    const handleSave = async () => {
        const newData = {
            title: localTitle,
            description: localDescription,
            image: localImage
        };
        dispatch(setSectionOne(newData)); // update store
        await saveSectionOne(uid, newData); // update Firestore
        console.log("Section 1 data saved successfully", newData);
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Section 1</h3>
            <label className="block font-semibold mb-1">Image</label>

            {localImage ? (
                <div className="relative inline-block mb-4">
                    <img src={localImage} alt="Preview" className="w-64 h-auto object-cover rounded shadow" />
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
