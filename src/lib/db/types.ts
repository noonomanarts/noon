/**
 * Database types matching PostgreSQL schema
 */

// Enums (types)
export type UserRole = 'ADMIN' | 'TRAINER' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PreferredLanguage = 'ENGLISH' | 'ARABIC';
export type ClassCategory = 'COOKING' | 'ARTS_CRAFTS';
export type ClassSubCategory =
  | 'APPETIZERS_SNACKS'
  | 'MAIN_DISHES'
  | 'DESSERTS_BAKING'
  | 'MOM_AND_KID'
  | 'PAINTING'
  | 'POTTERY'
  | 'CRAFTS'
  | 'MIXED';
export type ClassStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventType = 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
export type EventStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'PENDING_CLIENT_CONFIRMATION'
  | 'CLIENT_CONFIRMED'
  | 'PENDING_PAYMENT'
  | 'COMPLETED'
  | 'CANCELLED';
export type PackageType = 'STANDARD' | 'PREMIUM';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type PaymentMethod = 'ONLINE' | 'BANK_TRANSFER' | 'CASH' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
export type ContactMessageStatus = 'NEW' | 'READ';
export type CalendarEventType =
  | 'CLASS'
  | 'PRIVATE_SESSION'
  | 'COMPETITION'
  | 'BIRTHDAY_PARTY'
  | 'BLOCKED'
  | 'CLEANING';

// Enum constants (values for runtime use)
export const ClassCategory = {
  COOKING: 'COOKING' as const,
  ARTS_CRAFTS: 'ARTS_CRAFTS' as const,
};

export const UserRole = {
  ADMIN: 'ADMIN' as const,
  TRAINER: 'TRAINER' as const,
  CUSTOMER: 'CUSTOMER' as const,
};

export const ClassStatus = {
  DRAFT: 'DRAFT' as const,
  PUBLISHED: 'PUBLISHED' as const,
  CANCELLED: 'CANCELLED' as const,
  COMPLETED: 'COMPLETED' as const,
};

export const EventType = {
  COOKING_COMPETITION: 'COOKING_COMPETITION' as const,
  PRIVATE_CLASS: 'PRIVATE_CLASS' as const,
  BIRTHDAY_PARTY: 'BIRTHDAY_PARTY' as const,
};

// Models
export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  phone_number: string;
  date_of_birth: Date | null;
  gender: Gender | null;
  preferred_language: PreferredLanguage;
  profile_image: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

// CamelCase version of User for API responses
export interface UserPublic {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  preferredLanguage: PreferredLanguage;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

// CamelCase Trainer for frontend
export interface TrainerPublic {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  status?: UserStatus;
  createdAt: Date;
}

export interface TrainerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  expertise: string[];
  experience: number | null;
  social_links: Record<string, string> | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: Date;
}

export interface Class {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  category: ClassCategory;
  sub_category: ClassSubCategory;
  image: string | null;
  images: string[];
  trainer_id: string;
  price: number;
  currency: string;
  seats_total: number;
  seats_available: number;
  duration_minutes: number;
  status: ClassStatus;
  meta_title: string | null;
  meta_description: string | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

// CamelCase Class for frontend
export interface ClassPublic {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  category: ClassCategory;
  subCategory: ClassSubCategory;
  image: string | null;
  images: string[];
  trainerId: string;
  price: number;
  currency: string;
  seatsTotal: number;
  seatsAvailable: number;
  durationMinutes: number;
  status: ClassStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface ClassSession {
  id: string;
  class_id: string;
  start_date_time: Date;
  end_date_time: Date;
  seats_total: number | null;
  seats_booked: number;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  recipe_submitted: boolean;
  recipe_pdf: string | null;
  grocery_list: string | null;
  workshop_brief: string | null;
  photos: string[];
  created_at: Date;
  updated_at: Date;
}

// CamelCase ClassSession for frontend
export interface ClassSessionPublic {
  id: string;
  classId: string;
  startDateTime: Date;
  endDateTime: Date;
  seatsTotal: number | null;
  seatsBooked: number;
  isCancelled: boolean;
  cancellationReason: string | null;
  recipeSubmitted: boolean;
  recipePdf: string | null;
  groceryList: string | null;
  workshopBrief: string | null;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

// CamelCase Review for frontend  
export interface ReviewPublic {
  id: string;
  userId: string;
  classId: string;
  sessionId: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  isVisible: boolean;
  createdAt: Date;
}

export interface Booking {
  id: string;
  booking_number: string;
  user_id: string;
  class_id: string;
  session_id: string;
  participants: Record<string, unknown>;
  number_of_participants: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  paid_at: Date | null;
  terms_accepted: boolean;
  terms_accepted_at: Date | null;
  special_requests: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EventBooking {
  id: string;
  booking_number: string;
  user_id: string;
  event_type: EventType;
  selected_date: Date;
  selected_time: string;
  package_type: PackageType | null;
  number_of_participants: number;
  number_of_groups: number | null;
  gifts: Record<string, unknown> | null;
  full_name: string;
  email: string;
  phone_number: string;
  company_or_group_name: string | null;
  preferred_dish: string | null;
  special_requests: string | null;
  status: EventStatus;
  client_confirmed: boolean;
  client_confirmed_at: Date | null;
  digital_signature: string | null;
  agreement_accepted: boolean;
  total_amount: number | null;
  currency: string;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  paid_at: Date | null;
  payment_proof: string | null;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  start_date_time: Date;
  end_date_time: Date;
  title: string;
  description: string | null;
  class_session_id: string | null;
  event_booking_id: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  internal_notes: string | null;
  visible_to_trainers: boolean;
  visible_trainer_ids: string[];
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  class_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  reason: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  created_at: Date;
}

export interface LoyaltyCard {
  id: string;
  user_id: string;
  points: number;
  stamps: number;
  created_at: Date;
  updated_at: Date;
}

// Helper function to convert snake_case DB rows to camelCase
export function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
}

// Utility type for selecting fields
export type SelectFields<T, K extends keyof T> = Pick<T, K>;

// Utility for public user (without password)
export type PublicUser = Omit<User, 'password'>;
