import { MongoClient, ObjectId, Collection } from "mongodb";
import { User, UserCreate, GoogleUserProfile } from "../types/user.types";

// Singleton pattern for MongoDB connection (serverless-friendly)
let client: MongoClient | null = null;
let usersCollection: Collection<User> | null = null;

async function getCollection(): Promise<Collection<User>> {
  if (usersCollection) {
    return usersCollection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("MongoDB connected successfully");
  }

  const db = client.db("MathGPTDB");
  usersCollection = db.collection<User>("users");
  return usersCollection;
}

export const userRepository = {
  // Find by email (for login)
  async findByEmail(email: string): Promise<User | null> {
    const users = await getCollection();
    return users.findOne({ email });
  },

  // Find by id(for token verification)
  async findById(id: string): Promise<User | null> {
    const users = await getCollection();
    return users.findOne({ _id: new ObjectId(id) });
  },

  // Find by Google ID (for OAuth login)
  async findByGoogleId(googleId: string): Promise<User | null> {
    const users = await getCollection();
    return users.findOne({ googleId });
  },

  // Find or create user by Google profile (for OAuth)
  async findOrCreateByGoogle(profile: GoogleUserProfile): Promise<User> {
    // First, try to find by googleId
    let user = await this.findByGoogleId(profile.googleId);
    if (user) {
      return user;
    }

    // Then, try to find by email (link existing account)
    user = await this.findByEmail(profile.email);
    if (user) {
      // Link Google account to existing user
      const updated = await this.update(user._id.toString(), {
        googleId: profile.googleId,
        avatar: profile.avatar || user.avatar,
      });
      return updated || user;
    }

    // Create new OAuth user
    return this.create({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      avatar: profile.avatar,
      provider: "google",
      isAdmin: false,
    });
  },

  // Create a new user
  async create(data: UserCreate): Promise<User> {
    const users = await getCollection();
    const now = new Date();
    const user: Omit<User, "_id"> = {
      name: data.name,
      email: data.email,
      password: data.password,
      isAdmin: data.isAdmin || false,
      provider: data.provider || "email",
      googleId: data.googleId,
      avatar: data.avatar,
      // Credit tracking defaults
      dailyCreditsUsed: 0,
      lastCreditReset: now,
      totalCreditsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(user as User);
    return {
      ...user,
      _id: result.insertedId,
    } as User;
  },

  // Update a user
  async update(id: string, data: Partial<User>): Promise<User | null> {
    const users = await getCollection();
    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result;
  },

  // Increment daily credits used (atomic operation)
  async incrementCredits(id: string): Promise<void> {
    const users = await getCollection();
    await users.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { dailyCreditsUsed: 1, totalCreditsUsed: 1 },
        $set: { updatedAt: new Date() },
      }
    );
  },

  // Delete a user
  async delete(id: string): Promise<boolean> {
    const users = await getCollection();
    const result = await users.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  //Check if email is already in use (for registration validation)
  async checkEmail(email: string): Promise<boolean> {
    const users = await getCollection();
    const count = await users.countDocuments({ email });
    return count > 0;
  },

  // Get all users with pagination and optional search
  async findAll(
    filter: { search?: string; isAdmin?: boolean } = {},
    page = 1,
    limit = 20
  ): Promise<{ users: User[]; total: number }> {
    const users = await getCollection();
    const query: Record<string, unknown> = {};

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: "i" } },
        { email: { $regex: filter.search, $options: "i" } },
      ];
    }

    if (filter.isAdmin !== undefined) {
      query.isAdmin = filter.isAdmin;
    }

    const [docs, total] = await Promise.all([
      users
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      users.countDocuments(query),
    ]);

    return { users: docs, total };
  },

  // Get recent users
  async findRecent(limit = 5): Promise<User[]> {
    const users = await getCollection();
    return users.find().sort({ createdAt: -1 }).limit(limit).toArray();
  },

  // Get user stats for admin dashboard
  async getStats(): Promise<{ totalUsers: number; totalSolutions: number }> {
    const users = await getCollection();
    const totalUsers = await users.countDocuments();
    // For totalSolutions, we'll need to use solution repository
    // This is a simplified version - actual implementation connects to solutions
    return { totalUsers, totalSolutions: 0 };
  },
};
