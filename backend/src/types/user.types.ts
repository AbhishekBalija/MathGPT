import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
    email: string;
    password: string;
    name: string;
    isAdmin?: boolean;
}
