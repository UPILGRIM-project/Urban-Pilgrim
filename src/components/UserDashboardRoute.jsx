import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SignIn from "./SignIn";
import UserDashboard from "./UserDashboard";

export default function UserDashboardRoute() {
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();

    if (user) {
        return <UserDashboard />;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fd]">
            <SignIn
                onClose={() => navigate("/", { replace: true })}
                onSuccess={() => navigate("/userdashboard", { replace: true })}
            />
        </div>
    );
}
