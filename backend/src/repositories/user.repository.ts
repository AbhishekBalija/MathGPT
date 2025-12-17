import { MongoClient, ObjectId } from 'mongodb';
import { User, UserCreate } from '../types/user.types';

// Step 1: Create a MongoDB. connection
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
// log error if connection fails
client.on("error", (error) => console.error(error));
// Step 2: Create a database
const db = client.db("MathGPTDB");
// log error if database connection fails
client.on("open", () => console.log("Database connected"));
// Step 3: Create a collection
const users = db.collection<User>("users");


export const userRepository = {
    // Find by email (for login)
    async findByEmail(email: string): Promise<User | null> {
        return users.findOne({ email });
    },

    // Find by id(for token verification)
    async findById(id: string): Promise<User | null> {
        return users.findOne({ _id: new ObjectId(id) });
    },

    // Create a new user
    async create(data: UserCreate): Promise<User> {
        const now = new Date();
        const user: Omit<User, '_id'> = {
            name: data.name,
            email: data.email,
            password: data.password,
            isAdmin: data.isAdmin || false,
            createdAt: now,
            updatedAt: now,
        };

        const result = await users.insertOne(user as User);
        return {
            ...user,
            _id: result.insertedId,
        }as User;
    },

    // Update a user
    async update(id:string, data: Partial<User>): Promise<User | null> {
        const result = await users.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result;
    },

    // Delete a user
    async delete(id:string): Promise<boolean> {
        const result = await users.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    },

    //Check if email is already in use (for registration validation)

    async checkEmail(email: string): Promise<boolean> {
        const count = await users.countDocuments({ email });
        return count > 0;
    },
};
