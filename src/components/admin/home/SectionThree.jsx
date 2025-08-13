import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { setSectionThree, setLoading } from "../../../features/home_slices/sectionThreeSlice";
import { fetchSectionThree, saveSectionThree } from "../../../services/home_service/sectionThreeService";

function SectionThree() {
    const [image, setImage] = useState(null);
    const [title, setTitle] = useState("Explore our Programs");
    const [programs, setPrograms] = useState([]);
    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionThree(uid);
            console.log("data from section 3: ", data);
            dispatch(setSectionThree(data.sectionThree));
            setPrograms(data.sectionThree || []);
            dispatch(setLoading(false));
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

    const handleProgramImageChange = (index, file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const updated = [...programs];
            updated[index].image = reader.result;
            setPrograms(updated);
        };
        reader.readAsDataURL(file);
    };

    const handleProgramImageRemove = (index) => {
        const updated = [...programs];
        updated[index].image = null;
        setPrograms(updated);
    };

    const handleDiscard = () => {
        setImage(null);
        setTitle("");
        setPrograms([]);
        dispatch(setSectionThree({ title: "", programs: [] }));
    };

    const handleSave = async () => {
        dispatch(setSectionThree(programs)); // update store
        await saveSectionThree(uid, programs); // update Firestore
        console.log("Section 3 data saved successfully", programs);
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
            <h3 className="text-lg font-bold mb-2">Section 3</h3>
            <label className="block font-semibold mb-1">Title</label>
            <div className="relative mb-4">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {programs.map((program, index) => (
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

                    {program.image ? (
                        <div className="relative inline-block mb-4">
                            <img
                                src={program.image}
                                alt="Preview"
                                className="w-64 h-auto object-cover rounded shadow"
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
