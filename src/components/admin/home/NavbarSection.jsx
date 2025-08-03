import { useState } from "react";


function NavbarSection() {
    const [navbar, setNavbar] = useState([]);

    const handleAddNavbar = () => {
    setNavbar((prev) => [...prev, { title: "", linkUrl: "" }]);
    };

    const handleNavbarMenuChange = (index, value) => {
    const updated = [...navbar];
    updated[index].title = value;
    setNavbar(updated);
    };

    const handleNavbarLinkUrlChange = (index, value) => {
    const updated = [...navbar];
    updated[index].linkUrl = value;
    setNavbar(updated);
    };


    const handleDiscard = () => {
    setNavbar([]);
    };

    const handleSave = () => {
    console.log({
        navbar,
    });
    };

    const handleDeleteNavbar = (index) => {
    const updated = [...navbar];
    updated.splice(index, 1);
    setNavbar(updated);
    };

    return (
    <>
    <div className="p-8 mx-auto">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          Navbar Section <span className="bg-[#2F6288] mt-4 max-w-xs h-1 block"></span>
        </h2>


        {navbar.map((navbar, index) => (
          <div key={index} className="mb-6 pt-4 relative">
            <button
              onClick={() => handleDeleteNavbar(index)}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
            >
              Delete
            </button>

            <label className="block font-semibold mb-1">Menu {index + 1}</label>
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="Enter menu title"
                    value={navbar.title}
                    onChange={(e) => handleNavbarMenuChange(index, e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <label className="block font-semibold mb-1">Link URL</label>
            <div className="relative mb-4">
                <input
                type="text"
                value={navbar.linkUrl}
                placeholder="https://example.com"
                onChange={(e) => handleNavbarLinkUrlChange(index, e.target.value)}
                className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        ))}



        <div
          onClick={handleAddNavbar}
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

export default NavbarSection