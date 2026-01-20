/**
 * Authentication store - now uses secure database operations
 */

export {
  type PublicUser as User,
  getUserById,
  verifyLogin,
  ensureDefaultAdmin,
  createUser as registerUser,
} from "@/lib/db/users";
