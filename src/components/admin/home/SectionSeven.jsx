import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setLoading, setSectionSeven } from "../../../features/home_slices/sectionSevenSlice";
import { fetchSectionSeven, saveSectionSeven } from "../../../services/home_service/sectionSevenService";
import toast from "react-hot-toast";

function SectionSeven() {
    const [title, setTitle] = useState("It asks: What about me?");
    const [description, setDescription] = useState(
        "We live in a world that celebrates hustle—but forgets healing. Every scroll, every deadline, every city noise pulls us outward. Yet somewhere inside, a quieter voice longs to be heard."
    );

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const loadData = async () => {
            dispatch(setLoading(true));
            const data = await fetchSectionSeven(uid);
            setTitle(data?.sectionSeven?.title || "");
            setDescription(data?.sectionSeven?.description || "");
            dispatch(setSectionSeven(data.sectionSeven));
            dispatch(setLoading(false));
        };
        loadData();
    }, [uid, dispatch]);

    const handleDiscard = async () => {
        setTitle("");
        setDescription("");
        dispatch(setSectionSeven({ title: "", description: "" })); // reset store
        await saveSectionSeven(uid, { title: "", description: "" }); // reset Firestore
    };

    const handleSave = async () => {
        dispatch(setSectionSeven({ title, description })); // update store
        await saveSectionSeven(uid, { title, description }); // update Firestore
        toast.success("Section data saved successfully", { title, description });
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2">Pilgrim Guide</h3>

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

export default SectionSeven