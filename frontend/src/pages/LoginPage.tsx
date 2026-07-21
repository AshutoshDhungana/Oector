import { useNavigate } from "react-router-dom";
import FigmaLoginPage from "../../../figma_design_src/app/components/auth/LoginPage";
import PublicNav from "../components/PublicNav";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { startDemo } = useAuth();
  return <div className="bg-black"><PublicNav /><FigmaLoginPage onSuccess={(email) => { startDemo(email.split("@")[0] || "Investor demo", email); window.setTimeout(() => navigate("/dashboard", { replace: true }), 650); }} /></div>;
}
