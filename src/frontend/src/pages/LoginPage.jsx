import { GraduationCap } from "lucide-react";
import hcmus from "../assets/hcmus.png";

const LoginPage = () => {
  return (
    <div className="flex flex-row h-screen w-screen">
      <div
        className="relative bg-cover bg-center bg-no-repeat h-full w-full"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-30 left-17 text-white">
          <h1 className="text-5xl font-bold mb-4 font-manrope">Structured Discovery</h1>

          <p className="text-xl max-w-md font-inter">
            Unlock your university experience. Connect, participate, and lead
            with UniEvent.
          </p>
        </div>
      </div>

      <div className="bg-white h-full w-full flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-175 h-75 bg-violet-300 rounded-full blur-3xl opacity-30"></div>

        <div className="bg-white shadow-xl h-130 w-md rounded-lg flex flex-col justify-center items-center relative z-10">
          <div className="flex flex-row gap-1 items-center text-[#630ED4] text-2xl font-semibold">
            <GraduationCap />
            <p className="font-manrope">UniEvent</p>
          </div>

          <p className="text-[#4A4455] text-sm font-inter mb-5">
            Sign in to your account
          </p>

          <div className="w-full px-8 space-y-3">
            <label htmlFor="email" className="font-inter text-gray-600">
              Email
            </label>
            <input
              className="w-full h-10.25 border-gray-400 border rounded-lg p-4"
              id="email"
              placeholder="abcd@gmail.com"
            ></input>

            <label htmlFor="password" className="font-inter text-gray-600">
              Password
            </label>
            <input
              className="w-full h-10.25 border-gray-400 border rounded-lg p-4"
              id="password"
              placeholder="abcd@gmail.com"
            ></input>

            <div className="flex justify-end ">
              <p className="font-inter text-sm text-purple-800 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                Forgot password?
              </p>
            </div>

            <div className="bg-purple-800 h-12 rounded-lg hover:bg-purple-950 flex justify-center items-center">
              <p className="text-white font-inter">Login</p>
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-gray-500"></div>

              <p className="text-[#4A4455] text-sm">Or continue with</p>

              <div className="flex-1 border-t border-gray-500"></div>
            </div>

            <div className="border-purple-500 border-2 h-12 rounded-lg transition-all duration-200 hover:-translate-y-1 flex justify-center items-center mb-6">
              <p className="text-purple-800 font-inter">Create an account</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
