import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { auth, db, functions } from "../services/firebase";
import { useDispatch } from "react-redux";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setUser } from "../features/authSlice";
import { setUserPrograms } from "../features/userProgramsSlice";
import { showError, showSuccess } from "../utils/toast";
import store from "../redux/store";
import Loader2 from "../components/Loader2"
import { useNavigate } from "react-router-dom";

export default function SignIn({ onClose }) {
    const [email, setEmail] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1: enter email, 2: enter OTP
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [whatsappError, setWhatsappError] = useState("");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // b123076@iiit-bh.ac.in

    const sendOtp = async () => {
        // Clear previous errors
        setEmailError("");
        setWhatsappError("");

        // Validate email
        if (!email) {
            setEmailError("Please enter your email!");
            return;
        }
        
        // Validate WhatsApp number
        if (!whatsappNumber) {
            setWhatsappError("Please enter your WhatsApp number!");
            return;
        }
        if (whatsappNumber.length !== 10) {
            setWhatsappError("WhatsApp number must be 10 digits!");
            return;
        }
        
        try {
            setLoading(true);
            const sendOtpFn = httpsCallable(functions, "sendOtp");
            const result = await sendOtpFn({ email, whatsappNumber });
            setStep(2);
            showSuccess("OTP sent to your email!");
        } catch (err) {
            console.error(err);
            showError("Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) return alert("Enter OTP!");
        try {
            setLoading(true);
            const verifyOtpFn = httpsCallable(functions, "verifyOtp");
            const res = await verifyOtpFn({ email, otp });

            // 🔑 Sign in using custom token
            const result = await signInWithCustomToken(auth, res.data.token);
            const user = result.user;

            // 🔍 Check if user exists in Firestore
            const userRef = doc(db, "users", user.uid, "info", "details");
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // 🆕 Create new user
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    whatsappNumber: whatsappNumber,
                    createdAt: new Date(),
                });
            } else {
                // Update WhatsApp number if changed
                const existingData = userSnap.data();
                if (existingData.whatsappNumber !== whatsappNumber) {
                    await setDoc(userRef, {
                        whatsappNumber: whatsappNumber,
                    }, { merge: true });
                }
            }

            dispatch(setUser({
                uid: user.uid,
                email: user.email,
                whatsappNumber: whatsappNumber
            }));

            // 📚 Fetch user programs immediately after login
            try {
                const userProgramsRef = doc(db, "users", user.uid, "info", "details");
                const userProgramsSnap = await getDoc(userProgramsRef);
                
                if (userProgramsSnap.exists()) {
                    const userData = userProgramsSnap.data();
                    const programs = userData.yourPrograms || [];
                    dispatch(setUserPrograms(programs));
                } else {
                    dispatch(setUserPrograms([]));
                }
            } catch (error) {
                console.error("Error fetching user programs on login:", error);
                dispatch(setUserPrograms([]));
            }

            showSuccess("Signed in successfully!");
            onClose();
        } catch (err) {
            console.error(err);
            showError("Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen fixed inset-0 z-50 px-10">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

            <div className="relative z-10 rounded-2xl bg-white/50 shadow-lg w-full max-w-xl md:px-8 px-4 md:py-12 py-8 text-center">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-20">
                        <Loader2 />
                    </div>
                )}
                <button className="absolute top-4 right-4 text-gray-500 hover:text-black text-2xl" onClick={onClose} disabled={loading}>&times;</button>

                <h2 className="text-3xl font-bold mb-3">Sign in</h2>
                <p className="text-gray-600 text-sm mb-6">
                    {step === 1
                        ? "Enter your email and WhatsApp number to receive a verification code"
                        : "Enter the OTP sent to your email"}
                </p>

                {step === 1 ? (
                    <div className="space-y-4">
                        {/* email */}
                        <div>
                            <input
                                type="email"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError("");
                                }}
                                disabled={loading}
                                required
                                className={`w-full md:text-base text-sm border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                    emailError 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-orange-500'
                                }`}
                            />
                            {emailError && (
                                <p className="text-red-500 text-xs text-left mt-1 ml-1">{emailError}</p>
                            )}
                        </div>

                        {/* whatsapp */}
                        <div>
                            <input
                                type="tel"
                                placeholder="9876543210"
                                value={whatsappNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 10) {
                                        setWhatsappNumber(value);
                                        setWhatsappError("");
                                    }
                                }}
                                disabled={loading}
                                required
                                maxLength={10}
                                className={`w-full md:text-base text-sm border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                    whatsappError 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-orange-500'
                                }`}
                            />
                            {whatsappError && (
                                <p className="text-red-500 text-xs text-left mt-1 ml-1">{whatsappError}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <input
                        type="text"
                        placeholder="Enter OTP..."
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    />
                )}

                <button
                    onClick={step === 1 ? sendOtp : verifyOtp}
                    disabled={loading}
                    className="w-full mt-3 md:text-base text-sm bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white font-semibold py-2 rounded-lg hover:from-[#C5703F]/90 hover:to-[#C16A00]/90 transition disabled:opacity-60"
                >
                    {loading ? (step === 1 ? "Sending..." : "Verifying...") : (step === 1 ? "Continue →" : "Verify OTP →")}
                </button>

                <p 
                    onClick={() => {
                        navigate("/privacy-policy")
                        onClose();
                    }} 
                    className="text-xs w-fit text-left text-gray-500 mt-4 cursor-pointer hover:underline"
                >
                    Privacy Policy
                </p>
            </div>
        </div>
    );
}
