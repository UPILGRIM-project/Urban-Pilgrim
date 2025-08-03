import { motion } from "framer-motion";

const images = [
  "https://picsum.photos/id/1018/600/400",
  "https://picsum.photos/id/1015/100/100",
  "https://picsum.photos/id/1016/100/100",
  "https://picsum.photos/id/1019/100/100",
];

export default function ImageGallery() {
  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      {/* Main Image */}
      <motion.img
        src={images[0]}
        alt="Main"
        className="w-full max-w-full h-[60vh] object-cover rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Thumbnail Column */}
      <div className="flex flex-col gap-3">
        {images.slice(1, 3).map((img, idx) => (
          <motion.img
            key={idx}
            src={img}
            alt={`thumb-${idx}`}
            className="w-full h-full object-cover rounded-xl"
            whileHover={{ scale: 1.05 }}
          />
        ))}
        <div className="w-full h-full relative rounded-xl overflow-hidden">
          <img
            src={images[3]}
            alt="thumb-3"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-semibold">
            +2
          </div>
        </div>
      </div>
    </div>
  );
}
