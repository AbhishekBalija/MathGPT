import bcrypt from "bcrypt";
import  jwt  from "jsonwebtoken";
import { userRepository } from "../../repositories/user.repository";

const JWT_SECRET = process.env.JWT_SECRET || "My-MathSolver-App-JWT-Secret";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export const AuthService = {
    async login(email: string, password: string) {

        // Find user by email
        const user = await userRepository.findByEmail(email);

        if(!user){
            return {
                success: false,
                error: "User not found",
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid){
            return {
                success: false,
                error: "Invalid password",
            };
        }

        // If user is found, generate token 
        const accessToken = jwt.sign({userId: user._id,}, JWT_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"]});

        const refreshToken = jwt.sign({userId: user._id,}, JWT_SECRET, {expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"]});

        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
            },
            accessToken,
            refreshToken,
        };
    },
    async register(data: {email: string, password: string, name: string, isAdmin?: boolean}) {
        // Check if user exists

        const existingUser = await userRepository.findByEmail(data.email);

        if(existingUser){
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
        });

        // Generate tokens
        const accessToken = jwt.sign({userId: user._id,}, JWT_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"]});

        const refreshToken = jwt.sign({userId: user._id,}, JWT_SECRET, {expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"]});

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
    }
};