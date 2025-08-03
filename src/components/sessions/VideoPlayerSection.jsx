import { useState } from "react";
import { motion } from "framer-motion";
import { FiPlay } from "react-icons/fi";
import ReactPlayer from "react-player";

const videos = [
  {
    id: 1,
    title: "Part 1 – Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
    src: "https://www.youtube.com/watch?v=JgDNFQ2RaLQ",
    thumbnail: "https://img.youtube.com/vi/JgDNFQ2RaLQ/hqdefault.jpg"
  },
  {
    id: 2,
    title: "Part 2 – Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
    src: "https://www.youtube.com/watch?v=JgDNFQ2RaLQ",
    thumbnail: "https://img.youtube.com/vi/JgDNFQ2RaLQ/hqdefault.jpg"
  },
  {
    id: 3,
    title: "Part 3 – Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
    src: "https://www.youtube.com/watch?v=JgDNFQ2RaLQ",
    thumbnail: "https://img.youtube.com/vi/JgDNFQ2RaLQ/hqdefault.jpg"
  },
  {
    id: 4,
    title: "Part 4 – Discover Your True Self – A 28 Day Soul Search Journey With Rohini Singh Sisodia",
    src: "https://www.youtube.com/watch?v=JgDNFQ2RaLQ",
    thumbnail: "https://img.youtube.com/vi/JgDNFQ2RaLQ/hqdefault.jpg"
  },
];

export default function YouTubeVideoPlaylist() {
  const [currentVideo, setCurrentVideo] = useState(videos[0]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="aspect-video rounded-xl overflow-hidden">
        <ReactPlayer
          src={currentVideo.src}
          controls
          width="100%"
          height="100%"
          className="rounded-xl"
        />
      </div>

      <h3 className="text-lg font-semibold mt-4">
        {currentVideo.title}
      </h3>

      <div className="mt-6 bg-white border rounded-xl p-4">
        <p className="text-sm font-medium mb-4">All Videos ({videos.length})</p>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {videos.map((video) => (
            <motion.div
              key={video.id}
              whileHover={{ scale: 1 }}
              onClick={() => setCurrentVideo(video)}
              className="flex items-center gap-4 cursor-pointer rounded-md p-2 hover:bg-gray-100 transition"
            >
              <div className="relative w-28 h-16 overflow-hidden rounded-md flex-shrink-0">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <FiPlay className="text-white w-4 h-4" />
                </span>
              </div>
              <p className="text-sm">{video.title}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
