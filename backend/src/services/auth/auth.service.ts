import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { userRepository } from "../../repositories/user.repository";

const JWT_SECRET = process.env.JWT_SECRET || "My-MathSolver-App-JWT-Secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "My-MathSolver-App-Refresh-Secret";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const GOOGLE_CLIENT_ID =
  process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

interface TokenPayload {
  userId: string;
}

export const AuthService = {
  async login(email: string, password: string) {
    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check if user has a password (could be OAuth-only user)
    if (!user.password) {
      return {
        success: false,
        error: "This account uses Google Sign-In. Please use Google to login.",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid password",
      };
    }

    // If user is found, generate tokens
    const accessToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
    );

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    isAdmin?: boolean;
  }) {
    // Check if user exists
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await userRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      isAdmin: data.isAdmin ?? false,
      provider: "email",
    });

    // Generate tokens
    const accessToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
    );

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  },

  async googleLogin(idToken: string) {
    try {
      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return {
          success: false,
          error: "Invalid Google token",
        };
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!email || !googleId) {
        return {
          success: false,
          error: "Google account missing email or ID",
        };
      }

      // Find or create user
      const user = await userRepository.findOrCreateByGoogle({
        googleId,
        email,
        name: name || email.split("@")[0],
        avatar: picture,
      });

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id.toString() },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
      );

      const refreshToken = jwt.sign(
        { userId: user._id.toString() },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
      );

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
        isNewUser:
          !user.createdAt || Date.now() - user.createdAt.getTime() < 5000, // Created within 5 seconds
      };
    } catch (error) {
      console.error("Google OAuth error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Google authentication failed",
      };
    }
  },

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;

      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user._id.toString() },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
      );

      // Optionally generate new refresh token (token rotation)
      const newRefreshToken = jwt.sign(
        { userId: user._id.toString() },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
      );

      return {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: "Invalid or expired refresh token",
      };
    }
  },

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      const user = await userRepository.findById(decoded.userId);

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Invalid or expired token",
      };
    }
  },
};
