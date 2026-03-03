import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FiPlay } from "react-icons/fi";
import DOMPurify from "dompurify";

// Extract YouTube video ID from any YouTube URL format
const extractYouTubeId = (url) => {
    if (!url) return null;
    const u = String(url);
    const vMatch = u.match(/[?&]v=([^&]+)/);
    if (vMatch) return vMatch[1];
    const shortMatch = u.match(/youtu\.be\/([^?&\/]+)/);
    if (shortMatch) return shortMatch[1];
    const embMatch = u.match(/embed\/([^?&\/]+)/);
    if (embMatch) return embMatch[1];
    return null;
};

// Normalize any video value (string URL or object with various field names) to { id, src, thumbnail, title, description }
const resolveVideoObject = (video) => {
    if (!video) return null;
    if (typeof video === "string") {
        const yt = extractYouTubeId(video);
        return {
            id: yt || video,
            src: video,
            thumbnail: yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null,
            title: "",
            description: "",
        };
    }
    const src = video.src || video.url || video.video || video.link || null;
    if (!src) return null;
    const yt = extractYouTubeId(src);
    return {
        id: video.id || yt || src,
        src,
        thumbnail: video.thumbnail || video.image || video.thumb ||
            (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null),
        title: video.title || video.name || video.label || "",
        description: video.description || video.desc || "",
    };
};

export default function YouTubeVideoPlaylist({ videos = []}) {
    const normalizedVideos = useMemo(() => {
        if (!Array.isArray(videos)) return [];
        return videos.map(resolveVideoObject).filter(Boolean);
    }, [videos]);

    const [currentVideo, setCurrentVideo] = useState(() => normalizedVideos[0] || null);

    if (!currentVideo || normalizedVideos.length === 0) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-10 text-center">
                <div className="text-gray-400 text-lg mb-2">🎥</div>
                <p className="text-gray-600 text-lg font-medium">No videos available</p>
                <p className="text-gray-500 text-sm mt-1">Check back later for new content</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
                {extractYouTubeId(currentVideo?.src) ? (
                    <iframe
                        key={currentVideo?.id}
                        src={`https://www.youtube.com/embed/${extractYouTubeId(currentVideo?.src)}?autoplay=1`}
                        title={currentVideo?.title || "Video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-xl"
                    />
                ) : (
                    <video
                        key={currentVideo?.id}
                        src={currentVideo?.src}
                        controls
                        autoPlay
                        className="w-full h-full rounded-xl"
                    />
                )}
            </div>

            {currentVideo?.title && (
                <h3 className="text-lg font-semibold mt-4">{currentVideo.title}</h3>
            )}

            {currentVideo?.description && (
                <div
                    className="text-gray-600 mt-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentVideo.description) }}
                />
            )}

            <div className="mt-6 bg-white border rounded-xl p-4">
                <p className="text-sm font-medium mb-4">All Videos ({normalizedVideos.length})</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {normalizedVideos.map((video, index) => (
                        <motion.div
                            key={video.id || index}
                            whileHover={{ scale: 1 }}
                            onClick={() => setCurrentVideo(video)}
                            className={`flex items-center gap-4 cursor-pointer rounded-md p-2 hover:bg-gray-100 transition ${currentVideo?.id === video.id ? 'bg-blue-50 border border-blue-200' : ''}`}
                        >
                            <div className="relative w-28 h-16 overflow-hidden rounded-md flex-shrink-0">
                                {video.thumbnail ? (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title || `Video ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <FiPlay className="text-gray-400 w-5 h-5" />
                                    </div>
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <FiPlay className="text-white w-4 h-4" />
                                </span>
                            </div>
                            <p className="text-sm">{video.title || `Video ${index + 1}`}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
