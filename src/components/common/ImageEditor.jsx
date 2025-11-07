import { useState, useRef, useEffect } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Check, Crop } from "lucide-react";

const ImageEditor = ({ imageUrl, onSave, onCancel }) => {
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [customWidth, setCustomWidth] = useState("");
    const [customHeight, setCustomHeight] = useState("");
    const [aspectRatio, setAspectRatio] = useState(undefined);
    const [lockAspect, setLockAspect] = useState(false);
    const [proxyImageUrl, setProxyImageUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [imageFormat, setImageFormat] = useState("image/jpeg");
    const imgRef = useRef(null);
    const canvasRef = useRef(null);

    // Convert Firebase URL to Data URL to avoid CORS issues
    useEffect(() => {
        const convertToDataURL = async () => {
            setIsLoading(true);
            
            try {
                // Fetch the image as a blob with no-cors mode to bypass CORS
                const response = await fetch(imageUrl);
                
                const blob = await response.blob();
                
                // Detect image format
                setImageFormat(blob.type || "image/jpeg");
                
                // Convert blob to data URL
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProxyImageUrl(reader.result);
                    setIsLoading(false);
                };
                reader.onerror = () => {
                    console.error("FileReader error, creating data URL via canvas");
                    // Try alternative method using canvas
                    createDataURLViaCanvas();
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error("Error fetching image:", error);
                createDataURLViaCanvas();
            }
        };

        const createDataURLViaCanvas = () => {
            // Alternative: Load image and convert to data URL using canvas
            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";
            
            tempImg.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = tempImg.naturalWidth;
                tempCanvas.height = tempImg.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(tempImg, 0, 0);
                
                try {
                    const dataUrl = tempCanvas.toDataURL('image/png');
                    setProxyImageUrl(dataUrl);
                    setImageFormat('image/png');
                } catch (err) {
                    console.error("Canvas conversion failed:", err);
                    // Last resort: use original URL
                    setProxyImageUrl(imageUrl);
                    setImageFormat('image/jpeg');
                }
                setIsLoading(false);
            };
            
            tempImg.onerror = () => {
                console.error("Image load failed, using original URL");
                setProxyImageUrl(imageUrl);
                setImageFormat('image/jpeg');
                setIsLoading(false);
            };
            
            tempImg.src = imageUrl;
        };

        if (imageUrl) {
            convertToDataURL();
        }
    }, [imageUrl]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            
            if (!imgRef.current || !canvasRef.current) {
                console.error("Image ref or canvas ref not available");
                alert("Editor not ready. Please wait for image to load.");
                setIsSaving(false);
                return;
            }

            if (!proxyImageUrl) {
                console.error("Proxy image URL not loaded yet");
                alert("Image is still loading. Please wait a moment and try again.");
                setIsSaving(false);
                return;
            }

            const image = imgRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                throw new Error("No 2d context");
            }

            // Create a new image to load without CORS taint
            const cleanImage = new Image();
            
            await new Promise((resolve, reject) => {
                cleanImage.onload = () => {
                    try {
                        const scaleX = cleanImage.naturalWidth / image.width;
                        const scaleY = cleanImage.naturalHeight / image.height;

                        // Determine final dimensions
                        let finalWidth, finalHeight;
                        
                        if (customWidth || customHeight) {
                            // Use custom dimensions if provided
                            finalWidth = customWidth ? parseInt(customWidth) : cleanImage.naturalWidth;
                            finalHeight = customHeight ? parseInt(customHeight) : cleanImage.naturalHeight;
                            
                            // Maintain aspect ratio if only one dimension is specified
                            if (customWidth && !customHeight) {
                                const aspectRatio = cleanImage.naturalHeight / cleanImage.naturalWidth;
                                finalHeight = Math.round(finalWidth * aspectRatio);
                            } else if (customHeight && !customWidth) {
                                const aspectRatio = cleanImage.naturalWidth / cleanImage.naturalHeight;
                                finalWidth = Math.round(finalHeight * aspectRatio);
                            }
                        } else if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
                            // Use cropped dimensions
                            finalWidth = completedCrop.width * scaleX;
                            finalHeight = completedCrop.height * scaleY;
                        } else {
                            // Use original dimensions
                            finalWidth = cleanImage.naturalWidth;
                            finalHeight = cleanImage.naturalHeight;
                        }

                        // Set canvas size to final dimensions
                        canvas.width = finalWidth;
                        canvas.height = finalHeight;

                        ctx.save();

                        // Apply transformations
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate((rotation * Math.PI) / 180);
                        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                        ctx.scale(scale, scale);
                        ctx.translate(-canvas.width / 2, -canvas.height / 2);

                        // Draw the image
                        if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
                            // Draw cropped image
                            ctx.drawImage(
                                cleanImage,
                                completedCrop.x * scaleX,
                                completedCrop.y * scaleY,
                                completedCrop.width * scaleX,
                                completedCrop.height * scaleY,
                                0,
                                0,
                                canvas.width,
                                canvas.height
                            );
                        } else {
                            // Draw full image
                            ctx.drawImage(cleanImage, 0, 0, canvas.width, canvas.height);
                        }

                        ctx.restore();

                        console.log("Canvas drawn successfully, converting to blob...");

                        // Convert canvas to blob with the original image format
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                console.error("Canvas toBlob returned null");
                                reject(new Error("Failed to create blob from canvas"));
                                return;
                            }
                            
                            console.log("Blob created:", blob.size, "bytes");
                            
                            // Detect file extension from format
                            let extension = "jpg";
                            if (imageFormat.includes("png")) {
                                extension = "png";
                            } else if (imageFormat.includes("webp")) {
                                extension = "webp";
                            } else if (imageFormat.includes("gif")) {
                                extension = "gif";
                            }
                            
                            const file = new File([blob], `edited-image.${extension}`, {
                                type: imageFormat,
                            });
                            
                            console.log("File created, calling onSave...");
                            onSave(file);
                            resolve();
                        }, imageFormat, imageFormat.includes("png") ? 1.0 : 0.95);
                    } catch (err) {
                        console.error("Error in image processing:", err);
                        reject(err);
                    }
                };

                cleanImage.onerror = (error) => {
                    console.error("Error loading image for save:", error);
                    reject(new Error("Failed to load image"));
                };

                // Use proxyImageUrl which should be a data URL
                console.log("Loading image from proxy URL...");
                cleanImage.src = proxyImageUrl;
            });
            
            setIsSaving(false);
        } catch (error) {
            console.error("Error in handleSave:", error);
            alert(`Failed to save image: ${error.message}`);
            setIsSaving(false);
        }
    };

    const handlePresetCrop = (ratio) => {
        setAspectRatio(ratio);
        setLockAspect(true);
        // Reset crop to trigger new crop with aspect ratio
        setCrop(undefined);
        setTimeout(() => {
            if (imgRef.current) {
                const { width, height } = imgRef.current;
                let newCrop;
                
                if (ratio) {
                    const cropWidth = Math.min(width * 0.8, width);
                    const cropHeight = cropWidth / ratio;
                    
                    newCrop = {
                        unit: '%',
                        x: 10,
                        y: 10,
                        width: 80,
                        height: (cropHeight / height) * 100,
                    };
                } else {
                    newCrop = {
                        unit: '%',
                        x: 10,
                        y: 10,
                        width: 80,
                        height: 80,
                    };
                }
                setCrop(newCrop);
            }
        }, 100);
    };

    const handleResetCrop = () => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setAspectRatio(undefined);
        setLockAspect(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Image</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 border-b bg-gray-50 space-y-4">
                    {/* Dimension Controls */}
                    <div className="flex flex-wrap gap-3 items-center justify-center pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-700">Width (px):</label>
                            <input
                                type="number"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                placeholder="Auto"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-700">Height (px):</label>
                            <input
                                type="number"
                                value={customHeight}
                                onChange={(e) => setCustomHeight(e.target.value)}
                                placeholder="Auto"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setCustomWidth("");
                                setCustomHeight("");
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition"
                        >
                            Reset Size
                        </button>
                    </div>

                    {/* Crop Presets */}
                    <div className="flex flex-wrap gap-2 items-center justify-center pb-3 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">Crop Presets:</span>
                        <button
                            onClick={() => handlePresetCrop(1)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
                        >
                            <Crop className="w-3 h-3 inline mr-1" />
                            Square (1:1)
                        </button>
                        <button
                            onClick={() => handlePresetCrop(16/9)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
                        >
                            <Crop className="w-3 h-3 inline mr-1" />
                            Landscape (16:9)
                        </button>
                        <button
                            onClick={() => handlePresetCrop(4/3)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
                        >
                            <Crop className="w-3 h-3 inline mr-1" />
                            4:3
                        </button>
                        <button
                            onClick={() => handlePresetCrop(3/4)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
                        >
                            <Crop className="w-3 h-3 inline mr-1" />
                            Portrait (3:4)
                        </button>
                        <button
                            onClick={() => handlePresetCrop(undefined)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
                        >
                            <Crop className="w-3 h-3 inline mr-1" />
                            Free
                        </button>
                        <button
                            onClick={handleResetCrop}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition"
                        >
                            Clear Crop
                        </button>
                    </div>

                    {/* Transform Controls */}
                    <div className="flex flex-wrap gap-3 items-center justify-center">
                        <button
                            onClick={() => setRotation((prev) => (prev + 90) % 360)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            title="Rotate 90°"
                        >
                            <RotateCw className="w-4 h-4" />
                            <span className="text-sm">Rotate</span>
                        </button>

                        <button
                            onClick={() => setFlipH(!flipH)}
                            className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                                flipH
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Flip Horizontal"
                        >
                            <FlipHorizontal className="w-4 h-4" />
                            <span className="text-sm">Flip H</span>
                        </button>

                        <button
                            onClick={() => setFlipV(!flipV)}
                            className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                                flipV
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Flip Vertical"
                        >
                            <FlipVertical className="w-4 h-4" />
                            <span className="text-sm">Flip V</span>
                        </button>

                        <button
                            onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4" />
                            <span className="text-sm">Zoom +</span>
                        </button>

                        <button
                            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4" />
                            <span className="text-sm">Zoom -</span>
                        </button>

                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded">
                            <span className="text-sm text-gray-600">Scale:</span>
                            <span className="text-sm font-semibold">
                                {(scale * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Image Crop Area */}
                <div className="flex-1 overflow-auto p-4 bg-gray-100 flex flex-col items-center justify-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-gray-600">Loading image...</p>
                        </div>
                    ) : (
                        <>
                            {/* Image Info */}
                            {imgRef.current && (
                                <div className="mb-3 px-4 py-2 bg-white rounded shadow-sm text-sm">
                                    <span className="font-semibold text-gray-700">Original: </span>
                                    <span className="text-gray-600">{imgRef.current.naturalWidth} × {imgRef.current.naturalHeight} px</span>
                                    {completedCrop && completedCrop.width > 0 && (
                                        <>
                                            <span className="mx-2 text-gray-400">|</span>
                                            <span className="font-semibold text-blue-600">Crop: </span>
                                            <span className="text-gray-600">
                                                {Math.round(completedCrop.width * (imgRef.current.naturalWidth / imgRef.current.width))} × {Math.round(completedCrop.height * (imgRef.current.naturalHeight / imgRef.current.height))} px
                                            </span>
                                        </>
                                    )}
                                    {(customWidth || customHeight) && (
                                        <>
                                            <span className="mx-2 text-gray-400">|</span>
                                            <span className="font-semibold text-green-600">Output: </span>
                                            <span className="text-gray-600">
                                                {customWidth || "Auto"} × {customHeight || "Auto"} px
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                            
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                                locked={lockAspect}
                            >
                                <img
                                    ref={imgRef}
                                    src={proxyImageUrl}
                                    alt="Edit"
                                    style={{
                                        transform: `rotate(${rotation}deg) scale(${scale}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                                        maxWidth: "100%",
                                        maxHeight: "60vh",
                                    }}
                                />
                            </ReactCrop>
                        </>
                    )}
                </div>

                {/* Hidden Canvas for Processing */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className={`px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition ${
                            isSaving ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition ${
                            isSaving ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
