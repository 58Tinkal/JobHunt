import React, { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { USER_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setLoading, setUser } from "@/redux/authSlice";
import { Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState({
    email: "",
    password: "",
    role: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, user } = useSelector((store) => store.auth);

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!input.role) return toast.error("Please select a role first.");
    try {
      dispatch(setLoading(true));
      const res = await axios.post(`${USER_API_END_POINT}/login`, input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success(res.data.message);
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    console.log("🔥 handleGoogleLogin called");
    try {
      dispatch(setLoading(true));

      console.log("▶️ Google credential response:", credentialResponse);
      console.log("📌 Selected role:", input.role);

      const res = await axios.post(
        `${USER_API_END_POINT}/google`,
        {
          token: credentialResponse.credential,
          role: input.role,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success(res.data.message || "Google Login Successful");
        navigate("/");
      }
    } catch (error) {
      console.log("❌ Google login error:", error);
      console.log("❌ Backend response:", error?.response?.data);

      const backendMessage = error?.response?.data?.message;

      if (backendMessage?.includes("other role")) {
        toast.error(
          "This email is already registered with a different role. Please select the correct role and try again."
        );
      } else if (backendMessage) {
        toast.error(backendMessage);
      } else {
        toast.error("Google login failed");
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div>
      <Navbar />
      <div className="flex items-center justify-center max-w-7xl mx-auto">
        <div className="w-full md:w-1/2 border border-gray-200 rounded-md p-6 my-10">
          <h1 className="font-bold text-2xl mb-6">Login</h1>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <>
              <Label className="block mb-2">Login as</Label>
              <div className="flex gap-6 mb-6">
                <Button
                  variant={input.role === "student" ? "default" : "outline"}
                  onClick={() => {
                    setInput({ ...input, role: "student" });
                    setStep(2);
                  }}
                >
                  Student
                </Button>
                <Button
                  variant={input.role === "recruiter" ? "default" : "outline"}
                  onClick={() => {
                    setInput({ ...input, role: "recruiter" });
                    setStep(2);
                  }}
                >
                  Recruiter
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Google + Manual Login */}
          {step === 2 && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    console.log("✅ Google onSuccess fired");
                    console.log("Role value:", input.role);

                    if (!input.role) {
                      toast.error("Please select a role first.");
                      return;
                    }

                    handleGoogleLogin(credentialResponse);
                  }}
                  onError={(err) => {
                    console.log("❌ Google onError:", err);
                    toast.error("Google login failed (OAuth Error)");
                  }}
                />

                <div className="text-center text-gray-500">or</div>

                <form onSubmit={submitHandler}>
                  <div className="my-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={input.email}
                      name="email"
                      onChange={changeEventHandler}
                      placeholder="tinkal300@gmail.com"
                      required
                    />
                  </div>

                  <div className="my-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={input.password}
                      name="password"
                      onChange={changeEventHandler}
                      placeholder="Password"
                      required
                    />
                  </div>

                  {loading ? (
                    <Button className="w-full my-4" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </Button>
                  ) : (
                    <Button type="submit" className="w-full my-4">
                      Login
                    </Button>
                  )}
                </form>

                <p className="text-sm text-center">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-blue-600">
                    Signup
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
