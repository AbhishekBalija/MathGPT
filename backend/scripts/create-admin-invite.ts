/**
 * Script to create a waitlist entry with invite token for an admin
 * This bypasses the waitlist flow and creates a valid invite token
 * Usage: npx ts-node scripts/create-admin-invite.ts <email>
 */

import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.prod" });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: ".env.local" });
}

async function createAdminInvite() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx ts-node scripts/create-admin-invite.ts <email>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const frontendUrl =
    process.env.FRONTEND_URL_PROD || "https://neomath.vercel.app";

  console.log("\n🎫 Creating Admin Invite Token\n");
  console.log("=".repeat(40) + "\n");

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("MathGPTDB");
    const waitlist = db.collection("waitlist");

    // Generate a new invite token
    const inviteToken = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Check if already in waitlist
    const existing = await waitlist.findOne({ email });

    if (existing) {
      // Update existing entry with new token
      await waitlist.updateOne(
        { email },
        {
          $set: {
            approved: true,
            registered: false,
            inviteToken,
            inviteExpiresAt: expiresAt,
            updatedAt: now,
          },
        }
      );
      console.log("✅ Updated existing waitlist entry");
    } else {
      // Create new waitlist entry
      await waitlist.insertOne({
        email,
        source: "admin-script",
        approved: true,
        registered: false,
        inviteToken,
        inviteExpiresAt: expiresAt,
        createdAt: now,
        updatedAt: now,
      });
      console.log("✅ Created new waitlist entry");
    }

    const registrationLink = `${frontendUrl}/register?token=${inviteToken}`;

    console.log("\n📋 Invite Details:");
    console.log(`   Email: ${email}`);
    console.log(`   Token: ${inviteToken}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    console.log("\n🔗 Registration Link:");
    console.log(`   ${registrationLink}`);
    console.log("\n🎉 Use this link to access the registration page!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdminInvite();
