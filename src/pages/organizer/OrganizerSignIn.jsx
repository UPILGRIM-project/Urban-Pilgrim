import { useState } from "react";
import { useDispatch } from "react-redux";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { auth, functions } from "../../services/firebase";
import { setOrganizer, setOrganizerLoading, setOrganizerError } from "../../features/organizerAuthSlice";
import { showError, showSuccess } from "../../utils/toast";
import Loader2 from "../../components/Loader2";

export default function OrganizerSignIn() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleLogin = async () => {
        if (!name || !password) {
            showError("Enter username and password");
            return;
        }

        try {
            setLoading(true);
            dispatch(setOrganizerLoading(true));

            const organizerLoginFn = httpsCallable(functions, "organizerLogin");
            const res = await organizerLoginFn({ name, password });
            const token = res?.data?.token;
            const organizerData = res?.data?.organizer;

            if (!token || !organizerData) {
                throw new Error("Invalid login response");
            }

            await signInWithCustomToken(auth, token);

            const organizerPayload = {
                id: organizerData.id,
                uid: organizerData.uid,
                name: organizerData.name,
                email: organizerData.email || "",
                role: organizerData.role || "Organizer",
            };
            dispatch(setOrganizer(organizerPayload));
            showSuccess("Organizer signed in");
        } catch (err) {
            console.error("Organizer login error", err);
            dispatch(setOrganizerError("Login failed"));
            showError("Login failed");
        } finally {
            setLoading(false);
            dispatch(setOrganizerLoading(false));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen fixed inset-0 z-50 px-6">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative z-10 rounded-2xl bg-white/50 shadow-lg w-full max-w-xl md:px-8 px-4 md:py-12 py-8 text-center">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-20">
                        <Loader2 />
                    </div>
                )}
                <h2 className="text-3xl font-bold mb-3">Organizer Login</h2>
                <p className="text-gray-600 text-sm mb-6">Use your organizer credentials</p>

                <input
                    type="text"
                    placeholder="username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full md:text-base text-sm border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full md:text-base text-sm border border-gray-300 rounded-lg px-4 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full md:text-base text-sm bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white font-semibold py-2 rounded-lg hover:from-[#C5703F]/90 hover:to-[#C16A00]/90 transition disabled:opacity-60"
                >
                    {loading ? "Signing in..." : "Sign In →"}
                </button>
            </div>
        </div>
    );
}
