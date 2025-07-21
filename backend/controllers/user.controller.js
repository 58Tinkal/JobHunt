import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { oauth2Client } from "../utils/googleClient.js";
import crypto from "crypto";
import { google } from "googleapis";


const generateRandomPassword = () => {
  return crypto.randomBytes(12).toString("hex");
};

export const googleAuth = async (req, res) => {
  try {
    const { token, role } = req.body;

    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: "Incomplete Google profile." });
    }

    let user = await User.findOne({ email });

    // Case 1: User exists
    if (user) {
      // Role mismatch
      if (user.role !== role) {
        return res.status(400).json({
          success: false,
          message: "User already exists but with other role.",
        });
      }

      // Role matches → proceed to login
    } else {
      // Case 2: User doesn't exist → create new user with selected role
      const rawPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      user = await User.create({
        fullname: name,
        email,
        phoneNumber: 1234567890,
        password: hashedPassword,
        role: role || "student",
        profile: {
          profilePhoto: picture,
        },
      });
    }

    // Generate JWT token
    const tokenData = { userId: user._id };
    const jwtToken = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: "1d" });

    return res
      .status(200)
      .cookie("token", jwtToken, {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        message: `Welcome ${user.fullname}`,
        user,
        success: true,
      });

  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.status(500).json({ success: false, message: "Google login failed." });
  }
};


export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;

    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false,
      });
    }
    const file = req.file;
    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: "User already exist with this email.",
        success: false,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: {
        profilePhoto: cloudResponse.secure_url,
      },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false,
      });
    }
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Incorrect email or password.",
        success: false,
      });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Incorrect email or password.",
        success: false,
      });
    }
    // check role is correct or not
    if (role !== user.role) {
      return res.status(400).json({
        message: "Account doesn't exist with current role.",
        success: false,
      });
    }

    const tokenData = {
      userId: user._id,
    };
    const token = await jwt.sign(tokenData, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpsOnly: true,
        sameSite: "strict",
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user,
        success: true,
      });
  } catch (error) {
    console.log(error);
  }
};
export const logout = async (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};



export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills, password } = req.body;
    const userId = req.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // --- Update basic fields if provided ---
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio;
    if (skills) user.profile.skills = skills.split(",").map((s) => s.trim());

    // --- Update password if provided ---
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    // --- Update resume if a new file is uploaded ---
    if (req.file) {
      const fileUri = getDataUri(req.file);

      if (!fileUri || !fileUri.content) {
        console.error("Data‑URI creation failed", fileUri);
        return res.status(500).json({ success: false, message: "Could not create Data‑URI" });
      }

      try {
        const { secure_url } = await cloudinary.uploader.upload(fileUri.content, {
          resource_type: "auto",
        });

        user.profile.resume = secure_url;
        user.profile.resumeOriginalName = req.file.originalname;
      } catch (err) {
        console.error("Cloudinary upload failed", err);
        return res.status(500).json({ success: false, message: "Resume upload failed" });
      }
    }

    await user.save();

    const { _id, role, profile } = user;
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role,
        profile,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

