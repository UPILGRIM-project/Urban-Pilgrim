import { useState } from "react";


function TestimonialsEdit() {
    const [testimonial, setTestimonial] = useState([]);

    const handleAddTestimonial = () => {
    setTestimonial((prev) => [...prev, { name: "", shortdesignation: "", quotedText: "", image: null }]);
    };

    const handleTestimonialNameChange = (index, value) => {
    const updated = [...testimonial];
    updated[index].name = value;
    setTestimonial(updated);
    };

    const handleTestimonialShortDesignationChange = (index, value) => {
    const updated = [...testimonial];
    updated[index].shortdesignation = value;
    setTestimonial(updated);
    };

    const handleTestimonialQuotedTextChange = (index, value) => {
    const updated = [...testimonial];
    updated[index].quotedText = value;
    setTestimonial(updated);
    };

    const handleTestimonialImageChange = (index, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...testimonial];
      updated[index].image = reader.result;
      setPrograms(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleTestimonialImageRemove = (index) => {
    const updated = [...testimonial];
    updated[index].image = null;
    setPrograms(updated);
  };


    const handleDiscard = () => {
    setTestimonial([]);
    };

    const handleSave = () => {
    console.log({
        testimonial,
    });
    };

    const handleDeleteTestimonial = (index) => {
    const updated = [...testimonial];
    updated.splice(index, 1);
    setTestimonial(updated);
    };

    return (
    <>
    <div className="p-8 mx-auto">
        <h2 className="text-3xl text-[#2F6288] font-bold mb-6">
          Testimonial Edits <span className="bg-[#2F6288] mt-4 max-w-xs h-1 block"></span>
        </h2>


        {testimonial.map((testimonial, index) => (
          <div key={index} className="mb-6 pt-4 relative">
            <button
              onClick={() => handleDeleteTestimonial(index)}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold text-sm"
            >
              Delete
            </button>

            <label className="block font-semibold mb-2">Person {index + 1}</label>
            <label className="block font-semibold mb-1">Name</label>
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="Enter name"
                    value={testimonial.name}
                    onChange={(e) => handleTestimonialNameChange(index, e.target.value)}
                    className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <label className="block font-semibold mb-1">Short Designation</label>
            <div className="relative mb-4">
                <input
                type="text"
                value={testimonial.shortdesignation}
                placeholder="General Manager"
                onChange={(e) => handleTestimonialShortDesignationChange(index, e.target.value)}
                className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <label className="block font-semibold mb-1">Quoted Text</label>
            <div className="relative mb-4">
                <input
                type="text"
                value={testimonial.quotedText}
                placeholder="Enter quoted text here"
                onChange={(e) => handleTestimonialQuotedTextChange(index, e.target.value)}
                className="w-full border rounded p-2 pr-10"
                />
                <img src="/assets/admin/edit.svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {testimonial.image ? (
                <div className="relative inline-block mb-4">
                    <img
                    src={testimonial.image}
                    alt="Preview"
                    className="w-64 h-auto object-cover rounded shadow"
                    />
                    <button
                    onClick={() => handleTestimonialImageRemove(index)}
                    className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                    >
                    <FaTimes size={14} />
                    </button>
                </div>
                ) : (
                <div className="mb-4">
                    <label className="block font-semibold mb-1">Add Photo</label>
                    <label
                    htmlFor={`testimonial-upload-${index}`}
                    className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                    >
                    <img
                        src="/assets/admin/upload.svg"
                        alt="Upload Icon"
                        className="w-12 h-12 mb-2"
                    />
                    <span>Click to upload</span>
                    <span>Ratio: 1:1</span>
                    <input
                        id={`testimonial-upload-${index}`}
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
          onClick={handleAddTestimonial}
          className="w-full text-center my-4 bg-[#2F6288] text-white py-2 rounded-md cursor-pointer hover:bg-[#224b66]"
        >
          Add Testimonial
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

export default TestimonialsEdit