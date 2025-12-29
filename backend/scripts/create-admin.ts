/**
 * Script to create an admin user in MongoDB
 * Usage: npx ts-node scripts/create-admin.ts
 */

import { MongoClient, ObjectId } from "mongodb";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Load environment variables (try .env.prod first, then .env.local)
dotenv.config({ path: ".env.prod" });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: ".env.local" });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  console.log("\n🔐 Create Admin User Script\n");
  console.log("=".repeat(40) + "\n");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    console.log("   Make sure you have a .env.local file with MONGODB_URI");
    process.exit(1);
  }

  // Collect admin details
  const email = await prompt("📧 Enter admin email: ");
  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email address");
    process.exit(1);
  }

  const name = await prompt("👤 Enter admin name: ");
  if (!name) {
    console.error("❌ Name is required");
    process.exit(1);
  }

  const password = await prompt("🔑 Enter password (min 6 chars): ");
  if (!password || password.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    process.exit(1);
  }

  rl.close();

  console.log("\n⏳ Connecting to MongoDB...");

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("MathGPTDB");
    const users = db.collection("users");

    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      if (existingUser.isAdmin) {
        console.log("\n⚠️  User already exists and is already an admin!");
      } else {
        // Upgrade existing user to admin
        await users.updateOne(
          { email },
          { $set: { isAdmin: true, updatedAt: new Date() } }
        );
        console.log("\n✅ Existing user upgraded to admin!");
      }
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new admin user
      const now = new Date();
      const adminUser = {
        _id: new ObjectId(),
        name,
        email,
        password: hashedPassword,
        isAdmin: true,
        provider: "email",
        dailyCreditsUsed: 0,
        lastCreditReset: now,
        totalCreditsUsed: 0,
        createdAt: now,
        updatedAt: now,
      };

      await users.insertOne(adminUser);
      console.log("\n✅ Admin user created successfully!");
    }

    console.log("\n📋 Admin Details:");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: Admin`);
    console.log("\n🎉 You can now log in with these credentials!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("📤 MongoDB connection closed");
  }
}

createAdmin();
