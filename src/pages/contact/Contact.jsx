import { useState } from "react";
import { FiUser, FiMail, FiSend } from "react-icons/fi";
import Footer from "../../components/footer";

export default function ContactForm() {
  const [comment, setComment] = useState("");

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eaeefc] via-[#f3e8e1] to-[#fdfaf7] px-4 mt-[100px]">
      <div className="bg-white/60 backdrop-blur-3xl rounded-xl shadow-lg w-full max-w-md p-8">
        <h2 className="text-3xl font-bold text-center mb-8">Contact</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Name</label>
          <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
            <FiUser className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Enter your name..."
              className="w-full py-2 outline-none rounded-full"
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Email Address</label>
          <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
            <FiMail className="text-gray-400 mr-2" />
            <input
              type="email"
              placeholder="Enter your email address..."
              className="w-full py-2 outline-none rounded-full"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Phone Number</label>
          <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
            <img src="https://flagcdn.com/in.svg" alt="India" className="h-5 w-5 mr-2" />
            <input
              type="tel"
              placeholder="+91 (000)000-000"
              className="w-full py-2 outline-none rounded-full"
            />
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Comment</label>
          <textarea
            rows={4}
            maxLength={300}
            placeholder="Enter your main text here.."
            className="w-full rounded-xl p-3 resize-none shadow-sm outline-none bg-white"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="text-right text-xs text-gray-500">{comment.length}/300</div>
        </div>

        {/* Button */}
        <button className="w-full bg-gradient-to-r from-[#d47b30] to-[#b85a18] text-white py-2 rounded-full font-semibold flex items-center justify-center gap-2">
          Send <FiSend size={16} />
        </button>
      </div>
    </div>
    </>
  );
}
