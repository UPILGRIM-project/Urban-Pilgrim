import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Plus, Edit2 } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { showSuccess, showError } from "../../../utils/toast";
import {
  setThumbnailUploadProgress,
  setThumbnailUploading,
  setImageUploadProgress,
  setImageUploading,
  setVideoUploadProgress,
  setVideoUploading,
  setGuideUploadProgress,
  setGuideUploading,
  setSaving,
  addWorkshop,
  updateWorkshop,
  clearUploadStates,
  setCurrentWorkshop,
  clearCurrentWorkshop,
} from "../../../features/workshopsSlice";
import {
  createWorkshop,
  updateWorkshop as updateWorkshopService,
  uploadFile,
  saveWorkshopOrganizerData,
} from "../../../services/workshopService";
import RichTextEditor from "../../common/RichTextEditor";
import ImageEditor from "../../common/ImageEditor";

export default function WorkshopForm() {
  const [formData, setFormData] = useState({
    // Workshop Card Details
    thumbnail: "",
    thumbnailType: null,
    title: "",
    description: "",
    price: "",
    gst: "",
    extraPersonPrice: "",
    variants: [{ name: "" }],
    listingType: "Listing", // Default to "Listing"

    // Session Details
    minPerson: "",
    maxPerson: "",
    sessionDescription: "",
    sessionTopics: [{ title: "", description: "" }],

    // Media
    images: [],
    videos: [],

    // Guide Details
    guide: [
      {
        name: "",
        email: "",
        number: "",
        image: "",
        title: "",
        description: "",
      },
    ],
  });

  const dispatch = useDispatch();
  const { currentWorkshop, uploadProgress, uploading, saving } = useSelector(
    (state) => state.workshops,
  );

  const [isEditing, setIsEditing] = useState(false);

  // Image Editor States
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingImageType, setEditingImageType] = useState(null); // 'thumbnail', 'guide', 'image'
  const [editingImageIndex, setEditingImageIndex] = useState(null); // for image arrays
  const [isSavingEditedImage, setIsSavingEditedImage] = useState(false);

  // Initialize form with current workshop data if editing
  useEffect(() => {
    if (currentWorkshop) {
      setFormData(currentWorkshop);
      setIsEditing(true);
    }
  }, [currentWorkshop]);

  // Handle field changes
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle variant changes
  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      variants: updatedVariants,
    }));
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: "" }],
    }));
  };

  const removeVariant = (index) => {
    if (formData.variants.length > 1) {
      const updatedVariants = formData.variants.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        variants: updatedVariants,
      }));
    }
  };

  // Handle session topics
  const handleTopicChange = (index, field, value) => {
    const updatedTopics = [...formData.sessionTopics];
    updatedTopics[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      sessionTopics: updatedTopics,
    }));
  };

  const addTopic = () => {
    setFormData((prev) => ({
      ...prev,
      sessionTopics: [...prev.sessionTopics, { title: "", description: "" }],
    }));
  };

  const removeTopic = (index) => {
    if (formData.sessionTopics.length > 1) {
      const updatedTopics = formData.sessionTopics.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({
        ...prev,
        sessionTopics: updatedTopics,
      }));
    }
  };

  // Handle guide changes
  const handleGuideChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      guide: [
        {
          ...prev.guide[0],
          [field]: value,
        },
      ],
    }));
  };

  // Helper function to generate unique upload ID
  const generateUploadId = () =>
    `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle thumbnail upload
  const handleThumbnailChange = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showError("Please upload an image or video file");
      return;
    }

    dispatch(setThumbnailUploading(true));
    dispatch(setThumbnailUploadProgress(0));

    try {
      const timestamp = Date.now();
      const path = `workshops/thumbnails/${timestamp}_${file.name}`;

      const downloadURL = await uploadFile(file, path, (progress) => {
        dispatch(setThumbnailUploadProgress(progress));
      });

      handleFieldChange("thumbnail", downloadURL);
      handleFieldChange("thumbnailType", file.type);
      showSuccess("Thumbnail uploaded successfully!");
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      showError("Failed to upload thumbnail");
    } finally {
      dispatch(setThumbnailUploading(false));
      dispatch(setThumbnailUploadProgress(0));
    }
  };

  // Handle multiple images upload (max 5)
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    const currentImages = formData.images.length;
    const maxImages = 5;
    const availableSlots = maxImages - currentImages;

    if (availableSlots <= 0) {
      showError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);

    if (filesToUpload.length < files.length) {
      showError(
        `Only uploading ${filesToUpload.length} images. Maximum ${maxImages} images allowed.`,
      );
    }

    const uploadPromises = filesToUpload.map(async (file, index) => {
      const uploadId = generateUploadId();
      dispatch(setImageUploading({ uploadId, status: true }));
      dispatch(setImageUploadProgress({ uploadId, progress: 0 }));

      try {
        const timestamp = Date.now();
        const path = `workshops/images/${timestamp}_${index}_${file.name}`;

        const downloadURL = await uploadFile(file, path, (progress) => {
          dispatch(setImageUploadProgress({ uploadId, progress }));
        });

        dispatch(setImageUploading({ uploadId, status: false }));
        return downloadURL;
      } catch (error) {
        console.error("Image upload error:", error);
        dispatch(setImageUploading({ uploadId, status: false }));
        throw error;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      showSuccess(`${uploadedUrls.length} image(s) uploaded successfully!`);
    } catch (error) {
      showError("Some images failed to upload");
    }
  };

  // Handle multiple videos upload (max 6)
  const handleVideoUpload = async (files) => {
    if (!files || files.length === 0) return;

    const currentVideos = formData.videos.length;
    const maxVideos = 6;
    const availableSlots = maxVideos - currentVideos;

    if (availableSlots <= 0) {
      showError(`Maximum ${maxVideos} videos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);

    if (filesToUpload.length < files.length) {
      showError(
        `Only uploading ${filesToUpload.length} videos. Maximum ${maxVideos} videos allowed.`,
      );
    }

    const uploadPromises = filesToUpload.map(async (file, index) => {
      const uploadId = generateUploadId();
      dispatch(setVideoUploading({ uploadId, status: true }));
      dispatch(setVideoUploadProgress({ uploadId, progress: 0 }));

      try {
        const timestamp = Date.now();
        const path = `workshops/videos/${timestamp}_${index}_${file.name}`;

        const downloadURL = await uploadFile(file, path, (progress) => {
          dispatch(setVideoUploadProgress({ uploadId, progress }));
        });

        dispatch(setVideoUploading({ uploadId, status: false }));
        return { url: downloadURL, name: file.name };
      } catch (error) {
        console.error("Video upload error:", error);
        dispatch(setVideoUploading({ uploadId, status: false }));
        throw error;
      }
    });

    try {
      const uploadedVideos = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        videos: [...prev.videos, ...uploadedVideos],
      }));
      showSuccess(`${uploadedVideos.length} video(s) uploaded successfully!`);
    } catch (error) {
      showError("Some videos failed to upload");
    }
  };

  // Handle guide image upload
  const handleGuideImageChange = async (file) => {
    if (!file) return;

    dispatch(setGuideUploading(true));
    dispatch(setGuideUploadProgress(0));

    try {
      const timestamp = Date.now();
      const path = `workshops/guides/${timestamp}_${file.name}`;

      const downloadURL = await uploadFile(file, path, (progress) => {
        dispatch(setGuideUploadProgress(progress));
      });

      handleGuideChange("image", downloadURL);
      showSuccess("Guide image uploaded successfully!");
    } catch (error) {
      console.error("Guide image upload error:", error);
      showError("Failed to upload guide image");
    } finally {
      dispatch(setGuideUploading(false));
      dispatch(setGuideUploadProgress(0));
    }
  };

  const handleGuideImageRemove = () => {
    handleGuideChange("image", "");
  };

  // Image Editor Handlers
  const openImageEditor = (imageUrl, type, index = null) => {
    setEditingImage(imageUrl);
    setEditingImageType(type);
    setEditingImageIndex(index);
    setIsImageEditorOpen(true);
  };

  const handleImageEditorCancel = () => {
    setIsImageEditorOpen(false);
    setEditingImage(null);
    setEditingImageType(null);
    setEditingImageIndex(null);
  };

  const handleImageEditorSave = async (editedFile) => {
    try {
      setIsSavingEditedImage(true);
      setIsImageEditorOpen(false);

      // Upload the edited image to Firebase
      const timestamp = Date.now();
      const path = `workshops/edited/${timestamp}_${editedFile.name}`;

      const downloadURL = await uploadFile(editedFile, path, (progress) => {
        console.log(`Upload is ${progress}% done`);
      });

      // Update the appropriate field based on type
      if (editingImageType === "thumbnail") {
        handleFieldChange("thumbnail", downloadURL);
        handleFieldChange("thumbnailType", editedFile.type);
      } else if (editingImageType === "guide") {
        handleGuideChange("image", downloadURL);
      } else if (editingImageType === "image") {
        const updatedImages = [...formData.images];
        updatedImages[editingImageIndex] = downloadURL;
        handleFieldChange("images", updatedImages);
      }

      setIsSavingEditedImage(false);
      handleImageEditorCancel();
      showSuccess("Image updated successfully!");
    } catch (error) {
      console.error("Error in handleImageEditorSave:", error);
      setIsSavingEditedImage(false);
      showError("Error saving edited image. Please try again.");
    }
  };

  // Save workshop to Firestore
  const onSaveWorkshop = async () => {
    if (!formData.title.trim()) {
      showError("Workshop title is required");
      return;
    }

    if (!formData.thumbnail) {
      showError("Workshop thumbnail is required");
      return;
    }

    // Validate organizer email and phone number (compulsory for new workshops)
    if (!isEditing) {
      if (
        !formData.guide?.[0]?.email ||
        formData.guide[0].email.trim() === ""
      ) {
        showError("Organizer email is required!");
        return;
      }
      if (
        !formData.guide?.[0]?.number ||
        formData.guide[0].number.trim() === ""
      ) {
        showError("Organizer phone number is required!");
        return;
      }
    }

    dispatch(setSaving(true));

    try {
      // Save organizer data to root organizers collection (for both new and edit)
      // Helper function to clean undefined/null values from objects
      const cleanUndefined = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(cleanUndefined);
        } else if (obj !== null && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([_, v]) => v !== undefined && v !== null && v !== "")
              .map(([k, v]) => [k, cleanUndefined(v)]),
          );
        }
        return obj;
      };

      const rawProgramData = {
        title: formData?.title || "",
        price: formData?.price || "",
        extraPersonPrice: formData?.extraPersonPrice || "",
        minPerson: formData?.minPerson || "",
        maxPerson: formData?.maxPerson || "",
        variants: formData?.variants || [],
        sessionDescription: formData?.sessionDescription || "",
        sessionTopics: formData?.sessionTopics || [],
      };

      // Remove undefined/null/empty fields to prevent Firestore error
      const programData = cleanUndefined(rawProgramData);

      const organizerData = {
        name: formData.guide[0].name,
        email: formData.guide[0].email,
        number: formData.guide[0].number,
        programData: programData,
      };

      await saveWorkshopOrganizerData(organizerData);

      if (isEditing && currentWorkshop?.id) {
        // Update existing workshop
        const updatedWorkshop = await updateWorkshopService(
          currentWorkshop.id,
          formData,
        );
        dispatch(updateWorkshop(updatedWorkshop));
        showSuccess("Workshop updated successfully!");
        setIsEditing(false);
        resetForm();
      } else {
        // Create new workshop
        const newWorkshop = await createWorkshop(formData);
        dispatch(addWorkshop(newWorkshop));
        showSuccess("Workshop created successfully!");
        resetForm();
      }
    } catch (error) {
      console.error("Save workshop error:", error);
      showError(`Failed to save workshop: ${error.message}`);
    } finally {
      dispatch(setSaving(false));
    }
  };

  const resetForm = () => {
    setFormData({
      thumbnail: "",
      thumbnailType: null,
      title: "",
      description: "",
      price: "",
      gst: "",
      extraPersonPrice: "",
      variants: [{ name: "" }],
      minPerson: "",
      maxPerson: "",
      sessionDescription: "",
      sessionTopics: [{ title: "", description: "" }],
      images: [],
      videos: [],
      guide: [
        {
          name: "",
          email: "",
          number: "",
          image: "",
          title: "",
          description: "",
        },
      ],
    });
    setIsEditing(false);
    dispatch(clearCurrentWorkshop());
    dispatch(clearUploadStates());
  };

  return (
    <div className="p-6 mx-auto">
      {/* Workshop Card Section */}
      <div className="mb-8">
        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
          Workshop Card Details{" "}
          <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
        </h2>

        {/* Details */}
        <div className="mb-6 pt-4 relative flex flex-col space-y-4">
          {/* Thumbnail Upload */}
          <label className="block text-md font-semibold text-gray-700 mb-2">
            Workshop Thumbnail (Image or Video)
          </label>
          {formData.thumbnail ? (
            <div className="relative inline-block mb-4">
              {formData?.thumbnailType &&
              formData?.thumbnailType.startsWith("video/") ? (
                // Video thumbnail
                <>
                  <video
                    src={formData.thumbnail}
                    controls
                    className="w-64 h-auto object-contain rounded shadow"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange("thumbnail", "");
                      handleFieldChange("thumbnailType", null);
                    }}
                    className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                // Image thumbnail
                <>
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail Preview"
                    className="w-64 h-auto object-contain rounded shadow"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageEditor(formData.thumbnail, "thumbnail");
                    }}
                    className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                    title="Edit Image - Resize, Crop, Rotate"
                  >
                    <Edit2 size={16} />
                    <span className="text-xs font-semibold">Edit Size</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange("thumbnail", "");
                      handleFieldChange("thumbnailType", null);
                    }}
                    className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          ) : uploading.thumbnail ? (
            <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
              <div className="text-center flex flex-col items-center">
                <div className="relative w-12 h-12 mb-3">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div
                    className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                    style={{
                      background: `conic-gradient(from 0deg, #2F6288 ${uploadProgress.thumbnail * 3.6}deg, transparent ${uploadProgress.thumbnail * 3.6}deg)`,
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#2F6288]">
                      {uploadProgress.thumbnail}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#2F6288] font-medium">
                  Uploading Media...
                </p>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.thumbnail}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label
                htmlFor="thumbnail-upload"
                className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
              >
                <img
                  src="/assets/admin/upload.svg"
                  alt="Upload Icon"
                  className="w-10 h-10 mb-2"
                />
                <span>
                  Click to upload image or video
                  <br />
                  Images: JPG, PNG, GIF | Videos: MP4, MOV, AVI
                </span>
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleThumbnailChange(e.target.files[0])}
                  className="hidden"
                  disabled={uploading.thumbnail}
                />
              </label>
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Workshop Title
            </label>
            <input
              type="text"
              value={formData.title}
              placeholder="Enter workshop title"
              onChange={(e) => handleFieldChange("title", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>

          {/* Description */}
          <label className="block text-md font-semibold text-gray-700 mb-2">
            Workshop Description
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => handleFieldChange("description", value)}
            placeholder="Enter workshop description"
            rows={4}
          />

          {/* Listing Type */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Listing Type
            </label>
            <p className="text-sm text-gray-500 mt-1 mb-2">
              Choose one from the below
            </p>
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="listing-workshop"
                  name="listingTypeWorkshop"
                  value="Listing"
                  checked={formData?.listingType === "Listing"}
                  onChange={(e) =>
                    handleFieldChange("listingType", e.target.value)
                  }
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288]"
                />
                <label
                  htmlFor="listing-workshop"
                  className="text-sm font-medium text-gray-700"
                >
                  Listing
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="own-workshop"
                  name="listingTypeWorkshop"
                  value="Own"
                  checked={formData?.listingType === "Own"}
                  onChange={(e) =>
                    handleFieldChange("listingType", e.target.value)
                  }
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288]"
                />
                <label
                  htmlFor="own-workshop"
                  className="text-sm font-medium text-gray-700"
                >
                  Own
                </label>
              </div>
            </div>
          </div>

          {/* Base Price */}
          <label className="block text-md font-semibold text-gray-700 mb-2">
            Base Price
          </label>
          <input
            type="number"
            value={formData.price}
            placeholder="Enter base price"
            onChange={(e) => handleFieldChange("price", e.target.value)}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg"
          />

          {/* GST */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              GST (%)
            </label>
            <input
              type="number"
              value={formData.gst || ""}
              placeholder="Enter GST percentage (e.g., 18)"
              onChange={(e) => handleFieldChange("gst", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          {/* Extra Person Price */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Extra Person Price
            </label>
            <input
              type="number"
              value={formData.extraPersonPrice || ""}
              placeholder="Enter price for additional person"
              onChange={(e) =>
                handleFieldChange("extraPersonPrice", e.target.value)
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional cost per person beyond the minimum participant count
            </p>
          </div>

          {/* Variants */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-md font-semibold text-gray-700">
                Workshop Variants
              </label>
              <button
                onClick={addVariant}
                className="flex items-center gap-2 px-3 py-2 bg-[#2F6288] text-white rounded-lg hover:bg-[#1e4a6b] transition-colors"
              >
                <Plus size={16} />
                Add Variant
              </button>
            </div>

            {formData.variants.map((variant, index) => (
              <div key={index} className="flex gap-4 mb-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Variant Name
                  </label>
                  <input
                    type="text"
                    value={variant.name}
                    placeholder="Enter variant name"
                    onChange={(e) =>
                      handleVariantChange(index, "name", e.target.value)
                    }
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                  />
                </div>
                {formData.variants.length > 1 && (
                  <button
                    onClick={() => removeVariant(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Details Section */}
      <div className="mb-8">
        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
          Session Details{" "}
          <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Min Person */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Minimum Participants
            </label>
            <input
              type="number"
              value={formData.minPerson}
              placeholder="Enter minimum number"
              onChange={(e) => handleFieldChange("minPerson", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>

          {/* Max Person */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Maximum Participants
            </label>
            <input
              type="number"
              value={formData.maxPerson}
              placeholder="Enter maximum number"
              onChange={(e) => handleFieldChange("maxPerson", e.target.value)}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>
        </div>

        {/* Session Description */}
        <div className="mb-6">
          <label className="block text-md font-semibold text-gray-700 mb-2">
            Session Description
          </label>
          <RichTextEditor
            value={formData.sessionDescription}
            onChange={(value) => handleFieldChange("sessionDescription", value)}
            placeholder="Enter detailed session description"
            rows={4}
          />
        </div>

        {/* Session Topics */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-md font-semibold text-gray-700">
              Session Topics
            </label>
            <button
              onClick={addTopic}
              className="flex items-center gap-2 px-3 py-2 bg-[#2F6288] text-white rounded-lg hover:bg-[#1e4a6b] transition-colors"
            >
              <Plus size={16} />
              Add Topic
            </button>
          </div>

          {formData.sessionTopics.map((topic, index) => (
            <div
              key={index}
              className="mb-6 p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700">Topic {index + 1}</h4>
                {formData.sessionTopics.length > 1 && (
                  <button
                    onClick={() => removeTopic(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Topic Title
                  </label>
                  <input
                    type="text"
                    value={topic.title}
                    placeholder="Enter topic title"
                    onChange={(e) =>
                      handleTopicChange(index, "title", e.target.value)
                    }
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Topic Description
                  </label>
                  <RichTextEditor
                    value={topic.description}
                    onChange={(value) =>
                      handleTopicChange(index, "description", value)
                    }
                    placeholder="Enter topic description"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Section */}
      <div className="mb-8">
        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
          Media Gallery{" "}
          <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
        </h2>

        {/* Images Upload */}
        <div className="mb-6">
          <label className="block font-semibold my-5">
            Add Workshop Images ( Maximum 5 Images )
          </label>
          <div className="mb-6">
            {(!formData.images || formData.images.length < 5) && (
              <label
                className={`w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 ${Object.keys(uploading.images || {}).length > 0 ? "pointer-events-none opacity-75" : ""}`}
              >
                <img
                  src="/assets/admin/upload.svg"
                  alt="Upload Icon"
                  className="w-10 h-10 mb-2"
                />
                <span>
                  Click to upload images
                  <br />
                  Size: (1126×626)px
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                  disabled={Object.keys(uploading.images || {}).length > 0}
                />
              </label>
            )}

            {/* Upload Progress Indicators */}
            {Object.entries(uploading.images || {}).map(
              ([uploadId, isUploading]) => {
                if (!isUploading) return null;
                const progress = uploadProgress.images[uploadId] || 0;
                return (
                  <div
                    key={uploadId}
                    className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mt-4"
                  >
                    <div className="text-center flex flex-col items-center">
                      <div className="relative w-12 h-12 mb-3">
                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                        <div
                          className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                          style={{
                            background: `conic-gradient(from 0deg, #2F6288 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`,
                          }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-[#2F6288]">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-[#2F6288] font-medium">
                        Uploading Image...
                      </p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            <div className="flex flex-wrap gap-4 mt-4">
              {formData.images &&
                formData.images.map((img, index) => (
                  <div key={index} className="relative w-40 h-28">
                    <img
                      src={img}
                      alt={`img-${index}`}
                      className="w-full h-full object-cover rounded shadow"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageEditor(img, "image", index);
                      }}
                      className="absolute top-1 left-1 bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 text-xs"
                      title="Edit Image"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const updatedImages = formData.images.filter(
                          (_, i) => i !== index,
                        );
                        handleFieldChange("images", updatedImages);
                      }}
                      className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Videos Upload */}
        <div className="mb-6">
          <label className="block font-semibold my-5">
            Add Workshop Videos ( Maximum 6 Videos )
          </label>
          <div className="mb-4">
            {(!formData.videos || formData.videos.length < 6) && (
              <label
                className={`w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 ${Object.keys(uploading.videos || {}).length > 0 ? "pointer-events-none opacity-75" : ""}`}
              >
                <img
                  src="/assets/admin/upload.svg"
                  alt="Upload Icon"
                  className="w-10 h-10 mb-2"
                />
                <span>Click to upload Videos</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleVideoUpload(e.target.files)}
                  className="hidden"
                  disabled={Object.keys(uploading.videos || {}).length > 0}
                />
              </label>
            )}

            {/* Upload Progress Indicators */}
            {Object.entries(uploading.videos || {}).map(
              ([uploadId, isUploading]) => {
                if (!isUploading) return null;
                const progress = uploadProgress.videos[uploadId] || 0;
                return (
                  <div
                    key={uploadId}
                    className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mt-4"
                  >
                    <div className="text-center flex flex-col items-center">
                      <div className="relative w-12 h-12 mb-3">
                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                        <div
                          className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                          style={{
                            background: `conic-gradient(from 0deg, #2F6288 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`,
                          }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-[#2F6288]">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-[#2F6288] font-medium">
                        Uploading Video...
                      </p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            <div className="flex flex-wrap gap-4 mt-4">
              {formData.videos &&
                formData.videos.map((vid, index) => (
                  <div key={index} className="relative w-40 h-28 bg-black">
                    <video
                      src={vid.url || vid}
                      controls
                      className="w-full h-full rounded shadow object-cover"
                    />
                    <button
                      onClick={() => {
                        const updatedVideos = formData.videos.filter(
                          (_, i) => i !== index,
                        );
                        handleFieldChange("videos", updatedVideos);
                      }}
                      className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Details Section - Exactly like LiveSessions2.jsx */}
      <div className="mb-8">
        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
          {isEditing
            ? "Edit Meet Your Workshop Guide"
            : "Meet Your Workshop Guide"}{" "}
          <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
        </h2>

        <div className="mb-6 pt-4 relative flex flex-col space-y-4">
          <label className="block text-md font-semibold text-gray-700 mb-2">
            Add Photo
          </label>
          {formData.guide[0].image ? (
            <div className="relative inline-block mb-4">
              <img
                src={formData.guide[0].image}
                alt="Preview"
                className="w-64 h-auto object-contain rounded shadow"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openImageEditor(formData.guide[0].image, "guide");
                }}
                className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                title="Edit Image - Resize, Crop, Rotate"
              >
                <Edit2 size={16} />
                <span className="text-xs font-semibold">Edit Size</span>
              </button>
              <button
                onClick={handleGuideImageRemove}
                className="absolute top-0 right-0 bg-white border border-gray-300 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-gray-200"
              >
                <X size={14} />
              </button>
            </div>
          ) : uploading.guide ? (
            <div className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
              <div className="text-center flex flex-col items-center">
                <div className="relative w-12 h-12 mb-3">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div
                    className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                    style={{
                      background: `conic-gradient(from 0deg, #2F6288 ${uploadProgress.guide * 3.6}deg, transparent ${uploadProgress.guide * 3.6}deg)`,
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#2F6288]">
                      {uploadProgress.guide}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#2F6288] font-medium">
                  Uploading Guide Image...
                </p>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.guide}%` }}
                  ></div>
                </div>
              </div>
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
                <span className="text-sm text-gray-400">Size: (400×540)px</span>
                <input
                  id="guide-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleGuideImageChange(e.target.files[0])}
                  className="hidden"
                  disabled={uploading.guide}
                />
              </label>
            </div>
          )}

          <label className="block text-md font-semibold text-gray-700 mb-2">
            Guide Name
          </label>
          <input
            type="text"
            value={formData.guide[0].name}
            placeholder="Enter guide name"
            onChange={(e) => handleGuideChange("name", e.target.value)}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg"
          />

          <label className="block text-md font-semibold text-gray-700 mb-2">
            Guide/Organizer Email <span className="text-red-500">*</span>
            {isEditing && (
              <span className="text-xs text-gray-500 ml-2">
                (Cannot be changed during edit)
              </span>
            )}
          </label>
          <input
            type="email"
            value={formData.guide[0].email}
            placeholder="Enter email address (Required)"
            onChange={(e) => handleGuideChange("email", e.target.value)}
            className={`text-sm w-full border border-gray-300 p-3 rounded-lg ${isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
            disabled={isEditing}
            required
          />

          <label className="block text-md font-semibold text-gray-700 mb-2">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.guide[0].number}
            placeholder="Enter contact number (Required)"
            onChange={(e) => handleGuideChange("number", e.target.value)}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            required
          />

          <label className="block text-md font-semibold text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.guide[0].title}
            placeholder="Enter title"
            onChange={(e) => handleGuideChange("title", e.target.value)}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg"
          />

          <label className="block text-md font-semibold text-gray-700 mb-2">
            Description
          </label>
          <RichTextEditor
            value={formData.guide[0].description}
            onChange={(value) => handleGuideChange("description", value)}
            placeholder="Enter description"
            rows={4}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={onSaveWorkshop}
          disabled={
            saving ||
            Object.keys(uploading.images).length > 0 ||
            Object.keys(uploading.videos).length > 0 ||
            uploading.thumbnail ||
            uploading.guide
          }
          className="text-sm flex items-center gap-2 p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {saving
            ? "Saving..."
            : isEditing
              ? "Update Workshop"
              : "Add Workshop"}
        </button>
        {isEditing && (
          <button
            onClick={resetForm}
            disabled={saving}
            className="text-sm flex p-4 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Image Editor Modal */}
      {isImageEditorOpen && editingImage && (
        <ImageEditor
          imageUrl={editingImage}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
        />
      )}

      {/* Loading Overlay */}
      {isSavingEditedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-lg font-semibold text-gray-700">
              Saving edited image...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
