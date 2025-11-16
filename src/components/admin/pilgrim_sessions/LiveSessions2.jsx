import { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Trash2, GripVertical, Edit2 } from "lucide-react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../../../services/firebase";
import { showSuccess, showError } from "../../../utils/toast";
import {
  deleteLiveSessionByIndex,
  fetchLiveSessionData,
  saveOrUpdateLiveSessionData,
  saveLiveSessionOrganizerData,
} from "../../../services/pilgrim_session/liveSessionService";
import { setLiveSessions } from "../../../features/pilgrim_session/liveSessionsSlice";
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

export default function LiveSession2() {
  const [formData, setFormData] = useState({
    liveSessionCard: {
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
    organizer: {
      name: "",
      email: "",
      address: "",
      googleMeetLink: "",
      contactNumber: "",
    },
    aboutProgram: {
      title: "",
      shortDescription: "",
      points: [""],
    },
    liveSlots: [],
    oneTimeSubscription: {
      price: "",
      individualPrice: "",
      couplesPrice: "",
      groupPrice: "",
      groupMin: "",
      groupMax: "",
      images: [],
      videos: [],
      description: "",
      slots: [],
    },
    programSchedule: [],
    features: [],
    faqs: [{ title: "", description: "" }],
    guide: [{ title: "", description: "", image: null }],
    keyHighlights: {
      title: "",
      points: [""],
    },
    slides: [],
  });

  const dispatch = useDispatch();
  const sessions = useSelector((state) => state.pilgrimLiveSession.LiveSession);
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
  const [guideUploadProgress, setGuideUploadProgress] = useState(0);
  const [isGuideUploading, setIsGuideUploading] = useState(false);

  // Image Editor States
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingImageType, setEditingImageType] = useState(null); // 'thumbnail', 'guide', 'oneTime', 'feature'
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [isSavingEditedImage, setIsSavingEditedImage] = useState(false);

  // Weekday labels
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Calendar state for custom date scheduling
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([
    new Date().toISOString().slice(0, 10),
  ]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [pendingMultiSlot, setPendingMultiSlot] = useState({
    open: false,
    startTime: "",
    endTime: "",
    type: "individual",
  });

  const formatYMD = (date) => {
    if (!(date instanceof Date)) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getCalendarGrid = (monthDate) => {
    if (!(monthDate instanceof Date)) return [];

    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const startIndex = start.getDay(); // 0=Sun
    const daysInMonth = end.getDate();
    const cells = [];
    // leading blanks
    for (let i = 0; i < startIndex; i++) cells.push(null);
    // month days
    for (let d = 1; d <= daysInMonth; d++)
      cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
    // trailing blanks to complete 42
    while (cells.length % 7 !== 0 || cells.length < 42) cells.push(null);
    return cells;
  };

  const goPrevMonth = () =>
    setCalendarMonth((prev) => {
      const today = new Date();
      const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const target = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      // Do not navigate before current month
      if (target < minMonth) return prev;
      return target;
    });
  const goNextMonth = () =>
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );

  const getSlotsForDate = (dateYMD) =>
    (formData.liveSlots || []).filter((s) => s.date === dateYMD);
  const getOneTimeSlotsForDate = (dateYMD) =>
    (formData.oneTimeSubscription?.slots || []).filter(
      (s) => s.date === dateYMD,
    );

  const addSlotForSelectedDates = () => {
    if (!selectedDates || selectedDates.length === 0) return;
    // Prevent adding slots to past dates
    const today = new Date();
    const ymdToday = formatYMD(today);
    const validDates = selectedDates.filter((date) => date >= ymdToday);
    if (validDates.length === 0) return;

    setFormData((prev) => {
      const newSlots = validDates.map((date) => ({
        date,
        startTime: "",
        endTime: "",
        type: "individual",
      }));
      return {
        ...prev,
        liveSlots: [...(prev.liveSlots || []), ...newSlots],
      };
    });
  };

  // Apply the single filled slot to all selected (valid) dates
  const applyPendingMultiSlot = () => {
    const { startTime, endTime, type } = pendingMultiSlot;
    if (!startTime || !endTime) return;
    // simple validation
    if (endTime <= startTime) return;
    if (!selectedDates || selectedDates.length === 0) return;
    const today = new Date();
    const ymdToday = formatYMD(today);
    const validDates = selectedDates.filter((d) => d >= ymdToday);
    if (validDates.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      liveSlots: [
        ...(prev.liveSlots || []),
        ...validDates.map((date) => ({
          date,
          startTime,
          endTime,
          type: type || "individual",
        })),
      ],
    }));
    setPendingMultiSlot({
      open: false,
      startTime: "",
      endTime: "",
      type: "individual",
    });
  };

  // One-time slots (like GuideForm oneTime online)
  const addOneTimeSlotForSelectedDate = () => {
    const currentDate = selectedDates[0];
    if (!currentDate) return;
    const today = new Date();
    const ymdToday = formatYMD(today);
    if (currentDate < ymdToday) return;
    setFormData((prev) => ({
      ...prev,
      oneTimeSubscription: {
        ...prev.oneTimeSubscription,
        slots: [
          ...(prev.oneTimeSubscription?.slots || []),
          {
            id: uuidv4(),
            date: currentDate,
            startTime: "",
            endTime: "",
            type: "individual",
          },
        ],
      },
    }));
  };

  const updateOneTimeSlotForSelectedDate = (localIndex, field, value) => {
    const currentDate = selectedDates[0];
    setFormData((prev) => {
      let idx = -1;
      const updated = (prev.oneTimeSubscription?.slots || []).map((s) => {
        if (s.date === currentDate) {
          idx++;
          if (idx === localIndex) {
            return { ...s, [field]: value };
          }
        }
        return s;
      });
      return {
        ...prev,
        oneTimeSubscription: { ...prev.oneTimeSubscription, slots: updated },
      };
    });
  };

  const removeOneTimeSlotForSelectedDate = (localIndex) => {
    const currentDate = selectedDates[0];
    setFormData((prev) => {
      let idx = -1;
      const updated = [];
      for (const s of prev.oneTimeSubscription?.slots || []) {
        if (s.date === currentDate) {
          idx++;
          if (idx === localIndex) continue;
        }
        updated.push(s);
      }
      return {
        ...prev,
        oneTimeSubscription: { ...prev.oneTimeSubscription, slots: updated },
      };
    });
  };

  const updateSlotForSelectedDate = (localIndex, field, value) => {
    const currentDate = selectedDates[0]; // Use first selected date for editing
    setFormData((prev) => {
      let idx = -1;
      const updated = (prev.liveSlots || []).map((s) => {
        if (s.date === currentDate) {
          idx++;
          if (idx === localIndex) {
            return { ...s, [field]: value };
          }
        }
        return s;
      });
      return { ...prev, liveSlots: updated };
    });
  };

  const removeSlotForSelectedDate = (localIndex) => {
    const currentDate = selectedDates[0]; // Use first selected date for editing
    setFormData((prev) => {
      let idx = -1;
      const updated = [];
      for (const s of prev.liveSlots || []) {
        if (s.date === currentDate) {
          idx++;
          if (idx === localIndex) continue; // skip remove
        }
        updated.push(s);
      }
      return { ...prev, liveSlots: updated };
    });
  };

  const dayHasSlots = (dateObj) => {
    if (!dateObj) return false;
    const ymd = formatYMD(dateObj);
    return (formData.liveSlots || []).some((s) => s.date === ymd);
  };

  const isPastDate = (dateObj) => {
    if (!dateObj) return true;
    const today = new Date();
    const ymdToday = formatYMD(today);
    const ymd = formatYMD(dateObj);
    return ymd < ymdToday;
  };

  // (Weekly scheduling removed)

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
      // Accept both images and videos
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        alert("Please upload an image or video file");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const filePath = `pilgrim_sessions/live_sessions/thumbnails/${uuidv4()}_${file.name}`;
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
          handleFieldChange("liveSessionCard", "thumbnail", downloadURL);
          handleFieldChange("liveSessionCard", "thumbnailType", file.type);
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

  function editSlide(index) {
    const slideToEdit = allData[index];
    setFormData((prev) => ({
      ...prev,
      liveSessionCard: {
        title: slideToEdit?.liveSessionCard?.title,
        category: slideToEdit?.liveSessionCard?.category,
        price: slideToEdit?.liveSessionCard?.price,
        gst: slideToEdit?.liveSessionCard?.gst || "",
        thumbnail: slideToEdit?.liveSessionCard?.thumbnail || null,
        days: slideToEdit?.liveSessionCard?.days || "",
        videos: slideToEdit?.liveSessionCard?.videos || "",
        totalprice: slideToEdit?.liveSessionCard?.totalprice || "",
        description: slideToEdit?.liveSessionCard?.description || "",
        listingType: slideToEdit?.liveSessionCard?.listingType || "Own", // Default to "Own" if not present
      },
      // Prefill organizer details
      organizer: {
        name: slideToEdit?.organizer?.name || "",
        email: slideToEdit?.organizer?.email || "",
        address: slideToEdit?.organizer?.address || "",
        googleMeetLink: slideToEdit?.organizer?.googleMeetLink || "",
        contactNumber: slideToEdit?.organizer?.contactNumber || "",
      },
      // Keep only actual saved slots (no empty placeholder)
      liveSlots: Array.isArray(slideToEdit?.liveSlots)
        ? slideToEdit.liveSlots
        : [],
      faqs:
        slideToEdit?.faqs?.length > 0
          ? slideToEdit.faqs
          : [{ title: "", description: "" }],
      programSchedule:
        slideToEdit?.programSchedule?.length > 0
          ? slideToEdit.programSchedule
          : [],
      features: slideToEdit?.features?.length > 0 ? slideToEdit.features : [],
      oneTimeSubscription: slideToEdit?.oneTimeSubscription
        ? {
            price: slideToEdit?.oneTimeSubscription?.price || "",
            individualPrice:
              slideToEdit?.oneTimeSubscription?.individualPrice || "",
            couplesPrice: slideToEdit?.oneTimeSubscription?.couplesPrice || "",
            groupPrice: slideToEdit?.oneTimeSubscription?.groupPrice || "",
            groupMin: slideToEdit?.oneTimeSubscription?.groupMin || "",
            groupMax: slideToEdit?.oneTimeSubscription?.groupMax || "",
            images: Array.isArray(slideToEdit?.oneTimeSubscription?.images)
              ? slideToEdit?.oneTimeSubscription?.images
              : [],
            videos: Array.isArray(slideToEdit?.oneTimeSubscription?.videos)
              ? slideToEdit?.oneTimeSubscription?.videos
              : [],
            description: slideToEdit?.oneTimeSubscription?.description || "",
            slots: Array.isArray(slideToEdit?.oneTimeSubscription?.slots)
              ? slideToEdit.oneTimeSubscription.slots.map((s) => ({
                  id: s?.id || uuidv4(),
                  date: s?.date || "",
                  startTime: s?.startTime || "",
                  endTime: s?.endTime || "",
                  type: s?.type || "individual",
                }))
              : [],
          }
        : {
            price: "",
            individualPrice: "",
            couplesPrice: "",
            groupPrice: "",
            groupMin: "",
            groupMax: "",
            images: [],
            videos: [],
            description: "",
            slots: [],
          },
      aboutProgram: slideToEdit?.aboutProgram
        ? {
            title: slideToEdit?.aboutProgram?.title || "",
            shortDescription: slideToEdit?.aboutProgram?.shortDescription || "",
            points:
              Array.isArray(slideToEdit?.aboutProgram?.points) &&
              slideToEdit?.aboutProgram?.points.length > 0
                ? slideToEdit.aboutProgram.points
                : [""],
          }
        : { title: "", shortDescription: "", points: [""] },
      keyHighlights: slideToEdit?.keyHighlights
        ? {
            title: slideToEdit?.keyHighlights?.title || "",
            points:
              Array.isArray(slideToEdit?.keyHighlights?.points) &&
              slideToEdit?.keyHighlights?.points.length > 0
                ? slideToEdit.keyHighlights.points
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
    document.getElementById("live2")?.scrollIntoView({ behavior: "smooth" });
  }

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
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  const handleFeatureImageChange = async (index, file) => {
    if (!file) return;
    try {
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
          updated[index].image = downloadURL;
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

  // Thubmnail Image Functions
  const handleImageUpload = (e) => {
    e.stopPropagation();
    const files = Array.from(e.target.files);
    const allowed = 5 - (formData?.oneTimeSubscription?.images?.length || 0);

    files.slice(0, allowed).forEach((file, fileIndex) => {
      const uploadId = `img_${Date.now()}_${fileIndex}`;

      setIsImageUploading((prev) => ({ ...prev, [uploadId]: true }));
      setImageUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

      const storageRef = ref(
        storage,
        `live_sessions/thumbnail_image/${file.name}_${Date.now()}`,
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

  // Thubmnail Video Functions
  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const allowed = 6 - formData.oneTimeSubscription.videos.length;

    files.slice(0, allowed).forEach((file, fileIndex) => {
      const uploadId = `vid_${Date.now()}_${fileIndex}`;

      setIsVideoUploading((prev) => ({ ...prev, [uploadId]: true }));
      setVideoUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));

      const storageRef = ref(
        storage,
        `live_sessions/thumbnail_video/videos/${file.name}_${Date.now()}`,
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

  // Slides ordering & CRUD
  const moveSlide = async (from, to) => {
    try {
      const updatedPrograms = [...allData];
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
      dispatch(setLiveSessions(updatedPrograms));
      await saveOrUpdateLiveSessionData(uid, "slides", updatedPrograms);
    } catch (err) {
      console.error("Error moving slide:", err);
    }
  };

  const removeSlide = async (index) => {
    try {
      if (!uid) throw new Error("User not logged in");
      await deleteLiveSessionByIndex(uid, index);
      const updatedLiveSessions = allData.filter((_, i) => i !== index);
      dispatch(setLiveSessions(updatedLiveSessions));
      setFormData((prev) => ({
        ...prev,
        slides: prev.slides?.filter((_, i) => i !== index) || [],
      }));
      setSlideData((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error removing slide:", err);
    }
    setIsEditing(true);
    setEditIndex(index);
    document.getElementById("live2")?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditIndex(null);
    setFormData((prev) => ({
      ...prev,
      liveSessionCard: {
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
        listingType: "Own", // Reset to default "Own"
      },
      aboutProgram: { title: "", shortDescription: "", points: [""] },
      organizer: {
        name: "",
        email: "",
        address: "",
        googleMeetLink: "",
        contactNumber: "",
      },
      liveSlots: [],
      liveWeeklyEnabled: false,
      liveWeeklyHours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      programSchedule: [],
      features: [],
      oneTimeSubscription: {
        price: "",
        images: [],
        videos: [],
        description: "",
        slots: [],
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
    if (!formData.liveSessionCard.title) newErrors.title = "Title is required";
    if (!formData.liveSessionCard.category)
      newErrors.category = "Category required";
    if (!isPriceValid(formData.liveSessionCard.price))
      newErrors.livePrice = "Invalid Price";
    if (!formData.liveSessionCard.days || isNaN(formData.liveSessionCard.days))
      newErrors.days = "Number of days is required";
    if (
      !formData.liveSessionCard.videos ||
      isNaN(formData.liveSessionCard.videos)
    )
      newErrors.videos = "Number of videos is required";
    if (!isPriceValid(formData.liveSessionCard.totalprice))
      newErrors.totalprice = "Invalid Total Price";
    if (!formData.organizer.name)
      newErrors.organizerName = "Organizer name is required";
    if (!formData.organizer.email)
      newErrors.organizerEmail = "Organizer email is required";
    if (!formData.organizer.googleMeetLink)
      newErrors.organizerGoogleMeetLink =
        "Organizer Google Meet link is required";

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
        const session = await fetchLiveSessionData(uid);
        if (session && session.slides) {
          const slidesArray = Object.values(session.slides); // convert object -> array

          setAllData(slidesArray);

          let allSlides = [];
          for (const ssn of slidesArray) {
            if (ssn.slides) {
              allSlides = [...allSlides, ...ssn.slides];
            }
          }

          setSlideData(allSlides);
        } else {
          setAllData([]);
          setSlideData([]);
        }
      } catch (err) {
        console.error("Error fetching recorded session data:", err);
      }
    };
    loadCards();
  }, [uid]);

  const onSaveLive = async () => {
    // if (!validateFields()) {
    //     alert("Fix validation errors");
    //     return;
    // }

    // Validate organizer email, phone number, and Google Meet link (compulsory for new live sessions)
    if (!isEditing) {
      if (
        !formData?.organizer?.email ||
        formData?.organizer?.email.trim() === ""
      ) {
        showError("Organizer email is required!");
        return;
      }
      if (
        !formData?.organizer?.contactNumber ||
        formData?.organizer?.contactNumber.trim() === ""
      ) {
        showError("Organizer phone number is required!");
        return;
      }
      if (
        !formData?.organizer?.googleMeetLink ||
        formData?.organizer?.googleMeetLink.trim() === ""
      ) {
        showError("Google Meet link is required!");
        return;
      }
    }

    // Filter out incomplete live slots before saving
    const cleanedLiveSlots = (formData.liveSlots || []).filter(
      (s) => !!s?.date && !!s?.startTime && !!s?.endTime,
    );

    const newCard = {
      liveSessionCard: { ...formData.liveSessionCard },
      organizer: { ...formData.organizer },
      faqs: [...formData.faqs],
      programSchedule: [...formData.programSchedule],
      liveSlots: cleanedLiveSlots,
      features: [...formData.features],
      oneTimeSubscription: { ...formData.oneTimeSubscription },
      aboutProgram: { ...formData.aboutProgram },
      keyHighlights: { ...formData.keyHighlights },
      guide: [...formData.guide],
      slides: [
        {
          title: formData?.liveSessionCard?.title,
        },
      ],
    };

    try {
      if (!uid) throw new Error("User not logged in");

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
        title: formData?.liveSessionCard?.title || "",
        category: formData?.liveSessionCard?.category || "",
        price: formData?.liveSessionCard?.price || "",
        numberOfDays: formData?.liveSessionCard?.days || "",
        numberOfVideos: formData?.liveSessionCard?.videos || "",
        googleMeetLink: formData?.organizer?.googleMeetLink || "",
        oneTimeSubscription: {
          price: formData?.oneTimeSubscription?.price || "",
          individualPrice: formData?.oneTimeSubscription?.individualPrice || "",
          couplesPrice: formData?.oneTimeSubscription?.couplesPrice || "",
          groupPrice: formData?.oneTimeSubscription?.groupPrice || "",
          groupMin: formData?.oneTimeSubscription?.groupMin || "",
          groupMax: formData?.oneTimeSubscription?.groupMax || "",
          slots: formData?.oneTimeSubscription?.slots || [],
          description: formData?.oneTimeSubscription?.description || "",
        },
        liveSlots: cleanedLiveSlots,
        programSchedule: formData?.programSchedule || [],
      };

      // Remove undefined/null/empty fields to prevent Firestore error
      const programData = cleanUndefined(rawProgramData);

      const organizerData = {
        name: formData?.organizer?.name,
        email: formData?.organizer?.email,
        phone: formData?.organizer?.contactNumber,
        address: formData?.organizer?.address,
        programData: programData,
      };

      await saveLiveSessionOrganizerData(organizerData);

      let updatedPrograms;
      if (isEditing && editIndex !== null) {
        updatedPrograms = [...allData];
        updatedPrograms[editIndex] = newCard;
      } else {
        updatedPrograms = [...allData, newCard];
      }

      dispatch(setLiveSessions(updatedPrograms));
      setSlideData(updatedPrograms.flatMap((g) => g.slides));
      setAllData(updatedPrograms);
      const status = await saveOrUpdateLiveSessionData(
        uid,
        "slides",
        updatedPrograms,
      );
      showSuccess("Live Session saved successfully!");

      setFormData({
        liveSessionCard: {
          title: "",
          category: "",
          price: "",
          gst: "",
          thumbnail: null,
          days: "",
          videos: "",
          totalprice: "",
          description: "",
          listingType: "Own", // Reset to default "Own"
        },
        aboutProgram: { title: "", shortDescription: "", points: [""] },
        organizer: {
          name: "",
          email: "",
          address: "",
          googleMeetLink: "",
          contactNumber: "",
        },
        liveSlots: [],
        programSchedule: [],
        features: [],
        oneTimeSubscription: {
          price: "",
          individualPrice: "",
          couplesPrice: "",
          groupPrice: "",
          groupMin: "",
          groupMax: "",
          images: [],
          videos: [],
          description: "",
          slots: [],
        },
        faqs: [{ title: "", description: "" }],
        guide: [{ title: "", description: "", image: null }],
        keyHighlights: { title: "", points: [""] },
        slides: [],
      });

      setIsEditing(false);
      setEditIndex(null);
    } catch (err) {
      console.error("Error saving live session:", err);
      alert("Error saving live session. Please try again.");
    }
  };

  const handleGuideChange = (field, value) => {
    const updatedGuide = [...formData.guide];
    updatedGuide[0][field] = value;
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

      setIsGuideUploading(true);
      setGuideUploadProgress(0);

      const filePath = `pilgrim_sessions/live_sessions/meet_guides/${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setGuideUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload failed:", error);
          setIsGuideUploading(false);
          setGuideUploadProgress(0);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          handleGuideChange("image", downloadURL);
          setIsGuideUploading(false);
          setGuideUploadProgress(0);
        },
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsGuideUploading(false);
      setGuideUploadProgress(0);
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
        setLiveSessions((prev) => {
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

  // Image Editor Functions
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

      const filePath = `session_images/${uuidv4()}_${editedFile.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, editedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error("Upload failed:", error);
          setIsSavingEditedImage(false);
          showError("Failed to upload edited image");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Delete old image
          if (editingImage) {
            try {
              const oldImageRef = ref(storage, editingImage);
              await deleteObject(oldImageRef);
            } catch (err) {
              console.log("Old image cleanup error:", err);
            }
          }

          // Update based on type
          if (editingImageType === 'thumbnail') {
            handleFieldChange("liveSessionCard", "thumbnail", downloadURL);
          } else if (editingImageType === 'guide') {
            handleGuideChange("image", downloadURL);
          } else if (editingImageType === 'oneTime' && editingImageIndex !== null) {
            setFormData((prev) => {
              const updatedImages = [...prev.oneTimeSubscription.images];
              updatedImages[editingImageIndex] = downloadURL;
              return {
                ...prev,
                oneTimeSubscription: {
                  ...prev.oneTimeSubscription,
                  images: updatedImages,
                },
              };
            });
          } else if (editingImageType === 'feature' && editingImageIndex !== null) {
            setFormData((prev) => {
              const updatedFeatures = [...prev.features];
              updatedFeatures[editingImageIndex] = {
                ...updatedFeatures[editingImageIndex],
                image: downloadURL,
              };
              return {
                ...prev,
                features: updatedFeatures,
              };
            });
          }

          setIsSavingEditedImage(false);
          showSuccess("Image updated successfully");

          // Reset editor state
          setEditingImage(null);
          setEditingImageType(null);
          setEditingImageIndex(null);
        }
      );
    } catch (error) {
      console.error("Error saving edited image:", error);
      setIsSavingEditedImage(false);
      showError("Failed to save edited image");
    }
  };

  const handleSlotChange = (index, field, value) => {
    const updated = [...formData.liveSlots];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, liveSlots: updated }));
  };

  // (removed addSessionSlot helper; organizer is prefilled inside editSlide)

  const removeSessionSlot = (index) => {
    const updated = [...formData.liveSlots];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, liveSlots: updated }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:p-8 px-4 py-0 mx-auto" id="recorded2">
        {/* Live Session Card */}
        <div className="mb-8">
          {/* title */}
          <div className="flex justify-between items-center mb-0">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
              {isEditing ? "Edit Live Session Card" : "Live Session Card"}{" "}
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
              onClick={() =>
                document.getElementById("thumbnail-recorded2-upload").click()
              }
            >
              {formData.liveSessionCard.thumbnail ? (
                <div className="relative h-full flex items-center">
                  {formData.liveSessionCard.thumbnailType && 
                   formData.liveSessionCard.thumbnailType.startsWith("video/") ? (
                    // Video thumbnail
                    <>
                      <video
                        src={formData.liveSessionCard.thumbnail}
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
                          handleFieldChange("liveSessionCard", "thumbnail", null);
                          handleFieldChange("liveSessionCard", "thumbnailType", null);
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
                        src={formData.liveSessionCard.thumbnail}
                        alt="Thumbnail"
                        className="h-full object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageEditor(formData.liveSessionCard.thumbnail, 'thumbnail');
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
                          handleFieldChange("liveSessionCard", "thumbnail", null);
                          handleFieldChange("liveSessionCard", "thumbnailType", null);
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
                  <p className="text-sm text-gray-400">Image or Video</p>
                  <p className="text-sm text-gray-400">Size: (487×387)px</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
                id="thumbnail-recorded2-upload"
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
              value={formData.liveSessionCard.title}
              onChange={(e) =>
                handleFieldChange("liveSessionCard", "title", e.target.value)
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
                    handleFieldChange("liveSessionCard", "category", cat)
                  }
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    formData.liveSessionCard.category === cat
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
              value={formData.liveSessionCard.price}
              onChange={(e) =>
                handleFieldChange("liveSessionCard", "price", e.target.value)
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg "
            />
            {errors.liveSessionCardPrice && (
              <p className="text-red-500 text-sm mt-1">
                {errors.liveSessionCardPrice}
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
              value={formData.liveSessionCard.gst}
              onChange={(e) =>
                handleFieldChange("liveSessionCard", "gst", e.target.value)
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
              value={formData.liveSessionCard.days}
              onChange={(e) =>
                handleFieldChange("liveSessionCard", "days", e.target.value)
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
              value={formData.liveSessionCard.videos}
              onChange={(e) =>
                handleFieldChange("liveSessionCard", "videos", e.target.value)
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
              value={formData.liveSessionCard.description}
              onChange={(value) =>
                handleFieldChange("liveSessionCard", "description", value)
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
                  id="listing-live"
                  name="listingTypeLive"
                  value="Listing"
                  checked={formData?.liveSessionCard?.listingType === "Listing"}
                  onChange={(e) =>
                    handleFieldChange(
                      "liveSessionCard",
                      "listingType",
                      e.target.value,
                    )
                  }
                  disabled={true} // Admin cannot change this option
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                />
                <label
                  htmlFor="listing-live"
                  className="text-sm font-medium text-gray-700 cursor-not-allowed"
                >
                  Listing
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="own-live"
                  name="listingTypeLive"
                  value="Own"
                  checked={formData?.liveSessionCard?.listingType === "Own"}
                  onChange={(e) =>
                    handleFieldChange(
                      "liveSessionCard",
                      "listingType",
                      e.target.value,
                    )
                  }
                  disabled={true} // Admin cannot change this option
                  className="mr-2 text-[#2F6288] focus:ring-[#2F6288] cursor-not-allowed"
                />
                <label
                  htmlFor="own-live"
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

        {/* Organizer Information */}
        <div className="mb-8">
          <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
            {isEditing ? "Edit Organizer Information" : "Organizer Information"}{" "}
            <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
          </h2>

          {/* Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Organizer Name */}
            <div className="mb-4">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Organizer Name
              </label>
              <input
                placeholder="Enter Organizer Name"
                value={formData?.organizer?.name}
                onChange={(e) =>
                  handleFieldChange("organizer", "name", e.target.value)
                }
                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
              />
            </div>

            {/* Organizer Email */}
            <div className="mb-4">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Organizer Email <span className="text-red-500">*</span>
                {isEditing && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Cannot be changed during edit)
                  </span>
                )}
              </label>
              <input
                placeholder="Enter Organizer Email (Required)"
                type="email"
                value={formData?.organizer?.email}
                onChange={(e) =>
                  handleFieldChange("organizer", "email", e.target.value)
                }
                className={`text-sm w-full border border-gray-300 p-3 rounded-lg ${isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
                disabled={isEditing}
                required
              />
            </div>

            {/* Contact Number */}
            <div className="mb-4">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Enter Contact Number (Required)"
                type="tel"
                value={formData?.organizer?.contactNumber}
                onChange={(e) =>
                  handleFieldChange(
                    "organizer",
                    "contactNumber",
                    e.target.value,
                  )
                }
                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                required
              />
            </div>

            {/* Google Meet Link */}
            <div className="mb-4">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Google Meet Link <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Enter Google Meet Link (Required)"
                type="url"
                value={formData?.organizer?.googleMeetLink}
                onChange={(e) =>
                  handleFieldChange(
                    "organizer",
                    "googleMeetLink",
                    e.target.value,
                  )
                }
                className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                disabled={isEditing}
                required
              />
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  Google Meet link cannot be edited
                </p>
              )}
            </div>
          </div>

          {/* Organizer Address */}
          <div className="mb-4">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              Organizer Address
            </label>
            <textarea
              placeholder="Enter Organizer Address"
              rows={3}
              value={formData?.organizer?.address}
              onChange={(e) =>
                handleFieldChange("organizer", "address", e.target.value)
              }
              className="text-sm w-full border border-gray-300 p-3 rounded-lg"
            ></textarea>

            {/* Live Slots moved to Slots section below */}
          </div>

          {/* details subscription */}
          <div className="flex flex-col justify-between">
            <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
              One Time Subscription{" "}
              <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
            </h2>

            {/* Occupancy Pricing */}
            <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  Individual Price
                </label>
                <input
                  type="number"
                  value={formData?.oneTimeSubscription?.individualPrice || ""}
                  placeholder="Enter individual price"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      oneTimeSubscription: {
                        ...prev.oneTimeSubscription,
                        individualPrice: e.target.value,
                      },
                    }))
                  }
                  className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  Couple Price
                </label>
                <input
                  type="number"
                  value={formData?.oneTimeSubscription?.couplesPrice || ""}
                  placeholder="Enter couple price"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      oneTimeSubscription: {
                        ...prev.oneTimeSubscription,
                        couplesPrice: e.target.value,
                      },
                    }))
                  }
                  className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  Group Price (per booking)
                </label>
                <input
                  type="number"
                  value={formData?.oneTimeSubscription?.groupPrice || ""}
                  placeholder="Enter group price"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      oneTimeSubscription: {
                        ...prev.oneTimeSubscription,
                        groupPrice: e.target.value,
                      },
                    }))
                  }
                  className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">
                    Group Min
                  </label>
                  <input
                    type="number"
                    value={formData?.oneTimeSubscription?.groupMin || ""}
                    placeholder="Min"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        oneTimeSubscription: {
                          ...prev.oneTimeSubscription,
                          groupMin: e.target.value,
                        },
                      }))
                    }
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-md font-semibold text-gray-700 mb-2">
                    Group Max
                  </label>
                  <input
                    type="number"
                    value={formData?.oneTimeSubscription?.groupMax || ""}
                    placeholder="Max"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        oneTimeSubscription: {
                          ...prev.oneTimeSubscription,
                          groupMax: e.target.value,
                        },
                      }))
                    }
                    className="text-sm w-full border border-gray-300 p-3 rounded-lg"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-500 mb-1">
                  Optional Base Price (fallback)
                </label>
                <input
                  type="number"
                  value={formData?.oneTimeSubscription?.price || ""}
                  placeholder="Fallback price used when occupancy-specific price is not set"
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
            </div>

            {/* Description */}
            <div>
              <label className="block text-md font-semibold text-gray-700 mb-2">
                Description
              </label>
              <RichTextEditor
                value={formData?.oneTimeSubscription?.description}
                onChange={(value) =>
                  handleFieldChange("oneTimeSubscription", "description", value)
                }
                placeholder="Enter Description"
                rows={3}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Slots (Live + One-Time) */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Slots
              </h3>
              {/* Live Slots (per-date) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {(() => {
                    const today = new Date();
                    const isPrevDisabled =
                      calendarMonth.getFullYear() === today.getFullYear() &&
                      calendarMonth.getMonth() === today.getMonth();
                    return (
                      <button
                        type="button"
                        onClick={goPrevMonth}
                        disabled={isPrevDisabled}
                        className={`px-3 py-1.5 border border-gray-300 rounded-md ${isPrevDisabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      >
                        Prev
                      </button>
                    );
                  })()}
                  <p className="font-semibold text-gray-800">
                    {calendarMonth instanceof Date
                      ? calendarMonth.toLocaleString("default", {
                          month: "long",
                        })
                      : ""}{" "}
                    {calendarMonth instanceof Date
                      ? calendarMonth.getFullYear()
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>

                <div className="grid grid-cols-7 text-xs text-gray-500">
                  {dayLabels.map((d) => (
                    <div key={d} className="px-2 py-1 text-center">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getCalendarGrid(calendarMonth).map((dateObj, idx) => {
                    const isCurrentMonth =
                      dateObj &&
                      dateObj.getMonth() === calendarMonth.getMonth();
                    const ymd = dateObj ? formatYMD(dateObj) : "";
                    const isSelected = dateObj && selectedDates.includes(ymd);
                    const has = dayHasSlots(dateObj);
                    const isPast = isPastDate(dateObj);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!dateObj || isPast}
                        onClick={() => {
                          if (!dateObj || isPast) return;
                          const ymd = formatYMD(dateObj);
                          if (isMultiSelectMode) {
                            setSelectedDates((prev) =>
                              prev.includes(ymd)
                                ? prev.filter((d) => d !== ymd)
                                : [...prev, ymd],
                            );
                          } else {
                            setSelectedDates([ymd]);
                          }
                        }}
                        className={`h-10 rounded-md text-sm border ${!isCurrentMonth ? "bg-gray-50 text-gray-300" : "bg-white"} ${isSelected ? "border-[#2F6288]" : "border-gray-200"} ${has ? "ring-2 ring-green-200" : ""} ${isPast ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {dateObj instanceof Date ? dateObj.getDate() : ""}
                      </button>
                    );
                  })}
                </div>

                {/* Multi-select toggle */}
                <div className="mb-4 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isMultiSelectMode}
                      onChange={(e) => {
                        setIsMultiSelectMode(e.target.checked);
                        if (!e.target.checked && selectedDates.length > 1) {
                          setSelectedDates([selectedDates[0]]);
                        }
                      }}
                      className="h-4 w-4 text-[#2F6288]"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Multi-select dates
                    </span>
                  </label>
                  {selectedDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Selected Date{selectedDates.length > 1 ? "s" : ""}:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDates.map((date) => (
                          <span
                            key={date}
                            className="text-xs bg-[#2F6288] text-white px-2 py-1 rounded"
                          >
                            {date}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDates.length > 1) {
                          setPendingMultiSlot((prev) => ({
                            ...prev,
                            open: true,
                          }));
                        } else {
                          addSlotForSelectedDates();
                        }
                      }}
                      disabled={selectedDates.length === 0}
                      className="text-xs px-3 py-1.5 bg-[#2F6288] text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add Time Range to{" "}
                      {selectedDates.length > 1 ? "All Dates" : "Date"}
                    </button>
                  </div>

                  {pendingMultiSlot.open && selectedDates.length > 1 && (
                    <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Add a time range that will apply to all selected dates
                      </p>
                      <div className="grid sm:grid-cols-[auto_1fr_auto_1fr_auto] grid-cols-1 gap-2 items-center">
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center text-xs">
                            <input
                              type="radio"
                              name="multi-type"
                              checked={
                                (pendingMultiSlot.type || "individual") ===
                                "individual"
                              }
                              onChange={() =>
                                setPendingMultiSlot((p) => ({
                                  ...p,
                                  type: "individual",
                                }))
                              }
                              className="h-4 w-4 text-[#2F6288]"
                            />
                            <span className="ml-1">Individual</span>
                          </label>
                          <label className="inline-flex items-center text-xs">
                            <input
                              type="radio"
                              name="multi-type"
                              checked={pendingMultiSlot.type === "couple"}
                              onChange={() =>
                                setPendingMultiSlot((p) => ({
                                  ...p,
                                  type: "couple",
                                }))
                              }
                              className="h-4 w-4 text-[#2F6288]"
                            />
                            <span className="ml-1">Couple</span>
                          </label>
                          <label className="inline-flex items-center text-xs">
                            <input
                              type="radio"
                              name="multi-type"
                              checked={pendingMultiSlot.type === "group"}
                              onChange={() =>
                                setPendingMultiSlot((p) => ({
                                  ...p,
                                  type: "group",
                                }))
                              }
                              className="h-4 w-4 text-[#2F6288]"
                            />
                            <span className="ml-1">Group</span>
                          </label>
                        </div>
                        <input
                          type="time"
                          value={pendingMultiSlot.startTime}
                          onChange={(e) =>
                            setPendingMultiSlot((p) => ({
                              ...p,
                              startTime: e.target.value,
                            }))
                          }
                          className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                        />
                        <span className="hidden sm:flex justify-center text-gray-500">
                          -
                        </span>
                        <input
                          type="time"
                          value={pendingMultiSlot.endTime}
                          onChange={(e) =>
                            setPendingMultiSlot((p) => ({
                              ...p,
                              endTime: e.target.value,
                            }))
                          }
                          className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={applyPendingMultiSlot}
                            className="text-xs px-3 py-1.5 bg-[#2F6288] text-white rounded-md"
                          >
                            Apply to {selectedDates.length} dates
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingMultiSlot({
                                open: false,
                                startTime: "",
                                endTime: "",
                                type: "individual",
                              })
                            }
                            className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show slots for the first selected date or all dates */}
                  {selectedDates.length === 1 ? (
                    <>
                      {getSlotsForDate(selectedDates[0]).length === 0 && (
                        <p className="text-xs text-gray-500">
                          No time ranges added for this date.
                        </p>
                      )}
                      {getSlotsForDate(selectedDates[0]).map((s, localIdx) => (
                        <div
                          key={localIdx}
                          className="grid sm:grid-cols-[auto_1fr_auto_1fr_auto_auto] grid-cols-1 gap-2 items-center"
                        >
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center text-xs">
                              <input
                                type="radio"
                                name={`live-${selectedDates[0]}-${localIdx}`}
                                checked={
                                  (s.type || "individual") === "individual"
                                }
                                onChange={() =>
                                  updateSlotForSelectedDate(
                                    localIdx,
                                    "type",
                                    "individual",
                                  )
                                }
                                className="h-4 w-4 text-[#2F6288]"
                              />
                              <span className="ml-1">Individual</span>
                            </label>
                            <label className="inline-flex items-center text-xs">
                              <input
                                type="radio"
                                name={`live-${selectedDates[0]}-${localIdx}`}
                                checked={s.type === "couple"}
                                onChange={() =>
                                  updateSlotForSelectedDate(
                                    localIdx,
                                    "type",
                                    "couple",
                                  )
                                }
                                className="h-4 w-4 text-[#2F6288]"
                              />
                              <span className="ml-1">Couple</span>
                            </label>
                            <label className="inline-flex items-center text-xs">
                              <input
                                type="radio"
                                name={`live-${selectedDates[0]}-${localIdx}`}
                                checked={s.type === "group"}
                                onChange={() =>
                                  updateSlotForSelectedDate(
                                    localIdx,
                                    "type",
                                    "group",
                                  )
                                }
                                className="h-4 w-4 text-[#2F6288]"
                              />
                              <span className="ml-1">Group</span>
                            </label>
                          </div>
                          <input
                            type="time"
                            value={s.startTime}
                            onChange={(e) =>
                              updateSlotForSelectedDate(
                                localIdx,
                                "startTime",
                                e.target.value,
                              )
                            }
                            className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                          />
                          <span className="hidden sm:flex justify-center text-gray-500">
                            -
                          </span>
                          <input
                            type="time"
                            value={s.endTime}
                            onChange={(e) =>
                              updateSlotForSelectedDate(
                                localIdx,
                                "endTime",
                                e.target.value,
                              )
                            }
                            className="text-sm w-full border border-gray-300 p-2 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeSlotForSelectedDate(localIdx)}
                            className="text-red-500 hover:text-red-600 text-xs"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = getSlotsForDate(selectedDates[0])[
                                localIdx
                              ];
                              if (!current) return;
                              setFormData((prev) => ({
                                ...prev,
                                liveSlots: [
                                  ...prev.liveSlots,
                                  {
                                    date: selectedDates[0],
                                    startTime: current.startTime,
                                    endTime: current.endTime,
                                  },
                                ],
                              }));
                            }}
                            className="text-[#2F6288] hover:text-blue-700 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Showing slots summary for multiple dates:
                      </p>
                      {selectedDates.map((date) => {
                        const slotsForDate = getSlotsForDate(date);
                        return (
                          <div key={date} className="bg-gray-50 p-2 rounded">
                            <p className="text-xs font-medium text-gray-700">
                              {date}
                            </p>
                            <p className="text-xs text-gray-500">
                              {slotsForDate.length === 0
                                ? "No slots"
                                : `${slotsForDate.length} slot(s)`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Removed One-Time Slots editor as requested */}
            </div>

            {/* Images */}
            <label className="block font-semibold my-5">
              Add Thumbnail Images ( Maximum 5 Images )
            </label>
            <div className="mb-6">
              {(!formData?.oneTimeSubscription?.images ||
                formData?.oneTimeSubscription?.images.length < 5) && (
                <label
                  className={`w-56 h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 ${Object.keys(isImageUploading || {}).length > 0 ? "pointer-events-none opacity-75" : ""}`}
                >
                  <img
                    src="/assets/admin/upload.svg"
                    alt="Upload Icon"
                    className="w-10 h-10 mb-2"
                  />
                  <span>
                    Click to upload image
                    <br />
                    Size: (1126×626)px
                  </span>
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

              {/* Upload Progress Indicators */}
              {Object.entries(isImageUploading || {}).map(
                ([uploadId, isUploading]) => {
                  if (!isUploading) return null;
                  const progress = imageUploadProgress[uploadId] || 0;
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
                        onClick={() => openImageEditor(img, 'oneTime', index)}
                        className="absolute top-1 left-1 bg-blue-500 text-white border border-blue-600 rounded-md px-2 py-1 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-1"
                        title="Edit Image - Resize, Crop, Rotate"
                      >
                        <Edit2 size={12} />
                        <span className="text-xs font-semibold">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1
                                        hover:bg-gray-200"
                        title="Remove"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Videos */}
            <label className="block font-semibold my-5">
              Add Thumbnail Videos ( Maximum 6 Videos )
            </label>
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

              {/* Upload Progress Indicators */}
              {Object.entries(isVideoUploading || {}).map(
                ([uploadId, isUploading]) => {
                  if (!isUploading) return null;
                  const progress = videoUploadProgress[uploadId] || 0;
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
                                      removeProgramPoint(
                                        programIndex,
                                        pointIndex,
                                      )
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
                                    {point.subpoints.map(
                                      (subpoint, subIndex) => (
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
                                      ),
                                    )}
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
                            onClick={() => openImageEditor(feature.image, 'feature', index)}
                            className="absolute top-1 left-1 bg-blue-500 text-white border border-blue-600 rounded-md px-2 py-1 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-1"
                            title="Edit Image - Resize, Crop, Rotate"
                          >
                            <Edit2 size={12} />
                            <span className="text-xs font-semibold">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleFeatureChange(index, "image", null)
                            }
                            className="absolute top-1 right-1 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-200"
                            title="Remove"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <label
                            htmlFor={`feature-upload-${index}`}
                            className="w-full h-40 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                          >
                            <img
                              src="/assets/admin/upload.svg"
                              alt="Upload Icon"
                              className="w-12 h-12 mb-2"
                            />
                            <span>Click to upload feature icon</span>
                            <input
                              id={`feature-upload-${index}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleFeatureImageChange(
                                  index,
                                  e.target.files[0],
                                )
                              }
                              className="hidden"
                            />
                          </label>
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
                    onClick={() => openImageEditor(formData.guide[0].image, 'guide')}
                    className="absolute top-2 left-2 bg-blue-500 text-white border border-blue-600 rounded-md px-3 py-2 hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                    title="Edit Image - Resize, Crop, Rotate"
                  >
                    <Edit2 size={16} />
                    <span className="text-xs font-semibold">Edit Size</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGuideImageRemove}
                    className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-2 hover:bg-gray-200"
                    title="Remove Image"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : isGuideUploading ? (
                <div className="max-w-xs aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center mb-4">
                  <div className="text-center flex flex-col items-center">
                    <div className="relative w-12 h-12 mb-3">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div
                        className="absolute inset-0 border-4 border-[#2F6288] rounded-full border-t-transparent animate-spin"
                        style={{
                          background: `conic-gradient(from 0deg, #2F6288 ${guideUploadProgress * 3.6}deg, transparent ${guideUploadProgress * 3.6}deg)`,
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-[#2F6288]">
                          {guideUploadProgress}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[#2F6288] font-medium">
                      Uploading Guide Image...
                    </p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-[#2F6288] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${guideUploadProgress}%` }}
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
                    <span className="text-sm text-gray-400">
                      Size: (400×540)px
                    </span>
                    <input
                      id="guide-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleGuideImageChange(e.target.files[0])
                      }
                      className="hidden"
                      disabled={isGuideUploading}
                    />
                  </label>
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
              onClick={onSaveLive}
              className="text-sm flex p-4 bg-gradient-to-b from-[#C5703F] to-[#C16A00] text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
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

          {/* Current Recorded Sessions */}
          {allData && (
            <div className="mt-8">
              <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl mb-6">
                Current Live Sessions{" "}
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
      </div>

      {/* Image Editor Modal */}
      {isImageEditorOpen && editingImage && (
        <ImageEditor
          imageUrl={editingImage}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
        />
      )}

      {/* Loading Overlay - Shows while saving edited image */}
      {isSavingEditedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Saving Image...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we upload your changes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
