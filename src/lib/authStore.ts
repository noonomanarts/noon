/**
 * Authentication store - now uses secure database operations
 */

export {
  type UserPublic as User,
  getUserById,
  verifyLogin,
  ensureDefaultAdmin,
  createUser as registerUser,
} from "@/lib/db/users";
