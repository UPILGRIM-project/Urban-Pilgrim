import { useState } from "react";


function SectionFive() {
    const [title, setTitle] = useState("Book your Pilgrim Experience");
    const [description, setDescription] = useState(
        "Step into a transformative journey with our curated Pilgrim Experiences—designed to help you reconnect with your mind, body, and spirit. These impactful retreats blend Indian wellness traditions like yoga, meditation, and Ayurveda with modern practices, offering rejuvenation through nature immersions, culinary explorations, and spiritual experiences rooted in India’s rich heritage."
    );

    const handleDiscard = () => {
        setTitle("");
        setDescription("");
    };

    const handleSave = () => {
        console.log({ title, description, image });
        // You can connect this to backend logic
    };
    return (
    <>
        <h3 className="text-lg font-bold mb-2">Section 5</h3>
        
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
                rows="6"
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

export default SectionFive