import AuthForm from "@/components/AuthForm";
import logo from "@/assets/images/LogoWide.png";

const Login = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <img src={logo} alt="UndergroundIQ" className="h-12 w-auto mb-8" />
      <AuthForm type="login" />
    </div>
  );
};

export default Login;
