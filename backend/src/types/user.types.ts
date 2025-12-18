import { ObjectId } from 'mongodb';

export type AuthProvider = 'email' | 'google';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string; // Optional for OAuth-only users
  isAdmin: boolean;
  provider: AuthProvider;
  googleId?: string; // Google OAuth user ID
  avatar?: string; // Profile picture URL
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password?: string; // Optional for OAuth users
  name: string;
  isAdmin?: boolean;
  provider?: AuthProvider;
  googleId?: string;
  avatar?: string;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}
