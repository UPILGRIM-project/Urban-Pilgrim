import { useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Trash2, GripVertical, Edit2 } from "lucide-react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadBytesResumable, } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../../../services/firebase";
import { setRecordedSessions } from "../../../features/pilgrim_session/recordedSessionSlice";
import { deleteRecordedSessionByIndex, fetchRecordedSessionData, saveOrUpdateRecordedSessionData, } from "../../../services/pilgrim_session/recordedSessionService";
import { showSuccess } from "../../../utils/toast";
import RichTextEditor from "../../common/RichTextEditor";
import ImageEditor from "../../common/ImageEditor";

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
    <div
      ref={(node) => drag(ref(node))}
      className="flex justify-between items-center p-4 rounded-lg shadow-sm bg-white mb-3 border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <GripVertical className="text-gray-400 cursor-move w-5 h-5" />
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{slide?.title}</p>
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

export default function RecordedSession2() {
  const [formData, setFormData] = useState({
    recordedProgramCard: {
      title: "",
      category: "",
      price: "",
      gst: "",
      thumbnail: null,
      thumbnailType: null,
      days: "",
      videos: "",
      totalprice: "",
      description: "",
      listingType: "Own", // Default to "Own"
    },
    recordedVideo: [],
    // New: About Program section
    aboutProgram: {
      title: "",
      shortDescription: "",
      points: [""],
    },
    // New: One Time Subscription (price only)
    oneTimeSubscription: {
      price: "",
      images: [],
      videos: [],
      description: "",
    },
    // Replaces simple recordedProgramPrograms with richer programSchedule structure
    programSchedule: [],
    // New: features like pilgrim retreat form
    features: [],
    faqs: [{ title: "", description: "" }],
    guide: [{ title: "", description: "", image: null }],
    // New: Additional section with title and points
    keyHighlights: {
      title: "",
      points: [""],
    },
    slides: [],
  });

  const dispatch = useDispatch();
  const sessions = useSelector(
    (state) => state.pilgrimRecordedSession.recordedSessions,
  );
  const uid = "pilgrim_sessions";

  const [allData, setAllData] = useState([]);
  const [slideData, setSlideData] = useState([]);

  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [categories, setCategories] = useState(["Yoga", "Meditation"]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState({});
  const [isImageUploading, setIsImageUploading] = useState({});
  const [videoUploadProgress, setVideoUploadProgress] = useState({});
  const [isVideoUploading, setIsVideoUploading] = useState({});
  const [recordedVideoUploadProgress, setRecordedVideoUploadProgress] =
    useState({});
  const [isRecordedVideoUploading, setIsRecordedVideoUploading] = useState({});
  const [guideImageUploadProgress, setGuideImageUploadProgress] = useState(0);
  const [isGuideImageUploading, setIsGuideImageUploading] = useState(false);

  // Image Editor States
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingImageType, setEditingImageType] = useState(null); // 'thumbnail', 'guide', 'oneTime', 'feature'
  const [editingImageIndex, setEditingImageIndex] = useState(null); // for arrays
  const [isSavingEditedImage, setIsSavingEditedImage] = useState(false);

  // Refs for hidden file inputs
  const thumbnailInputRef = useRef(null);
  const featureInputRefs = useRef({});
  const guideInputRef = useRef(null);

  const handleFieldChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        alert("Please upload an image or video file");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const filePath = `pilgrim_sessions/thumbnails/${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload failed:", error);
          setIsUploading(false);
          setUploadProgress(0);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          handleFieldChange("recordedProgramCard", "thumbnail", downloadURL);
          handleFieldChange("recordedProgramCard", "thumbnailType", file.type);
          setIsUploading(false);
          setUploadProgress(0);
        },
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
      setUploadProgress(0);
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

  // FAQs
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

  // Features (like retreat form)
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        { id: Date.now(), title: "", shortdescription: "", image: null },
      ],
    }));
  };

  const handleFeatureChange = (index, field, value) => {
    const updated = [...formData.features];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  const handleFeatureImageChange = async (index, file) => {
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }
      const storageRef = ref(storage, `featureImages/${uuidv4()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        () => {},
        (error) => {
          console.error("Upload failed:", error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const updated = [...formData.features];
          updated[index] = { ...updated[index], image: downloadURL };
          setFormData((prev) => ({ ...prev, features: updated }));
        },
      );
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };

  const removeFeature = (index) => {
    const updated = [...formData.features];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  // One Time Purchase Image Functions
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const allowed = 5 - formData.oneTimeSubscription.images.length;

    files.slice(0, allowed).forEach((file, fileIndex) => {
      const uploadId = `img_${Date.now()}_${fileIndex}`;

      setIsImageUploading((prev) => ({ ...prev, [uploadId]: true }));
      setImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

      const storageRef = ref(
        storage,
        `recorded_sessions/oneTimeSubscription/${file.name}_${Date.now()}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setImageUploadProgress((prev) => ({
            ...prev,
            [uploadId]: Math.round(progress),
          }));
        },
        (error) => {
          console.error("Upload failed:", error);
          setIsImageUploading((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
          setImageUploadProgress((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const updatedImages = [
            ...formData.oneTimeSubscription.images,
            downloadURL,
          ];
          handleFieldChange("oneTimeSubscription", "images", updatedImages);

          setIsImageUploading((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
          setImageUploadProgress((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
        },
      );
    });
  };

  const removeImage = async (index) => {
    try {
      const updated = [...formData.oneTimeSubscription.images];
      const urlToDelete = updated[index];

      // Delete from Firebase Storage
      const fileRef = ref(storage, urlToDelete);
      await deleteObject(fileRef);

      // Remove from state
      updated.splice(index, 1);
      handleFieldChange("oneTimeSubscription", "images", updated);
    } catch (err) {
      console.error("Error removing image:", err);
      // Even if deletion fails, remove from UI
      const updated = [...formData.oneTimeSubscription.images];
      updated.splice(index, 1);
      handleFieldChange("oneTimeSubscription", "images", updated);
    }
  };

  // One Time Purchase Video Functions
  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const allowed = 6 - formData.oneTimeSubscription.videos.length;

    files.slice(0, allowed).forEach((file, fileIndex) => {
      const uploadId = `vid_${Date.now()}_${fileIndex}`;

      setIsVideoUploading((prev) => ({ ...prev, [uploadId]: true }));
      setVideoUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

      const storageRef = ref(
        storage,
        `recorded_sessions/oneTimeSubscription/videos/${file.name}_${Date.now()}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setVideoUploadProgress((prev) => ({
            ...prev,
            [uploadId]: Math.round(progress),
          }));
        },
        (error) => {
          console.error("Video upload failed:", error);
          setIsVideoUploading((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
          setVideoUploadProgress((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const updatedVideos = [
            ...formData.oneTimeSubscription.videos,
            downloadURL,
          ];
          handleFieldChange("oneTimeSubscription", "videos", updatedVideos);

          setIsVideoUploading((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
          setVideoUploadProgress((prev) => {
            const newState = { ...prev };
            delete newState[uploadId];
            return newState;
          });
        },
      );
    });
  };

  const removeVideo = async (index) => {
    try {
      const updated = [...formData.oneTimeSubscription.videos];
      const urlToDelete = updated[index];

      // Delete from Firebase Storage
      const fileRef = ref(storage, urlToDelete);
      await deleteObject(fileRef);

      // Remove from state
      updated.splice(index, 1);
      handleFieldChange("oneTimeSubscription", "videos", updated);
    } catch (err) {
      console.error("Error removing video:", err);
      // Even if deletion fails, remove from UI
      const updated = [...formData.oneTimeSubscription.videos];
      updated.splice(index, 1);
      handleFieldChange("oneTimeSubscription", "videos", updated);
    }
  };

  // Program Schedule (richer structure like retreat form)
  const addProgram = () => {
    setFormData((prev) => ({
      ...prev,
      programSchedule: [
        ...prev.programSchedule,
        { title: "", points: [{ title: "", subpoints: [] }] },
      ],
    }));
  };

  const handleProgramChange = (index, field, value) => {
    const updated = [...formData.programSchedule];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const handleProgramPointChange = (programIndex, pointIndex, value) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points[pointIndex].title = value;
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const handleProgramSubPointChange = (
    programIndex,
    pointIndex,
    subIndex,
    value,
  ) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points[pointIndex].subpoints[subIndex] = value;
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const addProgramPoint = (programIndex) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points.push({ title: "", subpoints: [] });
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const removeProgramPoint = (programIndex, pointIndex) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points.splice(pointIndex, 1);
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const addProgramSubPoint = (programIndex, pointIndex) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points[pointIndex].subpoints.push("");
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const removeProgramSubPoint = (programIndex, pointIndex, subIndex) => {
    const updated = [...formData.programSchedule];
    updated[programIndex].points[pointIndex].subpoints.splice(subIndex, 1);
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  const removeProgram = (index) => {
    const updated = [...formData.programSchedule];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, programSchedule: updated }));
  };

  // Slides ordering & CRUD
  const moveSlide = async (from, to) => {
    try {
      const basePrograms = Array.isArray(sessions)
        ? [...sessions]
        : Object.values(sessions || {});
      const updatedPrograms = [...basePrograms];
      let allSlides = updatedPrograms.flatMap((g) => g.slides);
      if (
        from < 0 ||
        from >= allSlides.length ||
        to < 0 ||
        to >= allSlides.length
      ) {
        console.warn("Invalid slide move indexes");
        return;
      }
      const [moved] = allSlides.splice(from, 1);
      allSlides.splice(to, 0, moved);
      setSlideData(allSlides);
      updatedPrograms[0].slides = allSlides;
      dispatch(setRecordedSessions(updatedPrograms));
      await saveOrUpdateRecordedSessionData(uid, "slides", updatedPrograms);
    } catch (err) {
      console.error("Error moving slide:", err);
    }
  };

  const removeSlide = async (index) => {
    try {
      if (!uid) throw new Error("User not logged in");
      await deleteRecordedSessionByIndex(uid, index);
      const base = Array.isArray(sessions)
        ? sessions
        : Object.values(sessions || {});
      const updatedRecordedSessions = base.filter((_, i) => i !== index);
      dispatch(setRecordedSessions(updatedRecordedSessions));
      setFormData((prev) => ({
        ...prev,
        slides: prev.slides?.filter((_, i) => i !== index) || [],
      }));
      setSlideData((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error removing slide:", err);
    }
  };

  const editSlide = (index) => {
    const slideToEdit = allData[index];
    setFormData((prev) => ({
      ...prev,
      recordedProgramCard: {
        title: slideToEdit?.recordedProgramCard?.title,
        category: slideToEdit?.recordedProgramCard?.category,
        price: slideToEdit?.recordedProgramCard?.price,
        gst: slideToEdit?.recordedProgramCard?.gst || "",
        thumbnail: slideToEdit?.recordedProgramCard?.thumbnail || null,
        days: slideToEdit?.recordedProgramCard?.days || "",
        videos: slideToEdit?.recordedProgramCard?.videos || "",
        totalprice: slideToEdit?.recordedProgramCard?.totalprice || "",
        description: slideToEdit?.recordedProgramCard?.description || "",
      },
      recordedVideo:
        Array.isArray(slideToEdit?.recordedVideo) &&
        slideToEdit?.recordedVideo.length > 0
          ? slideToEdit.recordedVideo
          : [],
      faqs:
        slideToEdit?.faqs?.length > 0
          ? slideToEdit.faqs
          : [{ title: "", description: "" }],
      // Load richer schedule and features when present
      programSchedule:
        slideToEdit?.programSchedule?.length > 0
          ? slideToEdit.programSchedule
          : [],
      features: slideToEdit?.features?.length > 0 ? slideToEdit.features : [],
      oneTimeSubscription: slideToEdit?.oneTimeSubscription
        ? {
            price: slideToEdit?.oneTimeSubscription?.price || "",
            images: Array.isArray(slideToEdit?.oneTimeSubscription?.images)
              ? slideToEdit?.oneTimeSubscription?.images
              : [],
            videos: Array.isArray(slideToEdit?.oneTimeSubscription?.videos)
              ? slideToEdit?.oneTimeSubscription?.videos
              : [],
            description: slideToEdit?.oneTimeSubscription?.description || "",
          }
        : { price: "", images: [], videos: [], description: "" },
      aboutProgram: slideToEdit?.aboutProgram
        ? {
            title: slideToEdit?.aboutProgram?.title || "",
            shortDescription: slideToEdit?.aboutProgram?.shortDescription || "",
            points:
              Array.isArray(slideToEdit?.aboutProgram?.points) &&
              slideToEdit?.aboutProgram?.points.length > 0
                ? slideToEdit?.aboutProgram?.points
                : [""],
          }
        : { title: "", shortDescription: "", points: [""] },
      keyHighlights: slideToEdit?.keyHighlights
        ? {
            title: slideToEdit?.keyHighlights?.title || "",
            points:
              Array.isArray(slideToEdit?.keyHighlights?.points) &&
              slideToEdit?.keyHighlights?.points.length > 0
                ? slideToEdit?.keyHighlights?.points
                : [""],
          }
        : { title: "", points: [""] },
      guide:
        slideToEdit?.guide?.length > 0
          ? slideToEdit.guide
          : [{ title: "", description: "", image: null }],
    }));
    setIsEditing(true);
    setEditIndex(index);
    document
      .getElementById("recorded2")
      ?.scrollIntoView({ behavior: "smooth" });
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
        gst: "",
        thumbnail: null,
        thumbnailType: null,
        days: "",
        videos: "",
        totalprice: "",
        description: "",
      },
      recordedVideo: [],
      aboutProgram: { title: "", shortDescription: "", points: [""] },
      programSchedule: [],
      features: [],
      oneTimeSubscription: {
        price: "",
        images: [],
        videos: [],
        description: "",
      },
      faqs: [{ title: "", description: "" }],
      guide: [{ title: "", description: "", image: null }],
      keyHighlights: { title: "", points: [""] },
    }));
  };

  const addNewCategory = () => {
    const newCategory = prompt("Enter new category name:");
    if (newCategory && !categories.includes(newCategory)) {
      setCategories((prev) => [...prev, newCategory]);
    }
  };

  const validateFields = () => {
    const newErrors = {};
    const isPriceValid = (value) =>
      /^\d+(\.\d{1,2})?$/.test((value || "").toString().trim());
    if (!formData.recordedProgramCard.title)
      newErrors.title = "Title is required";
    if (!formData.recordedProgramCard.category)
      newErrors.category = "Category required";
    if (!isPriceValid(formData.recordedProgramCard.price))
      newErrors.recordedPrice = "Invalid Price";
    if (
      !formData.recordedProgramCard.days ||
      isNaN(formData.recordedProgramCard.days)
    )
      newErrors.days = "Number of days is required";
    if (
      !formData.recordedProgramCard.videos ||
      isNaN(formData.recordedProgramCard.videos)
    )
      newErrors.videos = "Number of videos is required";
    if (!isPriceValid(formData.recordedProgramCard.totalprice))
      newErrors.totalprice = "Invalid Total Price";

    formData.faqs.forEach((faq, i) => {
      if (!faq.title || !faq.description) {
        newErrors[`faq_${i}`] = "FAQ title and description are required";
      }
    });

    // Validate program schedule
    formData.programSchedule.forEach((program, i) => {
      if (!program.title)
        newErrors[`program_${i}`] = "Program day title is required";
      program.points.forEach((pt, j) => {
        if (!pt.title)
          newErrors[`program_${i}_point_${j}`] = "Point title is required";
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const loadCards = async () => {
      try {
        const session = await fetchRecordedSessionData(uid);
        if (session && session.slides) {
          const slidesArray = Array.isArray(session.slides)
            ? session.slides
            : Object.values(session.slides || {});
          setAllData(slidesArray || []);
          const allSlides = slidesArray.flatMap((ssn) =>
            Array.isArray(ssn?.slides)
              ? ssn.slides
              : Object.values(ssn?.slides || {}),
          );
          setSlideData(allSlides);
          // Keep Redux in sync with fetched data so editing indexes match
          dispatch(setRecordedSessions(slidesArray || []));
        } else {
          setAllData([]);
          setSlideData([]);
          dispatch(setRecordedSessions([]));
        }
      } catch (err) {
        console.error("Error fetching recorded session data:", err);
      }
    };
    loadCards();
  }, [uid]);

  const onSaveRecorded = async () => {
    // if (!validateFields()) {
    //     alert("Fix validation errors");
    //     return;
    // }

    const newCard = {
      recordedProgramCard: { ...formData.recordedProgramCard },
      recordedVideo: [...formData.recordedVideo],
      faqs: [...formData.faqs],

      programSchedule: [...formData.programSchedule],
      features: [...formData.features],
      oneTimeSubscription: { ...formData.oneTimeSubscription },
      aboutProgram: { ...formData.aboutProgram },
      keyHighlights: { ...formData.keyHighlights },
      guide: [...formData.guide],
      slides: [
        {
          title: formData?.recordedProgramCard?.title,
        },
      ],
    };

    try {
      if (!uid) throw new Error("User not logged in");
      // Use Redux sessions when available, otherwise fall back to loaded data to keep indexes aligned
      let base =
        Array.isArray(sessions) && sessions.length > 0
          ? [...sessions]
          : Array.isArray(allData)
            ? [...allData]
            : [];
      let updatedPrograms;
      if (
        isEditing &&
        editIndex !== null &&
        editIndex >= 0 &&
        editIndex < base.length
      ) {
        base[editIndex] = newCard;
        updatedPrograms = base;
      } else {
        updatedPrograms = [...base, newCard];
      }

      dispatch(setRecordedSessions(updatedPrograms));
      setSlideData(updatedPrograms.flatMap((g) => g.slides));
      setAllData(updatedPrograms);
      const status = await saveOrUpdateRecordedSessionData(
        uid,
        "slides",
        updatedPrograms,
      );
      showSuccess("Recorded Program (v2) saved successfully!");

      setFormData({
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
        recordedVideo: [],
        aboutProgram: { title: "", shortDescription: "", points: [""] },
        programSchedule: [],
        features: [],
        oneTimeSubscription: {
          price: "",
          images: [],
          videos: [],
          description: "",
        },
        faqs: [{ title: "", description: "" }],
        guide: [{ title: "", description: "", image: null }],
        keyHighlights: { title: "", points: [""] },
        slides: [],
      });

      setIsEditing(false);
      setEditIndex(null);
    } catch (err) {
      console.error("Error saving recorded session (v2):", err);
      alert("Error saving recorded session. Please try again.");
    }
  };

  const handleGuideChange = (field, value) => {
    const updatedGuide = [...(formData.guide || [{}])];
    const current = { ...(updatedGuide[0] || {}) };
    current[field] = value;
    updatedGuide[0] = current;
    setFormData((prev) => ({
      ...prev,
      guide: updatedGuide,
    }));
  };

  const handleGuideImageChange = async (file) => {
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      setIsGuideImageUploading(true);
      setGuideImageUploadProgress(0);

      const filePath = `pilgrim_sessions/meet_guides/${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, filePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setGuideImageUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Error uploading file:", error);
          setIsGuideImageUploading(false);
          setGuideImageUploadProgress(0);
          alert("Error uploading image. Please try again.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          handleGuideChange("image", downloadURL);
          setIsGuideImageUploading(false);
          setGuideImageUploadProgress(0);
        },
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsGuideImageUploading(false);
      setGuideImageUploadProgress(0);
      alert("Error uploading image. Please try again.");
    }
  };

  const handleGuideImageRemove = async () => {
    try {
      const currentImage = formData.guide?.[0]?.image;
      if (currentImage) {
        const imageRef = ref(storage, currentImage);
        await deleteObject(imageRef);
      }
      handleGuideChange("image", null);
      dispatch(
        setRecordedSessions((prev) => {
          const updatedSessions = [...prev];
          const sessionIndex = updatedSessions.findIndex(
            (s) => s.id === formData.id,
          );
          if (sessionIndex !== -1) {
            updatedSessions[sessionIndex].guide[0].image = null;
          }
          return updatedSessions;
        }),
      );
    } catch (error) {
      console.error("Error removing image:", error);
    }
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
      const filePath = `session_images/${uuidv4()}_${editedFile.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, editedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Error uploading edited image:", error);
          setIsSavingEditedImage(false);
          alert("Error uploading edited image. Please try again.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Delete old image if exists
          if (editingImage) {
            try {
              const oldImageRef = ref(storage, editingImage);
              await deleteObject(oldImageRef);
            } catch (error) {
              console.warn("Could not delete old image:", error);
            }
          }

          // Update the appropriate field based on type
          if (editingImageType === "thumbnail") {
            handleFieldChange("recordedProgramCard", "thumbnail", downloadURL);
            handleFieldChange("recordedProgramCard", "thumbnailType", editedFile.type);
          } else if (editingImageType === "guide") {
            handleGuideChange("image", downloadURL);
          } else if (editingImageType === "oneTime") {
            const updated = [...formData.oneTimeSubscription.images];
            updated[editingImageIndex] = downloadURL;
            handleFieldChange("oneTimeSubscription", "images", updated);
          } else if (editingImageType === "feature") {
            handleFeatureChange(editingImageIndex, "image", downloadURL);
          }

          setIsSavingEditedImage(false);
          handleImageEditorCancel();
          showSuccess("Image updated successfully!");
        }
      );
    } catch (error) {
      console.error("Error in handleImageEditorSave:", error);
      setIsSavingEditedImage(false);
      alert("Error saving edited image. Please try again.");
    }
  };

  // Recorded Video Handlers
  const addRecordedVideo = () => {
    setFormData((prev) => ({
      ...prev,
      recordedVideo: [
        ...prev.recordedVideo,
        { title: "", description: "", url: "" },
      ],
    }));
  };

  const handleRecordedVideoChange = (index, field, value) => {
    const updatedVideos = [...formData.recordedVideo];
    const current = { ...(updatedVideos[index] || {}) };
    current[field] = value;
    updatedVideos[index] = current;
    setFormData((prev) => ({ ...prev, recordedVideo: updatedVideos }));
  };

  const handleRecordedVideoFileUpload = async (index, file) => {
    if (!file) return;
    try {
      if (!file.type.startsWith("video/")) {
        alert("Please upload a video file");
        return;
      }

      setIsRecordedVideoUploading((prev) => ({ ...prev, [index]: true }));
      setRecordedVideoUploadProgress((prev) => ({ ...prev, [index]: 0 }));

      const filePath = `pilgrim_sessions/recorded_videos/${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, filePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setRecordedVideoUploadProgress((prev) => ({
            ...prev,
            [index]: Math.round(progress),
          }));
        },
        (error) => {
          console.error("Error uploading video:", error);
          setIsRecordedVideoUploading((prev) => ({ ...prev, [index]: false }));
          setRecordedVideoUploadProgress((prev) => ({ ...prev, [index]: 0 }));
          alert("Error uploading video. Please try again.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          handleRecordedVideoChange(index, "url", downloadURL);
          setIsRecordedVideoUploading((prev) => ({ ...prev, [index]: false }));
          setRecordedVideoUploadProgress((prev) => ({ ...prev, [index]: 0 }));
        },
      );
    } catch (error) {
      console.error("Error uploading video:", error);
      setIsRecordedVideoUploading((prev) => ({ ...prev, [index]: false }));
      setRecordedVideoUploadProgress((prev) => ({ ...prev, [index]: 0 }));
      alert("Error uploading video. Please try again.");
    }
  };

  const removeRecordedVideo = async (index) => {
    try {
      const videoToRemove = formData.recordedVideo[index];
      if (videoToRemove.url) {
        const videoRef = ref(storage, videoToRemove.url);
        await deleteObject(videoRef);
      }
      const updatedVideos = formData.recordedVideo.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({ ...prev, recordedVideo: updatedVideos }));
    } catch (error) {
      console.error("Error removing video:", error);
    }
  };

  const removeVideoFile = async (index) => {
    try {
      const videoToRemove = formData.recordedVideo[index];
      if (videoToRemove.url) {
        const videoRef = ref(storage, videoToRemove.url);
        await deleteObject(videoRef);
      }
      handleRecordedVideoChange(index, "url", "");
    } catch (error) {
      console.error("Error removing video file:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:p-8 px-4 py-0 mx-auto" id="recorded2">
        {/* Recorded Program Card */}
        <div className="mb-8">
          {/* title */}
          <div className="flex justify-between items-center mb-0">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
              {isEditing
                ? "Edit Recorded Program Card"
                : "Recorded Program Card"}{" "}
              <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
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

          {/* Add Thumbnail */}
          <div className="mb-6">
            <h3 className="block text-md font-semibold text-gray-700 mb-2">
              Add Thumbnail
            </h3>
            <div
              className={`border-2 border-dashed h-40 rounded mb-4 flex items-center justify-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-[#2F6288] bg-[#2F6288]"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => {
                if (isUploading) return;
                thumbnailInputRef.current?.click();
              }}
            >
              {formData.recordedProgramCard.thumbnail ? (
                <div className="relative h-full flex items-center">
                  {formData?.recordedProgramCard?.thumbnailType &&
                    formData?.recordedProgramCard?.thumbnailType.startsWith("video/") ? (
                    // Video thumbnail
                    <>
                      <video
                        src={formData.recordedProgramCard.thumbnail}
                        className="h-full object-contain rounded"
                        controls
                        muted
                        loop
                        playsInline
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange("recordedProgramCard", "thumbnail", null);
                          handleFieldChange("recordedProgramCard", "thumbnailType", null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        title="Remove Video"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    // Image thumbnail
                    <>
                      <img
                        src={formData.recordedProgramCard.thumbnail}
                        alt="Thumbnail"
                        className="h-full object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageEditor(formData.recordedProgramCard.thumbnail, 'thumbnail');
                        }}
                        className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                        title="Edit Image - Resize, Crop, Rotate"
                      >
                        <Edit2 size={16} />
                        <span className="text-xs font-semibold">Edit Size</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange("recordedProgramCard", "thumbnail", null);
                          handleFieldChange("recordedProgramCard", "thumbnailType", null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ) : isUploading ? (
                <div className="text-center flex flex-col items-center">
                  <div className="relative w-12 h-12 mb-3">
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                      style={{
                        background: `conic-gradient(from 0deg, #2F6288 ${uploadProgress * 3.6}deg, transparent ${uploadProgress * 3.6}deg)`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#2F6288]">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#2F6288] font-medium">
                    Uploading Thumbnail...
                  </p>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center">
                  <img
                    src="/assets/admin/upload.svg"
                    alt="Upload Icon"
                    className="w-12 h-12 mb-2"
                  />
                  <p>
                    {dragActive
                      ? "Drop here..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-sm text-gray-400">Size: (487×387)px</p>
                  <p className="text-xs text-gray-400 mt-1">Image or Video</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
                ref={thumbnailInputRef}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Title
            </label>
            <input
              placeholder="Enter Title"
              value={formData.recordedProgramCard.title}
              onChange={(e) =>
                handleFieldChange(
                  "recordedProgramCard",
                  "title",
                  e.target.value,
                )
              }
              className="text-sm w-full border p-3 rounded-lg"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Category Selection */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Select Category
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {categories.map((cat, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handleFieldChange("recordedProgramCard", "category", cat)
                  }
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    formData.recordedProgramCard.category === cat
                      ? "bg-[#2F6288] text-white border-[#2F6288]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#2F6288]"
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
            {errors.category && (
              <p className="text-red-500 text-sm">{errors.category}</p>
            )}
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Price
            </label>
            <input
              placeholder="Enter Price"
              type="number"
              value={formData.recordedProgramCard.price}
              onChange={(e) =>
                handleFieldChange(
                  "recordedProgramCard",
                  "price",
                  e.target.value,
                )
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.recordedPrice && (
              <p className="text-red-500 text-sm mt-1">
                {errors.recordedPrice}
              </p>
            )}
          </div>

          {/* GST */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              GST (%)
            </label>
            <input
              placeholder="Enter GST percentage (e.g., 18)"
              type="number"
              value={formData.recordedProgramCard.gst}
              onChange={(e) =>
                handleFieldChange("recordedProgramCard", "gst", e.target.value)
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          {/* Number of days */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Number of Days
            </label>
            <input
              placeholder="Enter Number"
              type="number"
              value={formData.recordedProgramCard.days}
              onChange={(e) =>
                handleFieldChange("recordedProgramCard", "days", e.target.value)
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.days && (
              <p className="text-red-500 text-sm mt-1">{errors.days}</p>
            )}
          </div>

          {/* Number of Videos */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Number of videos
            </label>
            <input
              placeholder="Enter Number"
              type="number"
              value={formData.recordedProgramCard.videos}
              onChange={(e) =>
                handleFieldChange(
                  "recordedProgramCard",
                  "videos",
                  e.target.value,
                )
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.videos && (
              <p className="text-red-500 text-sm mt-1">{errors.videos}</p>
            )}
          </div>

          {/* Program Description */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Program Description
            </label>
            <RichTextEditor
              value={formData.recordedProgramCard.description}
              onChange={(value) =>
                handleFieldChange("recordedProgramCard", "description", value)
              }
              placeholder="Enter Program Description"
              rows={4}
            />
          </div>

          {/* Listing Type */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Listing Type
            </label>
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="listing-recorded"
                  name="listingTypeRecorded"
                  value="Listing"
                  checked={
                    formData?.recordedProgramCard?.listingType === "Listing"
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      "recordedProgramCard",
                      "listingType",
                      e.target.value,
                    )
                  }
                  disabled={true} // Admin cannot change this option
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                />
                <label
                  htmlFor="listing-recorded"
                  className="text-sm font-medium text-gray-700 cursor-not-allowed"
                >
                  Listing
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="own-recorded"
                  name="listingTypeRecorded"
                  value="Own"
                  checked={formData?.recordedProgramCard?.listingType === "Own"}
                  onChange={(e) =>
                    handleFieldChange(
                      "recordedProgramCard",
                      "listingType",
                      e.target.value,
                    )
                  }
                  disabled={true} // Admin cannot change this option
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                />
                <label
                  htmlFor="own-recorded"
                  className="text-sm font-medium text-gray-700 cursor-not-allowed"
                >
                  Own
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Default: Own (Admin cannot modify this option)
            </p>
          </div>
        </div>

        {/* One Time Subscription (price only) */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            One Time Subscription{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          {/* price */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Price
            </label>
            <input
              type="number"
              value={formData.oneTimeSubscription.price}
              placeholder="Enter price"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  oneTimeSubscription: {
                    ...prev.oneTimeSubscription,
                    price: e.target.value,
                  },
                }))
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            />
          </div>

          {/* description */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Description
            </label>
            <RichTextEditor
              value={formData.oneTimeSubscription.description}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  oneTimeSubscription: {
                    ...prev.oneTimeSubscription,
                    description: value,
                  },
                }))
              }
              placeholder="Enter description"
              rows={3}
            />
          </div>

          {/* Images (match RetreatsForm style) */}
          <label className="block font-semibold mb-2">Images (Max 5)</label>
          <div className="mb-4">
            {formData?.oneTimeSubscription?.images &&
              formData?.oneTimeSubscription?.images?.length < 5 && (
                <label
                  className={`w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 ${Object.keys(isImageUploading || {}).length > 0 ? "pointer-events-none opacity-75" : ""}`}
                >
                  <img
                    src="/assets/admin/upload.svg"
                    alt="Upload Icon"
                    className="w-10 h-10 mb-2"
                  />
                  <span>Click to upload image(s)</span>
                  <p>Size: (1126×626)px</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={Object.keys(isImageUploading || {}).length > 0}
                  />
                </label>
              )}

            {/* Upload progress for images */}
            <div className="flex flex-wrap gap-4 mt-4">
              {Object.entries(isImageUploading || {}).map(
                ([uploadId, uploading]) => {
                  if (!uploading) return null;
                  const progress = imageUploadProgress?.[uploadId] || 0;
                  return (
                    <div
                      key={uploadId}
                      className="w-40 h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center"
                    >
                      <div className="text-center flex flex-col items-center">
                        <div className="relative w-8 h-8 mb-2">
                          <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                          <div
                            className="absolute inset-0 border-2 border-[#2F6288] rounded-full border-t-transparent animate-spin"
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
                        <p className="text-xs text-[#2F6288] font-medium">
                          Uploading Image...
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
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
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {formData?.oneTimeSubscription?.images &&
                formData?.oneTimeSubscription?.images.map((img, index) => (
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
                        openImageEditor(img, 'oneTime', index);
                      }}
                      className="absolute top-1 left-1 bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 text-xs"
                      title="Edit Image"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1
                                        hover:bg-gray-200"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Videos (match RetreatsForm style) */}
          <label className="block font-semibold my-5">Videos (Max 6)</label>
          <div className="mb-4">
            {(!formData?.oneTimeSubscription?.videos ||
              formData?.oneTimeSubscription?.videos.length < 6) && (
              <label
                className={`w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 ${Object.keys(isVideoUploading || {}).length > 0 ? "pointer-events-none opacity-75" : ""}`}
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
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={Object.keys(isVideoUploading || {}).length > 0}
                />
              </label>
            )}

            {/* Upload progress for videos */}
            <div className="flex flex-wrap gap-4 mt-4">
              {Object.entries(isVideoUploading || {}).map(
                ([uploadId, uploading]) => {
                  if (!uploading) return null;
                  const progress = videoUploadProgress?.[uploadId] || 0;
                  return (
                    <div
                      key={uploadId}
                      className="w-40 h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center"
                    >
                      <div className="text-center flex flex-col items-center">
                        <div className="relative w-8 h-8 mb-2">
                          <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                          <div
                            className="absolute inset-0 border-2 border-[#2F6288] rounded-full border-t-transparent animate-spin"
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
                        <p className="text-xs text-[#2F6288] font-medium">
                          Uploading Video...
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
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
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {formData?.oneTimeSubscription?.videos &&
                formData?.oneTimeSubscription?.videos.map((vid, index) => (
                  <div key={index} className="relative w-40 h-28 bg-black">
                    <video
                      src={vid}
                      controls
                      className="w-full h-full rounded shadow object-cover"
                    />
                    <button
                      onClick={() => removeVideo(index)}
                      className="absolute top-1 right-1 bg-white border border-gray-300
                                        rounded-full p-1 hover:bg-gray-200"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recorded Video Upload Section */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            Recorded Videos{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          <div className="space-y-4">
            {formData.recordedVideo.map((video, index) => (
              <div
                key={index}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-700">
                    Video {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeRecordedVideo(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-md font-semibold text-gray-700 mb-2">
                      Video Title
                    </label>
                    <input
                      type="text"
                      value={video.title || ""}
                      onChange={(e) =>
                        handleRecordedVideoChange(
                          index,
                          "title",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6288]"
                      placeholder="Enter video title"
                    />
                  </div>

                  <div>
                    <label className="block text-md font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <RichTextEditor
                      value={video.description || ""}
                      onChange={(value) =>
                        handleRecordedVideoChange(index, "description", value)
                      }
                      placeholder="Enter video description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-2">
                      Upload Video
                    </label>
                    <div className="mb-4">
                      {!video.url && !isRecordedVideoUploading[index] && (
                        <label
                          className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col
                                                items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                        >
                          <img
                            src="/assets/admin/upload.svg"
                            alt="Upload Icon"
                            className="w-10 h-10 mb-2"
                          />
                          <span>Click to upload Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) =>
                              handleRecordedVideoFileUpload(
                                index,
                                e.target.files[0],
                              )
                            }
                            className="hidden"
                            disabled={isRecordedVideoUploading[index]}
                          />
                        </label>
                      )}
                      {isRecordedVideoUploading[index] && (
                        <div className="w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center">
                          <div className="text-center flex flex-col items-center">
                            <div className="relative w-12 h-12 mb-3">
                              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                              <div
                                className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                                style={{
                                  background: `conic-gradient(from 0deg, #2F6288 ${(recordedVideoUploadProgress[index] || 0) * 3.6}deg, transparent ${(recordedVideoUploadProgress[index] || 0) * 3.6}deg)`,
                                }}
                              ></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-semibold text-[#2F6288]">
                                  {recordedVideoUploadProgress[index] || 0}%
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-[#2F6288] font-medium">
                              Uploading Video...
                            </p>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${recordedVideoUploadProgress[index] || 0}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {video.url && (
                        <div className="relative w-40 h-28 bg-black">
                          <video
                            src={video.url}
                            controls
                            className="w-full h-full rounded shadow object-cover"
                          />
                          <button
                            onClick={() => removeVideoFile(index)}
                            className="absolute top-1 right-1 bg-white border border-gray-300
                                                        rounded-full p-1 hover:bg-gray-200"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addRecordedVideo}
              className="flex items-center gap-2 px-4 py-2 bg-[#2F6288] text-white rounded-md hover:bg-[#1e4a6b] transition-colors"
            >
              <FaPlus /> Add Video
            </button>
          </div>
        </div>

        {/* About the Program */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            About the Program{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.aboutProgram.title}
                placeholder="Enter title"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    aboutProgram: {
                      ...prev.aboutProgram,
                      title: e.target.value,
                    },
                  }))
                }
                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Short Description
              </label>
              <RichTextEditor
                value={formData.aboutProgram.shortDescription}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    aboutProgram: {
                      ...prev.aboutProgram,
                      shortDescription: value,
                    },
                  }))
                }
                placeholder="Enter short description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Points
              </label>
              <div className="space-y-3">
                {formData.aboutProgram.points.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pt}
                      placeholder={`Point ${idx + 1}`}
                      onChange={(e) => {
                        const updated = [...formData.aboutProgram.points];
                        updated[idx] = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          aboutProgram: {
                            ...prev.aboutProgram,
                            points: updated,
                          },
                        }));
                      }}
                      className="w-full border border-gray-300 p-3 rounded-lg"
                    />
                    {formData.aboutProgram.points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.aboutProgram.points];
                          updated.splice(idx, 1);
                          setFormData((prev) => ({
                            ...prev,
                            aboutProgram: {
                              ...prev.aboutProgram,
                              points: updated,
                            },
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    aboutProgram: {
                      ...prev.aboutProgram,
                      points: [...prev.aboutProgram.points, ""],
                    },
                  }))
                }
                className="w-full mt-3 px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FaPlus className="w-3 h-3" /> Add Point
              </button>
            </div>
          </div>
        </div>

        {/* Program Schedule (Richer) */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Program Schedule" : "Program Schedule"}{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="space-y-6">
            {formData?.programSchedule &&
              formData?.programSchedule.map((program, programIndex) => (
                <div
                  key={programIndex}
                  className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative"
                >
                  <button
                    onClick={() => removeProgram(programIndex)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                    title="Delete Program"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Day {programIndex + 1} Title
                    </label>
                    <input
                      type="text"
                      value={program?.title}
                      placeholder="Enter title"
                      onChange={(e) =>
                        handleProgramChange(
                          programIndex,
                          "title",
                          e.target.value,
                        )
                      }
                      className="w-full border border-gray-300 p-3 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description Points
                    </label>

                    {program?.points &&
                      program?.points.map((point, pointIndex) => (
                        <div key={pointIndex} className="mb-4 relative">
                          <div className="mb-3">
                            <label className="block text-sm text-gray-700 mb-2">
                              Point {pointIndex + 1} Title
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={point?.title}
                                placeholder={`Point ${pointIndex + 1}`}
                                onChange={(e) =>
                                  handleProgramPointChange(
                                    programIndex,
                                    pointIndex,
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-gray-300 p-3 rounded-lg"
                              />

                              {program?.points.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeProgramPoint(programIndex, pointIndex)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex flex-col items-start justify-between">
                              <label className="block text-sm text-gray-700 mb-2">
                                Sub Points (Optional)
                              </label>
                            </div>

                            {point?.subpoints &&
                              point?.subpoints.length > 0 && (
                                <div className="space-y-3 mb-3">
                                  {point.subpoints.map((subpoint, subIndex) => (
                                    <div
                                      key={subIndex}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type="text"
                                        value={subpoint}
                                        placeholder={`Sub Point ${subIndex + 1}`}
                                        onChange={(e) =>
                                          handleProgramSubPointChange(
                                            programIndex,
                                            pointIndex,
                                            subIndex,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeProgramSubPoint(
                                            programIndex,
                                            pointIndex,
                                            subIndex,
                                          )
                                        }
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <FaTimes className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            <button
                              type="button"
                              onClick={() =>
                                addProgramSubPoint(programIndex, pointIndex)
                              }
                              className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FaPlus className="w-3 h-3" /> Add Sub Point
                            </button>
                          </div>
                        </div>
                      ))}

                    <button
                      type="button"
                      onClick={() => addProgramPoint(programIndex)}
                      className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FaPlus className="w-3 h-3" /> Add Point
                    </button>
                  </div>
                </div>
              ))}

            <button
              onClick={addProgram}
              className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FaPlus className="w-5 h-5" />
              Add Program Day
            </button>
          </div>
        </div>

        {/* Key Highlights */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            Key Highlights{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.keyHighlights.title}
                placeholder="Enter title"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    keyHighlights: {
                      ...prev.keyHighlights,
                      title: e.target.value,
                    },
                  }))
                }
                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Points
              </label>
              <div className="space-y-3">
                {formData.keyHighlights.points.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pt}
                      placeholder={`Point ${idx + 1}`}
                      onChange={(e) => {
                        const updated = [...formData.keyHighlights.points];
                        updated[idx] = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          keyHighlights: {
                            ...prev.keyHighlights,
                            points: updated,
                          },
                        }));
                      }}
                      className="w-full border border-gray-300 p-3 rounded-lg"
                    />
                    {formData.keyHighlights.points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.keyHighlights.points];
                          updated.splice(idx, 1);
                          setFormData((prev) => ({
                            ...prev,
                            keyHighlights: {
                              ...prev.keyHighlights,
                              points: updated,
                            },
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    keyHighlights: {
                      ...prev.keyHighlights,
                      points: [...prev.keyHighlights.points, ""],
                    },
                  }))
                }
                className="w-full mt-3 px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FaPlus className="w-3 h-3" /> Add Point
              </button>
            </div>
          </div>
        </div>

        {/* Features (like retreat form) */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            Features<span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          <div className="space-y-6">
            {formData?.features &&
              formData?.features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative"
                >
                  <button
                    onClick={() => removeFeature(index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                    title="Delete Feature"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Feature Icon
                    </label>
                    {feature.image ? (
                      <div className="relative inline-block mb-4">
                        <img
                          src={feature?.image}
                          alt="Preview"
                          className="w-32 h-32 object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openImageEditor(feature.image, 'feature', index);
                          }}
                          className="absolute top-1 left-1 bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 text-xs"
                          title="Edit Image"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleFeatureChange(index, "image", null)
                          }
                          className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div
                          className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            featureInputRefs.current[index]?.click()
                          }
                        >
                          <img
                            src="/assets/admin/upload.svg"
                            alt="Upload Icon"
                            className="w-12 h-12 mb-2"
                          />
                          <span>Click to upload feature icon</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => {
                              featureInputRefs.current[index] = el;
                            }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFeatureImageChange(index, file);
                              // allow re-selecting the same file
                              e.target.value = null;
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feature?.title}
                      placeholder="Enter title"
                      onChange={(e) =>
                        handleFeatureChange(index, "title", e.target.value)
                      }
                      className="w-full border border-gray-300 p-3 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={feature?.shortdescription}
                      placeholder="Enter short description"
                      onChange={(e) =>
                        handleFeatureChange(
                          index,
                          "shortdescription",
                          e.target.value,
                        )
                      }
                      className="w-full border border-gray-300 p-3 rounded-lg"
                    />
                  </div>
                </div>
              ))}

            <button
              onClick={addFeature}
              className="w-full px-4 py-3 bg-[#2F6288] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FaPlus className="w-5 h-5" />
              Add Feature
            </button>
          </div>
        </div>

        {/* FAQS */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit FAQS" : "FAQS"}{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
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
                  <label className="block text-md font-semibold text-gray-700 mb-2">
                    FAQ Title
                  </label>
                  <input
                    placeholder="Enter FAQ Title"
                    value={faq.title}
                    onChange={(e) =>
                      handleFaqChange(i, "title", e.target.value)
                    }
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg "
                  />
                </div>

                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <RichTextEditor
                    value={faq.description}
                    onChange={(value) =>
                      handleFaqChange(i, "description", value)
                    }
                    placeholder="Enter FAQ Description"
                    rows={4}
                  />
                </div>

                {errors[`faq_${i}`] && (
                  <p className="text-red-500 text-sm">{errors[`faq_${i}`]}</p>
                )}
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
            {isEditing
              ? "Edit Meet Your Pilgrim Guide"
              : "Meet Your Pilgrim Guide"}{" "}
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
                    openImageEditor(formData.guide[0].image, 'guide');
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
            ) : isGuideImageUploading ? (
              <div className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
                <div className="text-center flex flex-col items-center">
                  <div className="relative w-12 h-12 mb-3">
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                      style={{
                        background: `conic-gradient(from 0deg, #2F6288 ${guideImageUploadProgress * 3.6}deg, transparent ${guideImageUploadProgress * 3.6}deg)`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#2F6288]">
                        {guideImageUploadProgress}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#2F6288] font-medium">
                    Uploading Image...
                  </p>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${guideImageUploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div
                  className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    if (!isGuideImageUploading) guideInputRef.current?.click();
                  }}
                >
                  <img
                    src="/assets/admin/upload.svg"
                    alt="Upload Icon"
                    className="w-12 h-12 mb-2"
                  />
                  <span>Click to upload image</span>
                  <span className="text-sm text-gray-400">
                    Size: (400×540)px
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={guideInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGuideImageChange(file);
                      e.target.value = null;
                    }}
                    disabled={isGuideImageUploading}
                  />
                </div>
              </div>
            )}

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
            onClick={onSaveRecorded}
            className="text-sm flex p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
          >
            {isEditing
              ? "Update Recorded Session (v2)"
              : "Add Recorded Session (v2)"}
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

        {/* Current Recorded Sessions */}
        {allData && (
          <div className="mt-8">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
              Current Recorded Sessions{" "}
              <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-3">
                {slideData.map((slide, index) => (
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
            <p className="text-lg font-semibold text-gray-700">Saving edited image...</p>
          </div>
        </div>
      )}
    </div>
  );
}
