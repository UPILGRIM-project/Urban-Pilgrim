import { useState } from "react";
import { FiUser, FiMail, FiSend, FiPhone } from "react-icons/fi";
import SEO from "../../components/SEO.jsx";
import { functions } from "../../services/firebase.js";
import { httpsCallable } from "firebase/functions";


export default function ContactForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setSubmitStatus({ type: "error", message: "Name is required" });
            return false;
        }
        if (!formData.email.trim()) {
            setSubmitStatus({ type: "error", message: "Email is required" });
            return false;
        }
        if (!formData.email.includes("@")) {
            setSubmitStatus({ type: "error", message: "Please enter a valid email" });
            return false;
        }
        if (!formData.message.trim()) {
            setSubmitStatus({ type: "error", message: "Message is required" });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            // Call the Firebase Function
            const sendContactEmail = httpsCallable(functions, 'sendContactEmail');
            await sendContactEmail({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message
            });

            setSubmitStatus({ type: "success", message: "Message sent successfully! We'll get back to you soon." });
            
            // Reset form
            setFormData({
                name: "",
                email: "",
                phone: "",
                message: ""
            });

        } catch (error) {
            console.error("Error sending contact form:", error);
            setSubmitStatus({ 
                type: "error", 
                message: "Failed to send message. Please try again later." 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <SEO
                title="Contact Us | Urban Pilgrim"
                description="Get in touch with the Urban Pilgrim team for questions about wellness sessions, retreats, or becoming a guide."
                keywords="contact urban pilgrim, wellness inquiries, become a guide, customer support"
                canonicalUrl="/contact"
            />
            
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eaeefc] via-[#f3e8e1] to-[#fdfaf7] px-4 mt-[100px]">
                <div className="bg-white/60 backdrop-blur-3xl rounded-xl shadow-lg w-full max-w-md p-8">
                    <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>

                    {/* Status Message */}
                    {submitStatus && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${
                            submitStatus.type === "success" 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : "bg-red-100 text-red-700 border border-red-200"
                        }`}>
                            {submitStatus.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Name */}
                        <div className="mb-4">
                            <label className="text-sm font-medium block mb-1">Name *</label>
                            <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
                                <FiUser className="text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter your name..."
                                    className="w-full py-2 outline-none rounded-full"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="mb-4">
                            <label className="text-sm font-medium block mb-1">Email Address *</label>
                            <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
                                <FiMail className="text-gray-400 mr-2" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email address..."
                                    className="w-full py-2 outline-none rounded-full"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="mb-4">
                            <label className="text-sm font-medium block mb-1">Phone Number</label>
                            <div className="flex items-center bg-white rounded-full px-3 shadow-sm">
                                <FiPhone className="text-gray-400 mr-2" />
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter your phone number..."
                                    className="w-full py-2 outline-none rounded-full"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="mb-6">
                            <label className="text-sm font-medium block mb-1">Message *</label>
                            <textarea
                                name="message"
                                rows={4}
                                maxLength={300}
                                placeholder="Enter your message here..."
                                className="w-full rounded-xl p-3 resize-none shadow-sm outline-none bg-white"
                                value={formData.message}
                                onChange={handleInputChange}
                                required
                            />
                            <div className="text-right text-xs text-gray-500">{formData.message.length}/300</div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full bg-gradient-to-r from-[#d47b30] to-[#b85a18] text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                                isSubmitting 
                                    ? "opacity-50 cursor-not-allowed" 
                                    : "hover:shadow-lg hover:scale-[1.02]"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Send Message <FiSend size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
