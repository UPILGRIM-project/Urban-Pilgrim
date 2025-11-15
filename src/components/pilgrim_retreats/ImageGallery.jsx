import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ImageGallery({ images = [], videos = [] }) {
    // Combine images and videos into a single media array
    const allMedia = [...images, ...videos];
    const [mainMedia, setMainMedia] = useState(allMedia[0]);
    const [showAllMedia, setShowAllMedia] = useState(false);

    const isVideo = (url) => {
        return url && (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('video'));
    };

    const handleMediaClick = (clickedMedia) => {
        setMainMedia(clickedMedia);
    };

    const handleShowAllMedia = () => {
        setShowAllMedia(true);
    };

    const handleCloseModal = () => {
        setShowAllMedia(false);
    };
    
    useEffect(() => {
        if (allMedia.length > 0) {
            setMainMedia(allMedia[0]);
        }
    }, [images, videos]);

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto">
                {/* Main Media - only show if more than 3 items */}
                {allMedia.length > 3 && (
                    <>
                        {isVideo(mainMedia) ? (
                            <motion.video
                                src={mainMedia}
                                controls
                                className="w-full md:w-5/6 xl:h-[60vh] lg:h-[60vh] md:h-[60vh] h-auto object-cover rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                key={mainMedia}
                            />
                        ) : (
                            <motion.img
                                src={mainMedia}
                                alt="Main"
                                className="w-full md:w-5/6 xl:h-[60vh] lg:h-[60vh] md:h-[60vh] h-auto object-cover rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                key={mainMedia}
                            />
                        )}
                    </>
                )}

                {/* Thumbnail Column */}
                <div className={`flex md:flex-col flex-row gap-3 md:h-[60vh] ${allMedia.length <= 3 ? 'w-full' : 'md:w-1/6'}`}>
                    {(allMedia.length <= 3 ? allMedia : allMedia.slice(1, 3)).map((media, idx) => (
                        <div key={idx} className={`relative ${allMedia.length <= 3 ? 'w-1/3 md:w-full' : 'w-1/3 md:w-full'} flex-1 md:h-[18vh] h-auto rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
                             onClick={() => handleMediaClick(media)}>
                            {isVideo(media) ? (
                                <>
                                    <video
                                        src={media}
                                        className="w-full h-full object-cover rounded-xl"
                                        muted
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/50 rounded-full p-2">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <motion.img
                                    src={media}
                                    alt={`thumb-${idx}`}
                                    className="w-full h-full object-cover rounded-xl"
                                    whileHover={{ scale: 1.05 }}
                                />
                            )}
                        </div>
                    ))}

                    {/* Overlay Media - only show if more than 3 items */}
                    {allMedia.length > 3 && (
                        <div 
                            className="relative w-1/3 md:w-full flex-1 md:h-[18vh] h-auto rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={handleShowAllMedia}
                        >
                            {isVideo(allMedia[3]) ? (
                                <video
                                    src={allMedia[3]}
                                    className="w-full h-full object-cover"
                                    muted
                                />
                            ) : (
                                <img
                                    src={allMedia[3]}
                                    alt="thumb-3"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-semibold">
                                +{allMedia.length - 3}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for All Media */}
            {showAllMedia && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-6xl max-h-[90vh] w-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-xl font-semibold">All Media</h3>
                            <button 
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Scrollable Media Grid */}
                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {allMedia.map((media, idx) => (
                                    <div key={idx} className="relative w-full h-48 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                         onClick={() => {
                                             handleMediaClick(media);
                                             handleCloseModal();
                                         }}>
                                        {isVideo(media) ? (
                                            <>
                                                <video
                                                    src={media}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="bg-black/50 rounded-full p-3">
                                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <motion.img
                                                src={media}
                                                alt={`gallery-${idx}`}
                                                className="w-full h-full object-cover"
                                                whileHover={{ scale: 1.02 }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
