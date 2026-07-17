import "dotenv/config";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const CONFIRMATION = "CREATE_THE_ONLY_INITIAL_SUPER_ADMIN";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const assertPasswordPolicy = (password: string): void => {
  if (
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      "BOOTSTRAP_SUPER_ADMIN_PASSWORD does not meet the admin password policy"
    );
  }
};

const databaseUrl = required("DATABASE_URL");
const email = required("BOOTSTRAP_SUPER_ADMIN_EMAIL").toLowerCase();
const name = required("BOOTSTRAP_SUPER_ADMIN_NAME");
const password = required("BOOTSTRAP_SUPER_ADMIN_PASSWORD");
const confirmation = required("BOOTSTRAP_SUPER_ADMIN_CONFIRM");

if (confirmation !== CONFIRMATION) {
  throw new Error(`BOOTSTRAP_SUPER_ADMIN_CONFIRM must equal ${CONFIRMATION}`);
}
if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
  throw new Error("BOOTSTRAP_SUPER_ADMIN_EMAIL is invalid");
}
if (name.length < 2 || name.length > 50) {
  throw new Error("BOOTSTRAP_SUPER_ADMIN_NAME must contain 2-50 characters");
}
assertPasswordPolicy(password);

const client = new MongoClient(databaseUrl);
await client.connect();
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    const db = client.db();
    const users = db.collection("users");
    const bootstrap = db.collection<{
      _id: string;
      completed_at: Date;
      version: number;
    }>("auth_bootstrap_markers");
    const [userCount, marker] = await Promise.all([
      users.countDocuments({}, { session }),
      bootstrap.findOne({ _id: "initial-super-admin" }, { session }),
    ]);
    if (userCount !== 0 || marker) {
      throw new Error(
        "Bootstrap refused: the database already has a user or bootstrap marker"
      );
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT_ROUNDS || 12)
    );
    await users.insertOne(
      {
        name,
        email,
        password: passwordHash,
        password_changed_at: now,
        mfa_version: 0,
        role: "super-admin",
        status: "in-progress",
        is_verified: true,
        is_deleted: false,
        deleted_at: null,
        image: null,
        created_at: now,
        updated_at: now,
      },
      { session }
    );
    await bootstrap.insertOne(
      {
        _id: "initial-super-admin",
        completed_at: now,
        version: 1,
      },
      { session }
    );
  });
  process.stdout.write(
    "Initial super-admin created. Bootstrap is now locked.\n"
  );
} finally {
  await session.endSession();
  await client.close();
}
