import AuthForm from "@/components/AuthForm";

const Signup = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Join us today</h1>
        <p className="text-gray-600">Create an account to get started</p>
      </div>
      <AuthForm type="signup" />
    </div>
  );
};

export default Signup;
