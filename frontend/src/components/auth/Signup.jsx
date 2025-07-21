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

const Signup = () => {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState({
    fullname: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "",
    file: "",
  });

  const { loading, user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const changeFileHandler = (e) => {
    setInput({ ...input, file: e.target.files?.[0] });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("fullname", input.fullname);
    formData.append("email", input.email);
    formData.append("phoneNumber", input.phoneNumber);
    formData.append("password", input.password);
    formData.append("role", input.role);
    if (input.file) {
      formData.append("file", input.file);
    }

    try {
      dispatch(setLoading(true));
      const res = await axios.post(`${USER_API_END_POINT}/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      if (res.data.success) {
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    if (!input.role) return toast.error("Please select a role first.");
    try {
      dispatch(setLoading(true));
      const res = await axios.post(
        `${USER_API_END_POINT}/google`,
        {
          token: credentialResponse.credential,
          role: input.role,
        },
        { withCredentials: true }
      );
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success("Signup successful via Google!");
        navigate("/");
      }
    } catch (error) {
      const message = error?.response?.data?.message;
      if (message) {
        toast.error(message); // ✅ Shows exact backend message
      } else {
        toast.error("Google Signup failed");
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
          <h1 className="font-bold text-2xl mb-6">Sign Up</h1>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <>
              <Label className="block mb-2">Sign up as</Label>
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

          {/* Step 2: Google + Manual Signup */}
          {step === 2 && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                <GoogleLogin
                  onSuccess={handleGoogleSignup}
                  onError={() => toast.error("Google Signup Failed")}
                />

                <div className="text-center text-gray-500">or</div>

                <form onSubmit={submitHandler}>
                  <div className="my-2">
                    <Label>Full Name</Label>
                    <Input
                      type="text"
                      name="fullname"
                      value={input.fullname}
                      onChange={changeEventHandler}
                      placeholder="Tinkal"
                      required
                    />
                  </div>
                  <div className="my-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      name="email"
                      value={input.email}
                      onChange={changeEventHandler}
                      placeholder="tinkal300@gmail.com"
                      required
                    />
                  </div>
                  <div className="my-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="text"
                      name="phoneNumber"
                      value={input.phoneNumber}
                      onChange={changeEventHandler}
                      placeholder="+91 80808 08080"
                      required
                    />
                  </div>
                  <div className="my-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={input.password}
                      onChange={changeEventHandler}
                      placeholder="Password"
                      required
                    />
                  </div>

                  <div className="my-2">
                    <Label>Profile</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={changeFileHandler}
                      className="cursor-pointer"
                    />
                  </div>

                  {loading ? (
                    <Button className="w-full my-4" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </Button>
                  ) : (
                    <Button type="submit" className="w-full my-4">
                      Signup
                    </Button>
                  )}
                </form>

                <p className="text-sm text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-600">
                    Login
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

export default Signup;
