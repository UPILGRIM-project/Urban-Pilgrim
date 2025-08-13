import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Plus , Trash2, GripVertical, Edit2 } from "lucide-react";

const ItemType = "SLIDE";

function SlideItem({ slide, index, moveSlide, removeSlide, editSlide }) {
  const [, ref] = useDrop({
    accept: ItemType,
    hover: (item) => {
      if (item.index !== index) {
        moveSlide(item.index, index);
        item.index = index;
      }
    },
  });

  const [, drag] = useDrag({
    type: ItemType,
    item: { index },
  });

  return (
    <div ref={(node) => drag(ref(node))} className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-white mb-3 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <GripVertical className="text-gray-400 cursor-move w-5 h-5" />
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{slide.title}</p>
          
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => editSlide(index)}
          className="text-[#2F6288] hover:text-blue-700 p-1"
          title="Edit Program Card"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => removeSlide(index)}
          className="text-red-500 hover:text-red-700 p-1"
          title="Delete Program Card"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function RecordedProgramForm() {
  const [formData, setFormData] = useState({
    recordedProgramCard: { 
      title: "", 
      category: "", 
      price: "",
      thumbnail: null,
      days: "",
      videos: "",
      totalprice: "",
      description: ""
    },
    faqs: [{ title: "", description: "" }],
    recordedProgramPrograms: [{ title: "", description: "" }],
    guide: [{ title: "", description: "", image: null }],
    slides: [],
  });

  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const categories = ["Yoga", "Meditation"];

  const handleFieldChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleFieldChange("recordedProgramCard", "thumbnail", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleScheduleChange = (index, field, value) => {
    const updated = [...formData.recordedProgramPrograms];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, recordedProgramPrograms: updated }));
  };

  const addProgramSchedule = () => {
    setFormData((prev) => ({
      ...prev,
      recordedProgramPrograms: [...prev.recordedProgramPrograms, { title: "", description: "" }],
    }));
  };

  const removeProgramSchedule = (index) => {
    const updated = [...formData.recordedProgramPrograms];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, recordedProgramPrograms: updated }));
  };

  const handleFaqChange = (index, field, value) => {
    const updated = [...formData.faqs];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, faqs: updated }));
  };

  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { title: "", description: "" }],
    }));
  };

  const removeFaq = (index) => {
    const updated = [...formData.faqs];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, faqs: updated }));
  };

  const moveSlide = (from, to) => {
    const updated = [...formData.slides];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setFormData((prev) => ({ ...prev, slides: updated }));
  };

  const removeSlide = (index) => {
    const updated = [...formData.slides];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, slides: updated }));
  };

  const editSlide = (index) => {
    const slideToEdit = formData.slides[index];
    setFormData((prev) => ({
      ...prev,
      recordedProgramCard: {
        title: slideToEdit.title,
        category: slideToEdit.category,
        price: slideToEdit.price,
        thumbnail: slideToEdit.thumbnail || null,
        days: slideToEdit.days || "",
        videos: slideToEdit.videos || "",
        totalprice: slideToEdit.totalprice || "",
        description: slideToEdit.description || "",
      },
      faqs: slideToEdit.faqs?.length > 0 
        ? slideToEdit.faqs 
        : [{ title: "", description: "" }],
      recordedProgramPrograms: slideToEdit.recordedProgramPrograms?.length > 0 
        ? slideToEdit.recordedProgramPrograms 
        : [{ title: "", description: "" }],
      guide: slideToEdit.guide?.length > 0
        ? slideToEdit.guide
        : [{ title: "", description: "", image: null }],
    }));
    setIsEditing(true);
    setEditIndex(index);
    document.getElementById("recorded").scrollIntoView({ behavior: "smooth" });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditIndex(null);
    setFormData((prev) => ({
      ...prev,
      recordedProgramCard: {
        title: "", 
        category: "", 
        price: "",
        thumbnail: null,
        days: "",
        videos: "",
        totalprice: "",
        description: "",
      },
      faqs: [{ title: "", description: "" }],
      recordedProgramPrograms: [{ title: "", description: "" }],
      guide: [{ title: "", description: "", image: null }],
    }));
  };

  const addNewCategory = () => {
    const newCategory = prompt("Enter new category name:");
    if (newCategory && !categories.includes(newCategory)) {
      categories.push(newCategory);
    }
  };

  const validateFields = () => {
    const newErrors = {};

    const isPriceValid = (value) => /^\d+(\.\d{1,2})?$/.test(value.trim());

    if (!formData.recordedProgramCard.title) newErrors.title = "Title is required";
    if (!formData.recordedProgramCard.category) newErrors.category = "Category required";
    if (!isPriceValid(formData.recordedProgramCard.price)) newErrors.recordedPrice = "Invalid Price";
    if (!formData.recordedProgramCard.days || isNaN(formData.recordedProgramCard.days)) newErrors.days = "Number of days is required";
    if (!formData.recordedProgramCard.videos || isNaN(formData.recordedProgramCard.videos)) newErrors.videos = "Number of videos is required";
    if (!isPriceValid(formData.recordedProgramCard.totalprice)) newErrors.totalprice = "Invalid Total Price";

    formData.faqs.forEach((faq, i) => {
      if (!faq.title || !faq.description) {
        newErrors[`faq_${i}`] = "FAQ title and description are required";
      }
    });

    formData.recordedProgramPrograms.forEach((slot, i) => {
      if (!slot.title || !slot.description) {
        newErrors[`slot_${i}`] = "Schedule title and description are required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSaveRecorded = () => {
    if (!validateFields()) {
      alert("Fix validation errors");
      return;
    }

    const newCard = {
      title: formData.recordedProgramCard.title,
      price: formData.recordedProgramCard.price,
      category: formData.recordedProgramCard.category,
      thumbnail: formData.recordedProgramCard.thumbnail,
      days: formData.recordedProgramCard.days,
      videos: formData.recordedProgramCard.videos,
      totalprice: formData.recordedProgramCard.totalprice,
      description: formData.recordedProgramCard.description,
      faqs: formData.faqs,
      recordedProgramPrograms: formData.recordedProgramPrograms,
      guide: formData.guide,
    };

    let updatedSlides;
    
    if (isEditing && editIndex !== null) {
      updatedSlides = [...formData.slides];
      updatedSlides[editIndex] = newCard;
      setIsEditing(false);
      setEditIndex(null);
      alert("Program Card Updated Successfully");
    } else {
      updatedSlides = [...formData.slides, newCard];
      alert("Program Card Added Successfully");
    }

    setFormData((prev) => ({
      ...prev,
      slides: updatedSlides,
      recordedProgramCard: { 
        title: "", 
        category: "", 
        price: "",
        thumbnail: null,
        days: "",
        videos: "",
        totalprice: "",
        description: "",
      },
      faqs: [{ title: "", description: "" }],
      recordedProgramPrograms: [{ title: "", description: "" }],
      guide: [{ title: "", description: "", image: null }],
    }));
  };

  const handleGuideChange = (field, value) => {
    const updatedGuide = [...formData.guide];
    updatedGuide[0][field] = value;
    setFormData(prev => ({
      ...prev,
      guide: updatedGuide
    }));
  };

  const handleGuideImageChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleGuideChange("image", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuideImageRemove = () => {
    handleGuideChange("image", null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:p-8 px-4 py-0 mx-auto" id="recorded">
        
        {/* Recorded Program Card */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-0">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
              {isEditing ? "Edit Recorded Program Card" : "Recorded Program Card"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>
            {isEditing && (
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Edit
              </button>
            )}
          </div>
          <div className="mb-6">
            <h3 className="block text-md font-semibold text-gray-700 mb-2">Add Thumbnail</h3>
            <div
                className={`border-2 border-dashed h-40 rounded mb-4 flex items-center justify-center cursor-pointer transition-colors ${
                dragActive ? 'border-[#2F6288] bg-[#2F6288]' : 'border-gray-300 hover:bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('thumbnail-recorded-upload').click()}
            >
                {formData.recordedProgramCard.thumbnail ? (
                <div className="relative h-full flex items-center">
                    <img 
                    src={formData.recordedProgramCard.thumbnail} 
                    alt="Thumbnail" 
                    className="h-full object-contain rounded"
                    />
                    <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        handleFieldChange("recordedProgramCard", "thumbnail", null)
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                    <X className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                <div className="text-center text-gray-500 flex flex-col items-center">
                    <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                    <p>{dragActive ? "Drop here..." : "Click to upload or drag and drop"}</p>
                    <p className="text-sm text-gray-400">Size: (487×387)px</p>
                </div>
                )}
                <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden" 
                id="thumbnail-recorded-upload"
                />
            </div>
            </div>


          {/* Title */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Title</label>
            <input
              placeholder="Enter Title"
              value={formData.recordedProgramCard.title}
              onChange={(e) => handleFieldChange("recordedProgramCard", "title", e.target.value)}
              className="text-sm w-full border p-3 rounded-lg"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Category Selection */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Select Category</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {categories.map((cat, index) => (
                <button
                  key={index}
                  onClick={() => handleFieldChange("recordedProgramCard", "category", cat)}
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    formData.recordedProgramCard.category === cat
                      ? 'bg-[#2F6288] text-white border-[#2F6288]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={addNewCategory}
                className="text-sm px-4 py-2 rounded-full border border-gray-300 text-[#2F6288] hover:bg-[#2F6288] hover:text-white flex items-center gap-2"
              >               
                Add New Category
              </button>
            </div>
            {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Price</label>
            <input
              placeholder="Enter Price"
              type="number"
              value={formData.recordedProgramCard.price}
              onChange={(e) => handleFieldChange("recordedProgramCard", "price", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.recordedPrice && <p className="text-red-500 text-sm mt-1">{errors.recordedPrice}</p>}
          </div>

          {/* Number of days */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Number of Days</label>
            <input
              placeholder="Enter Number"
              type="number"
              value={formData.recordedProgramCard.days}
              onChange={(e) => handleFieldChange("recordedProgramCard", "days", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days}</p>}
          </div>

          {/* Number of Videos */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Number of videos</label>
            <input
              placeholder="Enter Number"
              type="number"
              value={formData.recordedProgramCard.videos}
              onChange={(e) => handleFieldChange("recordedProgramCard", "videos", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.videos && <p className="text-red-500 text-sm mt-1">{errors.videos}</p>}
          </div>

          {/* Total Price */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Total Price</label>
            <input
              placeholder="Enter Total Price"
              type="number"
              value={formData.recordedProgramCard.totalprice}
              onChange={(e) => handleFieldChange("recordedProgramCard", "totalprice", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.totalprice && <p className="text-red-500 text-sm mt-1">{errors.totalprice}</p>}
          </div>

          {/* Program Description */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Program Description</label>
            <textarea
              placeholder="Enter Program Description"
              type="text"
              rows={4}
              value={formData.recordedProgramCard.description}
              onChange={(e) => handleFieldChange("recordedProgramCard", "description", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
          </div>
        </div>

        {/* Program Schedule */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Program Schedule" : "Program Schedule"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="space-y-4 relative">
            {formData.recordedProgramPrograms.map((schedule, i) => (
              <div key={i} className="space-y-4">
                <div className="absolute right-0 justify-end items-center">
                  {formData.recordedProgramPrograms.length > 1 && (
                    <button 
                      onClick={() => removeProgramSchedule(i)} 
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">Day {i+1}</label>
                  <input 
                    placeholder="Enter Title" 
                    value={schedule.title} 
                    onChange={(e) => handleScheduleChange(i, "title", e.target.value)} 
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg " 
                  />
                </div>

                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter Description"
                    rows={4}
                    value={schedule.description}
                    onChange={(e) => handleScheduleChange(i, "description", e.target.value)}
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                  />
                </div>

                {errors[`slot_${i}`] && <p className="text-red-500 text-sm">{errors[`slot_${i}`]}</p>}
              </div>
            ))}
            
            <button 
              onClick={addProgramSchedule} 
              className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg  transition-colors flex items-center justify-center gap-2"
            >
              Add New Program
            </button>
          </div>
        </div>

        {/* FAQS */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit FAQS" : "FAQS"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="relative space-y-4">
            {formData.faqs.map((faq, i) => (
              <div key={i} className="space-y-4">
                <div className="absolute right-0 justify-between items-center">
                  {formData.faqs.length > 1 && (
                    <button 
                      onClick={() => removeFaq(i)} 
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">FAQ Title</label>
                  <input
                    placeholder="Enter FAQ Title"
                    value={faq.title}
                    onChange={(e) => handleFaqChange(i, "title", e.target.value)}
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                  />
                </div>

                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Enter FAQ Description"
                    value={faq.description}
                    onChange={(e) => handleFaqChange(i, "description", e.target.value)}
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                  />
                </div>

                {errors[`faq_${i}`] && <p className="text-red-500 text-sm">{errors[`faq_${i}`]}</p>}
              </div>
            ))}
            
            <button 
              onClick={addFaq} 
              className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg  transition-colors flex items-center justify-center gap-2"
            >
              
              Add New FAQ
            </button>
          </div>
        </div>

        {/* Meet Your Pilgrim Guide */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Meet Your Pilgrim Guide" : "Meet Your Pilgrim Guide"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          <div className="mb-6 pt-4 relative flex flex-col space-y-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Add Photo</label>
            {formData.guide[0].image ? (
              <div className="relative inline-block mb-4">
                <img
                  src={formData.guide[0].image}
                  alt="Preview"
                  className="w-64 h-auto object-contain rounded shadow"
                />
                <button
                  onClick={handleGuideImageRemove}
                  className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <label
                  htmlFor="guide-upload"
                  className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                >
                  <img
                    src="/assets/admin/upload.svg"
                    alt="Upload Icon"
                    className="w-12 h-12 mb-2"
                  />
                  <span>Click to upload image</span>
                  <span className="text-sm text-gray-400">Size: (402×453)px</span>
                  <input
                    id="guide-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleGuideImageChange(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <label className="block text-md font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.guide[0].title}
              placeholder="Enter title"
              onChange={(e) => handleGuideChange("title", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />

            <label className="block text-md font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={formData.guide[0].description}
              placeholder="Enter description"
              onChange={(e) => handleGuideChange("description", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>
        </div>

        {/* Current Recorded Sessions */}
        {formData.slides.length > 0 && (
          <div className="mb-8">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">Current Recorded Sessions <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span></h2>
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-3">
                {formData.slides.map((slide, index) => (
                  <SlideItem 
                    key={index} 
                    index={index} 
                    slide={slide} 
                    moveSlide={moveSlide} 
                    removeSlide={removeSlide}
                    editSlide={editSlide}
                  />
                ))}
              </div>
            </DndProvider>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-4">
          <button 
            onClick={onSaveRecorded} 
            className="text-sm flex p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
          >
            {isEditing ? "Update Recorded Session" : "Add Recorded Session"}
          </button>
          {isEditing && (
            <button 
              onClick={cancelEdit}
              className="text-sm px-8 py-4 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}