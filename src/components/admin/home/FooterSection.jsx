import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setFooters, setLoading } from "../../../features/home_slices/footerSlice";
import { fetchFooter, saveFooterLinks, deleteFooterLink } from "../../../services/home_service/footerService";
import { showSuccess } from "../../../utils/toast";

function FooterSection() {
    const [footer, setFooter] = useState([]);
    const [heading, setHeading] = useState("");
    const [shortText, setShortText] = useState("");

    const dispatch = useDispatch();
    const uid = "your-unique-id";

    useEffect(() => {
        const fetchData = async () => {
            dispatch(setLoading(true));
            const response = await fetchFooter(uid);
            if (response) {
                setFooter(response?.footer?.links);
                setHeading(response?.footer?.heading);
                setShortText(response?.footer?.description);
                dispatch(setFooters(response.footer));
            }
            dispatch(setLoading(false));
        };
        fetchData();
    }, [dispatch, uid]);

    const handleShortTextChange = (value) => {
        setShortText(value);
    };

    const handleHeadingChange = (value) => {
        setHeading(value);
    };

    const handleAddFooter = () => {
        setFooter((prev) => [...prev, { menu: "", linkUrl: "" }]);
    };

    const handleFooterMenuChange = (index, value) => {
        const updated = [...footer];
        updated[index].menu = value;
        setFooter(updated);
    };

    const handleFooterLinkUrlChange = (index, value) => {
        const updated = [...footer];
        updated[index].linkUrl = value;
        setFooter(updated);
    };

    const handleDiscard = async () => {
        // Reset local state
        setFooter([]);
        setHeading("");
        setShortText("");

        // Reset Redux store to initial state
        dispatch(setFooters({
            links: [],
            Heading: "",
            Description: ""
        }));

        // Update Firestore (pass the reset object)
        await saveFooterLinks(uid, {
            links: [],
            heading: "",
            description: ""
        });
    };

    const handleSave = async () => {
        dispatch(setFooters({ links: footer, heading, description: shortText }));
        await saveFooterLinks(uid, { links: footer, heading, description: shortText });
        showSuccess("Footer saved successfully!");
    };

    const handleDeleteFooter = async (index) => {
        const updated = [...footer];
        updated.splice(index, 1);
        setFooter(updated);
        dispatch(setFooters(updated));
        await deleteFooterLink(uid, index);
    };

    return (
        <>
            <div className="md:p-8 px-4 py-0 mx-auto">
                <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
                    Footer Section <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
                </h2>

                <label className="block font-semibold mb-1">Short Text</label>
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Enter short text"
                        value={shortText}
                        onChange={(e) => handleShortTextChange(e.target.value)}
                        className="w-full border rounded p-2 pr-10"
                    />
                    <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                <label className="block font-semibold mb-1">Heading</label>
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Enter heading"
                        value={heading}
                        onChange={(e) => handleHeadingChange(e.target.value)}
                        className="w-full border rounded p-2 pr-10"
                    />
                    <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>


                {footer.map((footer, index) => (
                    <div key={index} className="mb-6 pt-4 relative">
                        <button
                            onClick={() => handleDeleteFooter(index)}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                            Delete
                        </button>

                        <label className="block font-semibold mb-1">Menu {index + 1}</label>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Enter menu title"
                                value={footer.menu}
                                onChange={(e) => handleFooterMenuChange(index, e.target.value)}
                                className="w-full border rounded p-2 pr-10"
                            />
                            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        <label className="block font-semibold mb-1">Link URL</label>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={footer.linkUrl}
                                placeholder="https://example.com"
                                onChange={(e) => handleFooterLinkUrlChange(index, e.target.value)}
                                className="w-full border rounded p-2 pr-10"
                            />
                            <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                ))}



                <div
                    onClick={handleAddFooter}
                    className="w-full text-center my-4 bg-[#2F6288] text-white py-2 rounded-md cursor-pointer hover:bg-[#224b66]"
                >
                    Add Links
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
            </div>
        </>
    )
}

export default FooterSection