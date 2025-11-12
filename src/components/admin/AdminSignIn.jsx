import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { auth, db, functions } from "../../services/firebase";
import { useDispatch } from "react-redux";
import { doc, getDoc } from "firebase/firestore";
import { setAdmin } from "../../features/adminAuthSlice";
import { showError, showSuccess } from "../../utils/toast";
import Loader2 from "../Loader2";

export default function AdminSignIn() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1: enter email, 2: enter OTP
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const sendOtp = async () => {
        if (!email) return alert("Enter email!");

        try {
            setLoading(true);
            const sendOtpFn = httpsCallable(functions, "sendAdminOtp");
            const result = await sendOtpFn({ email });
            setStep(2);
            showSuccess("OTP sent to your admin email!");
        } catch (err) {
            console.error(err);
            showError(err.message || "Failed to send OTP. Please check if you're an authorized admin.");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) return alert("Enter OTP!");
        try {
            setLoading(true);
            const verifyOtpFn = httpsCallable(functions, "verifyAdminOtp");
            const res = await verifyOtpFn({ email, otp });

            // Sign in using custom token (admin data is already validated in backend)
            const result = await signInWithCustomToken(auth, res.data.token);
            const user = result.user;

            // Set admin data from the backend response (no need to check Firestore again)
            dispatch(setAdmin({
                uid: user.uid,
                email: user.email,
                role: res.data.adminData?.role || 'admin',
                permissions: res.data.adminData?.permissions || []
            }));

            showSuccess("Admin signed in successfully!");
        } catch (err) {
            console.error(err);
            showError(err.message || "Invalid OTP or unauthorized access");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>

            <div className="relative z-10 rounded-2xl bg-white/50 shadow-lg w-full max-w-xl px-8 py-12 text-center">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-20">
                        <Loader2 />
                    </div>
                )}

                <h2 className="text-3xl font-bold mb-3">Admin Sign in</h2>
                <p className="text-gray-600 text-sm mb-6">
                    {step === 1
                        ? "Enter your admin email and we'll send you a verification code"
                        : "Enter the OTP sent to your admin email"}
                </p>

                {step === 1 ? (
                    <input
                        type="email"
                        placeholder="Enter your admin email address..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    />
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
                    className="w-full bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white font-semibold py-2 rounded-lg hover:from-[#C5703F]/90 hover:to-[#C16A00]/90 transition disabled:opacity-60"
                >
                    {loading ? (step === 1 ? "Sending..." : "Verifying...") : (step === 1 ? "Continue →" : "Verify OTP →")}
                </button>

                <p className="text-xs text-left text-gray-500 mt-4 cursor-pointer hover:underline">
                    Admin Privacy Policy
                </p>
            </div>
        </div>
    );
}
