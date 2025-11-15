import { useEffect, useState } from "react";
import { setSectionTwo, setLoading } from "../../../features/home_slices/sectionTwoSlice";
import { fetchSectionTwo, saveSectionTwo } from "../../../services/home_service/sectionTwoService";
import { useDispatch } from "react-redux";
import { showSuccess } from "../../../utils/toast";

function SectionTwo() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("")

    const dispatch = useDispatch();
    // const { title, description, image } = useSelector((state) => state.sectionTwo);
    const uid = "your-unique-id";

    const handleDiscard = () => {
        setTitle("");
        setDescription("");
    };

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionTwo(uid);
            dispatch(setSectionTwo(data.sectionTwo));
            setTitle(data.sectionTwo.title);
            setDescription(data.sectionTwo.description);
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const handleSave = async () => {
        const newData = {
            title: title,
            description: description,
        };
        dispatch(setSectionTwo(newData)); // update store
        await saveSectionTwo(uid, newData); // update Firestore
        showSuccess("Data saved successfully");
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Section 2</h3>

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

export default SectionTwo