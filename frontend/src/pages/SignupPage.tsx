import { useNavigate } from "react-router-dom";
import FigmaSignupPage from "../../../figma_design_src/app/components/auth/SignupPage";
import PublicNav from "../components/PublicNav";
import { useAuth } from "../hooks/useAuth";

export default function SignupPage() {
  const navigate = useNavigate();
  const { startDemo } = useAuth();
  return <div className="bg-black"><PublicNav /><FigmaSignupPage onSuccess={(name, email) => { startDemo(name || "Investor demo", email || "demo@oector.ai"); window.setTimeout(() => navigate("/dashboard", { replace: true }), 650); }} /></div>;
}
