import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Trash2, GripVertical, Edit2 } from "lucide-react";

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
    <div ref={(node) => drag(ref(node))} className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-[#F5F5F5] mb-3 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
            <GripVertical className="text-gray-400 cursor-move w-5 h-5" />
            <div className="flex space-x-4">
                <img src={slide.thumbnail} alt="Slide Thumbnail" className="w-16 h-16 object-cover rounded mt-1" />
                <div className="flex flex-col">
                    <p className="font-semibold text-gray-800">{slide.title}</p>
                    <p className="text-sm text-gray-600">Link: /{slide.title.replace(/\s+/g, '-')}</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => editSlide(index)}
                className="text-[#2F6288]0 hover:text-blue-700 p-1"
                title="Edit Session Card"
            >
                <Edit2 className="w-4 h-4" />
            </button>
            <button 
                onClick={() => removeSlide(index)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete Session Card"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    </div>
);
}

export default function LiveSessionForm() {
  const [formData, setFormData] = useState({
    liveSessionCard: { 
      title: "", 
      category: "", 
      subCategory: "", 
      price: "",
      thumbnail: null,
      date: "",
      startTime: "",
      endTime: "",
      showDate: false,
      showTime: false
    },
    monthlySubscription: { price: "", discount: "", description: "" },
    oneTimePurchase: { price: "" },
    session: { description: "", images: [], videos: [] },
    liveSessionSlots: [{ title: "", link: "", date: "", startTime: "", endTime: "" }],
    slides: [],
  });

  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const categories = ["Yoga", "Meditation"];
  const subCategories = ["Online", "Offline"];

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
        handleFieldChange("liveSessionCard", "thumbnail", e.target.result);
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

  const handleSlotChange = (index, field, value) => {
    const updated = [...formData.liveSessionSlots];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, liveSessionSlots: updated }));
  };

  const addSessionSlot = () => {
    setFormData((prev) => ({
      ...prev,
      liveSessionSlots: [...prev.liveSessionSlots, { title: "", link: "", date: "", startTime: "", endTime: "" }],
    }));
  };

  const removeSessionSlot = (index) => {
    const updated = [...formData.liveSessionSlots];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, liveSessionSlots: updated }));
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
      liveSessionCard: {
        title: slideToEdit.title,
        category: slideToEdit.category,
        subCategory: slideToEdit.subCategory || "",
        price: slideToEdit.price,
        thumbnail: slideToEdit.thumbnail || null,
        date: slideToEdit.date || "",
        startTime: slideToEdit.startTime || "",
        endTime: slideToEdit.endTime || "",
        showDate: slideToEdit.showDate || false,
        showTime: slideToEdit.showTime || false,
      },
      monthlySubscription: {
        price: slideToEdit.monthlySubscription?.price || "",
        discount: slideToEdit.monthlySubscription?.discount || "",
        description: slideToEdit.monthlySubscription?.description || "",
      },
      oneTimePurchase: {
        price: slideToEdit.oneTimePurchase?.price || "",
      },
      session: {
        description: slideToEdit.session?.description || "",
        images: slideToEdit.session?.images || [],
        videos: slideToEdit.session?.videos || [],
      },
      liveSessionSlots: slideToEdit.liveSessionSlots?.length > 0 
        ? slideToEdit.liveSessionSlots 
        : [{ title: "", link: "", date: "", startTime: "", endTime: "" }],
    }));
    setIsEditing(true);
    setEditIndex(index);
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditIndex(null);
    setFormData((prev) => ({
      ...prev,
      liveSessionCard: {
        title: "", 
        category: "", 
        subCategory: "", 
        price: "",
        thumbnail: null,
        date: "",
        startTime: "",
        endTime: "",
        showDate: false,
        showTime: false
      },
      monthlySubscription: { price: "", discount: "", description: "" },
      oneTimePurchase: { price: "" },
      session: { description: "", images: [], videos: [] },
      liveSessionSlots: [{ title: "", link: "", date: "", startTime: "", endTime: "" }],
    }));
  };

  const addNewCategory = () => {
    const newCategory = prompt("Enter new category name:");
    if (newCategory && !categories.includes(newCategory)) {
      categories.push(newCategory);
    }
  };

  const addNewSubCategory = () => {
    const newSubCategory = prompt("Enter new sub-category name:");
    if (newSubCategory && !subCategories.includes(newSubCategory)) {
      subCategories.push(newSubCategory);
    }
  };

  const validateFields = () => {
    const newErrors = {};

    const isPriceValid = (value) => /^\d+(\.\d{1,2})?$/.test(value.trim());

    if (!formData.liveSessionCard.title) newErrors.title = "Title is required";
    if (!formData.liveSessionCard.category) newErrors.category = "Category required";
    if (!isPriceValid(formData.liveSessionCard.price)) newErrors.livePrice = "Invalid Price";

    if (!isPriceValid(formData.monthlySubscription.price)) newErrors.monthlyPrice = "Invalid Price";
    if (formData.monthlySubscription.discount && isNaN(formData.monthlySubscription.discount))
      newErrors.monthlyDiscount = "Discount must be number";

    if (!isPriceValid(formData.oneTimePurchase.price)) newErrors.oneTimePrice = "Invalid Price";

    formData.liveSessionSlots.forEach((slot, i) => {
      if (!slot.title || !slot.link || !slot.date) {
        newErrors[`slot_${i}`] = "Slot title, link, and date are required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSaveRetreat = () => {
    if (!validateFields()) {
      alert("Fix validation errors");
      return;
    }

    const newCard = {
      title: formData.liveSessionCard.title,
      price: formData.liveSessionCard.price,
      category: formData.liveSessionCard.category,
      subCategory: formData.liveSessionCard.subCategory,
      thumbnail: formData.liveSessionCard.thumbnail,
      date: formData.liveSessionCard.date,
      startTime: formData.liveSessionCard.startTime,
      endTime: formData.liveSessionCard.endTime,
      showDate: formData.liveSessionCard.showDate,
      showTime: formData.liveSessionCard.showTime,
      monthlySubscription: {
        price: formData.monthlySubscription.price,
        discount: formData.monthlySubscription.discount,
        description: formData.monthlySubscription.description,
      },
      oneTimePurchase: {
        price: formData.oneTimePurchase.price,
      },
      session: {
        description: formData.session.description,
        images: formData.session.images,
        videos: formData.session.videos,
      },
      liveSessionSlots: formData.liveSessionSlots,
    };

    let updatedSlides;
    
    if (isEditing && editIndex !== null) {
      // Update existing slide
      updatedSlides = [...formData.slides];
      updatedSlides[editIndex] = newCard;
      setIsEditing(false);
      setEditIndex(null);
      alert("Session Card Updated Successfully");
    } else {
      // Add new slide
      updatedSlides = [...formData.slides, newCard];
      alert("Session Card Added Successfully");
    }

    setFormData((prev) => ({
      ...prev,
      slides: updatedSlides,
      liveSessionCard: { 
        title: "", 
        category: "", 
        subCategory: "", 
        price: "",
        thumbnail: null,
        date: "",
        startTime: "",
        endTime: "",
        showDate: false,
        showTime: false
      },
      monthlySubscription: { price: "", discount: "", description: "" },
      oneTimePurchase: { price: "" },
      session: { description: "", images: [], videos: [] },
      liveSessionSlots: [{ title: "", link: "", date: "", startTime: "", endTime: "" }],
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 11 - formData.session.images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            session: {
              ...prev.session,
              images: [...prev.session.images, event.target.result]
            }
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      session: {
        ...prev.session,
        images: prev.session.images.filter((_, i) => i !== index)
      }
    }));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 6 - formData.session.videos.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            session: {
              ...prev.session,
              videos: [...prev.session.videos, event.target.result]
            }
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeVideo = (index) => {
    setFormData(prev => ({
      ...prev,
      session: {
        ...prev.session,
        videos: prev.session.videos.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:p-8 px-4 py-0 mx-auto">
        
        {/* Live Session Card */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-0">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
              {isEditing ? "Edit Live Session Card" : "Live Session Card"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
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
                onClick={() => document.getElementById('thumbnail-upload').click()}
            >
                {formData.liveSessionCard.thumbnail ? (
                <div className="relative h-full flex items-center">
                    <img 
                    src={formData.liveSessionCard.thumbnail} 
                    alt="Thumbnail" 
                    className="h-full object-contain rounded"
                    />
                    <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        handleFieldChange("liveSessionCard", "thumbnail", null)
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                    <X className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                <div className="text-center text-gray-500 text-sm flex flex-col items-center">
                    <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-12 h-12 mb-2" />
                    <p>{dragActive ? "Drop here..." : "Click to upload or drag and drop"}</p>
                    <p className="text-gray-400">Size: (487×387)px</p>
                </div>
                )}
                <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden" 
                id="thumbnail-upload"
                />
            </div>
            </div>


          {/* Title */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Title</label>
            <input
              placeholder="Enter Title"
              value={formData.liveSessionCard.title}
              onChange={(e) => handleFieldChange("liveSessionCard", "title", e.target.value)}
              className="w-full border p-3 rounded-lg text-sm"
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
                  onClick={() => handleFieldChange("liveSessionCard", "category", cat)}
                  className={`px-4 py-2 rounded-full border transition-colors text-sm ${
                    formData.liveSessionCard.category === cat
                      ? 'bg-[#2F6288] text-white border-[#2F6288]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={addNewCategory}
                className="px-4 py-2 text-sm rounded-full border border-gray-300 text-[#2F6288] hover:bg-[#2F6288] hover:text-white flex items-center gap-2"
              >
                Add New Category
              </button>
            </div>
            {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
          </div>

          {/* Sub-Category Selection */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Select Sub-Category</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {subCategories.map((subCat, index) => (
                <button
                  key={index}
                  onClick={() => handleFieldChange("liveSessionCard", "subCategory", subCat)}
                  className={`px-4 py-2 rounded-full border transition-colors text-sm ${
                    formData.liveSessionCard.subCategory === subCat
                      ? 'bg-[#2F6288] text-white border-[#2F6288]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]'
                  }`}
                >
                  {subCat}
                </button>
              ))}
              <button
                onClick={addNewSubCategory}
                className="px-4 text-sm py-2 rounded-full border border-gray-300 text-[#2F6288] hover:bg-[#2F6288] hover:text-white flex items-center gap-2"
              >
                Add New Category
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">Price</label>
            <input
              placeholder="Enter Price"
              type="number"
              value={formData.liveSessionCard.price}
              onChange={(e) => handleFieldChange("liveSessionCard", "price", e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg text-sm"
            />
            {errors.livePrice && <p className="text-red-500 text-sm mt-1">{errors.livePrice}</p>}
          </div>

          {/* Date */}
          <div className="mb-4">
            <label 
                htmlFor="live-session-date" 
                className="block text-md font-semibold text-gray-700 mb-2"
            >
                Date
            </label>
            
            <div className="flex items-center gap-3 mb-2">
                <div className="relative md:flex block w-full">
                <input
                    id="live-session-date"
                    type="date"
                    value={formData.liveSessionCard.date}
                    onChange={(e) =>
                    handleFieldChange("liveSessionCard", "date", e.target.value)
                    }
                    className={`w-full border border-gray-300 p-3 rounded-lg pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                    !formData.liveSessionCard.date ? 'text-transparent' : 'text-black'
                    }`}
                    aria-describedby="date-help-text"
                />
                
                {/* Custom placeholder text */}
                {!formData.liveSessionCard.date && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none z-5 text-sm">
                    Choose Date
                    </span>
                )}
                
                <div 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                    onClick={() => document.getElementById('live-session-date').showPicker?.()}
                >
                    <img
                    src="/assets/admin/calendar.svg"
                    alt="Open calendar"
                    className="w-5 h-5 text-gray-500 cursor-pointer"
                    />
                </div>
                </div>
            </div>
  
            <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                type="checkbox"
                checked={formData.liveSessionCard.showDate}
                onChange={(e) =>
                    handleFieldChange("liveSessionCard", "showDate", e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-describedby="show-date-help"
                />
                <span id="show-date-help">Check to display date publicly</span>
            </label>
          </div>

          <div className="mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-2">
                {/* Start Time */}
                <div>
                <label 
                    htmlFor="live-session-start-time" 
                    className="block text-md font-semibold text-gray-700 mb-2"
                >
                    Start Time
                </label>
                <div className="relative flex">
                    <input
                    id="live-session-start-time"
                    type="time"
                    value={formData.liveSessionCard.startTime}
                    onChange={(e) => handleFieldChange("liveSessionCard", "startTime", e.target.value)}
                    className={`w-full border border-gray-300 p-3 text-sm rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                        !formData.liveSessionCard.startTime ? 'text-transparent' : 'text-black'
                    }`}
                    aria-describedby="start-time-help-text"
                    />
                    
                    {/* Custom placeholder text */}
                    {!formData.liveSessionCard.startTime && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none z-5 text-sm">
                        Choose Start Time
                    </span>
                    )}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                    <img
                        src="/assets/admin/clock.svg"
                        alt="Open time picker"
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                    />
                    </div>
                </div>
                </div>

                {/* End Time */}
                <div>
                <label 
                    htmlFor="live-session-end-time" 
                    className="block text-md font-semibold text-gray-700 mb-2"
                >
                    End Time
                </label>
                <div className="relative flex">
                    <input
                    id="live-session-end-time"
                    type="time"
                    value={formData.liveSessionCard.endTime}
                    onChange={(e) => handleFieldChange("liveSessionCard", "endTime", e.target.value)}
                    className={`text-sm w-full border border-gray-300 p-3 rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                        !formData.liveSessionCard.endTime ? 'text-transparent' : 'text-black'
                    }`}
                    aria-describedby="end-time-help-text"
                    />
                    
                    {/* Custom placeholder text */}
                    {!formData.liveSessionCard.endTime && (
                    <span className="text-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none z-5">
                        Choose End Time
                    </span>
                    )}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                    <img
                        src="/assets/admin/clock.svg"
                        alt="Open time picker"
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                    />
                    </div>
                </div>
                </div>
            </div>
            
            <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                type="checkbox"
                checked={formData.liveSessionCard.showTime}
                onChange={(e) => handleFieldChange("liveSessionCard", "showTime", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-describedby="show-time-help"
                />
                <span id="show-time-help">Check to display start and end times publicly</span>
            </label>
            </div>
        </div>

        {/* Monthly Subscription */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Monthly Subscription" : "Monthly Subscription"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">Monthly Subscription Price</label>
              <input
                placeholder="Enter Price"
                type="number"
                value={formData.monthlySubscription.price}
                onChange={(e) => handleFieldChange("monthlySubscription", "price", e.target.value)}
                className="text-sm w-full border border-gray-300 p-3 rounded-lg "
              />
              {errors.monthlyPrice && <p className="text-red-500 text-sm mt-1">{errors.monthlyPrice}</p>}
            </div>

            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">Monthly Subscription Discount</label>
              <input
                type="number"
                placeholder="Enter Discount Percentage"
                value={formData.monthlySubscription.discount}
                onChange={(e) => handleFieldChange("monthlySubscription", "discount", e.target.value)}
                className="text-sm w-full border border-gray-300 p-3 rounded-lg "
              />
              {errors.monthlyDiscount && <p className="text-red-500 text-sm mt-1">{errors.monthlyDiscount}</p>}
            </div>

            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">Monthly Subscription Description</label>
              <textarea
                placeholder="Enter Description"
                value={formData.monthlySubscription.description}
                onChange={(e) => handleFieldChange("monthlySubscription", "description", e.target.value)}
                className="text-sm w-full border border-gray-300 p-3 rounded-lg  h-24 resize-none"
              />
            </div>
          </div>
        </div>

        {/* One Time Purchase */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit One Time Purchase" : "One Time Purchase"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">One TIme Purchase Per Month Price</label>
            <input
              placeholder="Enter Price"
              value={formData.oneTimePurchase.price}
              onChange={(e) => handleFieldChange("oneTimePurchase", "price", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.oneTimePrice && <p className="text-red-500 text-sm mt-1">{errors.oneTimePrice}</p>}
          </div>
        </div>

        {/* Session Description */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Session" : "Session"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">Session Description</label>
            <textarea
              placeholder="Enter Description"
              value={formData.session.description}
              onChange={(e) => handleFieldChange("session", "description", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg  h-32 resize-none"
            />
          </div>

          <label className="block font-semibold mb-2 text-md">Add Images ( Maximum 11 Images )</label>
            <div className="mb-6">
              {formData.session.images.length < 11 && (
                <label className="text-sm w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                  <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-10 h-10 mb-2" />
                  <span>Click to upload image<br />Size: (610 X 515)px</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                {formData.session.images.map((img, index) => (
                  <div key={index} className="relative w-40 h-28">
                    <img src={img} alt={`img-${index}`} className="w-full h-full object-cover rounded shadow" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
        
            <label className="block font-semibold mb-2 text-md">Add Videos ( Maximum 6 Videos )</label>
            <div className="mb-4">
              {formData.session.videos.length < 6 && (
                <label className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50">
                  <img src="/assets/admin/upload.svg" alt="Upload Icon" className="w-10 h-10 mb-2" />
                  <span>Click to upload Videos</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                {formData.session.videos.map((vid, index) => (
                  <div key={index} className="relative w-40 h-28 bg-black">
                    <video src={vid} controls className="w-full h-full rounded shadow object-cover" />
                    <button
                      onClick={() => removeVideo(index)}
                      className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
        </div>

        {/* Live Session Slots */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Live Session Slots" : "Live Session Slots"} <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="space-y-4">
            {formData.liveSessionSlots.map((slot, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-md text-gray-700">Slot {i + 1}</p>
                  {formData.liveSessionSlots.length > 1 && (
                    <button 
                      onClick={() => removeSessionSlot(i)} 
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <label className="block text-md font-semibold text-gray-700 mb-2">Title {i +1}</label>
                
                <input 
                  placeholder="Slot Title" 
                  value={slot.title} 
                  onChange={(e) => handleSlotChange(i, "title", e.target.value)} 
                  className="text-sm w-full border border-gray-300 p-3 rounded-lg " 
                />

                <label className="block text-md font-semibold text-gray-700 mb-2">Zoom Meeting Link</label>
                
                <input 
                  placeholder="Zoom Link" 
                  value={slot.link} 
                  onChange={(e) => handleSlotChange(i, "link", e.target.value)} 
                  className="text-sm w-full border border-gray-300 p-3 rounded-lg " 
                />

                <label className="block text-md font-semibold text-gray-700 mb-2">Prefered Date</label>
                
                <input 
                  type="date" 
                  value={slot.date} 
                  onChange={(e) => handleSlotChange(i, "date", e.target.value)} 
                  className="sm:flex block w-full border border-gray-300 p-3 rounded-lg text-sm " 
                />
                
                <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">Start Time</label>  
                  <input 
                    type="time" 
                    value={slot.startTime} 
                    onChange={(e) => handleSlotChange(i, "startTime", e.target.value)} 
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg " 
                  />
                </div>
                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">End Time</label>  
                  <input 
                    type="time" 
                    value={slot.endTime} 
                    onChange={(e) => handleSlotChange(i, "endTime", e.target.value)} 
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg " 
                  />
                </div>
                </div>
                
                {errors[`slot_${i}`] && <p className="text-red-500 text-sm">{errors[`slot_${i}`]}</p>}
              </div>
            ))}
            
            <button 
              onClick={addSessionSlot} 
              className="text-sm w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Add New Slot
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={onSaveRetreat} 
            className="text-sm flex p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg transition-colors"
          >
            {isEditing ? "Update Live Session" : "Add Live Session"}
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

        {/* Current Live Sessions */}
        {formData.slides.length > 0 && (
          <div className="mt-8">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">Current Live Sessions <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span></h2>
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

        
      </div>
    </div>
  );
}