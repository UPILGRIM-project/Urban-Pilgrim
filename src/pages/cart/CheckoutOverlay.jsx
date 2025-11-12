import { useState, useEffect } from "react";

export default function CheckoutOverlay({ cartData, total, onClose, onConfirm, isLoggedIn = false, user = null, sendOtp, verifyOtp }) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        address: "",
        email: "",
        whatsappNumber: "",
        city: "",
        state: "",
        pin: "",
    });

    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [errors, setErrors] = useState({});
    const [emailError, setEmailError] = useState("");
    const [whatsappError, setWhatsappError] = useState("");

    // Auto-populate email and WhatsApp number when user is logged in
    useEffect(() => {
        if (isLoggedIn && user) {
            setFormData(prev => ({
                ...prev,
                email: user.email || '',
                // Only update whatsappNumber if user has it and field is empty
                whatsappNumber: user.whatsappNumber || prev.whatsappNumber
            }));
            setEmailVerified(true); // Skip email verification for logged-in users
        }
    }, [isLoggedIn, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Handle WhatsApp number - only allow digits
        if (name === 'whatsappNumber') {
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly.length <= 10) {
                setFormData({ ...formData, [name]: digitsOnly });
                setWhatsappError("");
            }
        } else {
            setFormData({ ...formData, [name]: value });
            if (name === 'email') {
                setEmailError("");
            }
        }
        
        // Clear field error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const isValidWhatsapp = (value) => {
        const digits = (value || "").replace(/\D/g, "");
        return digits.length === 10;
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.firstName?.trim()) newErrors.firstName = "First name is required";
        if (!formData.lastName?.trim()) newErrors.lastName = "Last name is required";
        if (!formData.address?.trim()) newErrors.address = "Address is required";
        if (!isValidWhatsapp(formData.whatsappNumber)) newErrors.whatsappNumber = "Enter a valid 10-digit WhatsApp number";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSendOtp = async () => {
        // Clear previous errors
        setEmailError("");
        setWhatsappError("");

        // Validate email
        if (!formData.email) {
            setEmailError("Please enter your email!");
            return;
        }
        
        // Validate WhatsApp number
        if (!formData.whatsappNumber) {
            setWhatsappError("Please enter your WhatsApp number!");
            return;
        }
        if (formData.whatsappNumber.length !== 10) {
            setWhatsappError("WhatsApp number must be 10 digits!");
            return;
        }

        try {
            setSending(true);
            if (typeof sendOtp === 'function') {
                await sendOtp(formData.email, formData.whatsappNumber);
            } else {
                console.warn("sendOtp prop not provided. Wire this to your auth service.");
            }
            setOtpSent(true);
        } catch (err) {
            console.error("Failed to send OTP:", err);
        } finally {
            setSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!formData.email || !otp) return;
        try {
            setVerifying(true);
            if (typeof verifyOtp === 'function') {
                const ok = await verifyOtp(formData.email, otp, formData.whatsappNumber);
                if (ok === false) {
                    setEmailVerified(false);
                    return;
                }
            } else {
                console.warn("verifyOtp prop not provided. Wire this to your auth service.");
            }
            setEmailVerified(true);
        } catch (err) {
            console.error("Failed to verify OTP:", err);
            setEmailVerified(false);
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }
        // Require email verification if not logged in
        if (!isLoggedIn && !emailVerified) {
            alert("Please verify your email to continue.");
            return;
        }
        onConfirm(formData); // Pass form data back to parent (parent should trigger Razorpay)
    };


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-[95vw] max-w-lg p-4 sm:p-6 shadow-lg relative">
                <button className="absolute top-3 right-3 text-gray-500" onClick={onClose}>✖</button>
                <h2 className="text-2xl font-bold mb-4">Billing address</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email field - always show, but read-only for logged-in users */}
                    <div className="space-y-2">
                        <div>
                            <input 
                                name="email" 
                                type="email" 
                                placeholder="Email (e.g., example@gmail.com)" 
                                value={formData.email} 
                                onChange={handleChange} 
                                className={`w-full border p-2 rounded ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''} ${
                                    emailError ? 'border-red-500' : ''
                                }`}
                                readOnly={isLoggedIn}
                                required
                            />
                            {emailError && (
                                <p className="text-red-500 text-xs text-left mt-1 ml-1">{emailError}</p>
                            )}
                        </div>

                        {/* WhatsApp Number field - always show, but read-only for logged-in users */}
                        <div>
                            <input 
                                name="whatsappNumber" 
                                type="tel" 
                                placeholder="WhatsApp Number (e.g., 9876543210)" 
                                value={formData.whatsappNumber} 
                                onChange={handleChange} 
                                maxLength={10}
                                className={`w-full border p-2 rounded ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''} ${
                                    whatsappError ? 'border-red-500' : ''
                                }`}
                                readOnly={isLoggedIn}
                                required
                            />
                            {whatsappError && (
                                <p className="text-red-500 text-xs text-left mt-1 ml-1">{whatsappError}</p>
                            )}
                        </div>

                        {!isLoggedIn && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                                {!otpSent ? (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        className="px-3 py-2 text-sm rounded bg-[#2F6288] text-white disabled:opacity-50 w-full sm:w-auto"
                                        disabled={sending || !formData.email || !formData.whatsappNumber}
                                    >
                                        {sending ? "Sending..." : "Send OTP"}
                                    </button>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Enter OTP"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="w-full sm:flex-1 border p-2 rounded"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleVerifyOtp}
                                            className="px-3 py-2 text-sm rounded bg-[#2F6288] text-white disabled:opacity-50 w-full sm:w-auto"
                                            disabled={verifying || !otp}
                                        >
                                            {verifying ? "Verifying..." : (emailVerified ? "Verified" : "Verify OTP")}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex-1">
                            <input name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} className={`w-full border p-2 rounded ${errors.firstName ? 'border-red-500' : ''}`} />
                            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
                        </div>
                        <div className="flex-1">
                            <input name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} className={`w-full border p-2 rounded ${errors.lastName ? 'border-red-500' : ''}`} />
                            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <input name="address" placeholder="Address" value={formData.address} onChange={handleChange} className={`w-full border p-2 rounded ${errors.address ? 'border-red-500' : ''}`} />
                        {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="min-w-0">
                            <input name="city" placeholder="City" value={formData.city} onChange={handleChange} className={`w-full border p-2 rounded ${errors.city ? 'border-red-500' : ''}`} />
                            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                        </div>
                        <div className="min-w-0">
                            <input name="state" placeholder="State" value={formData.state} onChange={handleChange} className={`w-full border p-2 rounded ${errors.state ? 'border-red-500' : ''}`} />
                            {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state}</p>}
                        </div>
                        <div className="min-w-0">
                            <input name="pin" placeholder="PIN code" value={formData.pin} onChange={handleChange} className={`w-full border p-2 rounded ${errors.pin ? 'border-red-500' : ''}`} />
                            {errors.pin && <p className="text-xs text-red-600 mt-1">{errors.pin}</p>}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-[#C5703F] hover:bg-[#C16A00] text-white py-2 rounded-lg font-semibold disabled:opacity-60"
                        disabled={!isLoggedIn && !emailVerified}
                    >
                        Pay now
                    </button>
                </form>
            </div>
        </div>
    );
}
