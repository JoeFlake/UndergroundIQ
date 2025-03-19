import AuthForm from "@/components/AuthForm";

const Login = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-600">Sign in to access your account</p>
      </div>
      <AuthForm type="login" />
    </div>
  );
};

export default Login;
