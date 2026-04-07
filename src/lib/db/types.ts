/**
 * Database types matching PostgreSQL schema
 */

// Enums (types)
export type UserRole = 'ADMIN' | 'TRAINER' | 'CUSTOMER' | 'EMPLOYEE' | 'SOCIAL_MEDIA_ADMIN' | 'PHOTOGRAPHER';
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
  | 'CLEANING'
  | 'APPOINTMENT'
  | 'SCHEDULER';

// Enum constants (values for runtime use)
export const ClassCategory = {
  COOKING: 'COOKING' as const,
  ARTS_CRAFTS: 'ARTS_CRAFTS' as const,
};

export const UserRole = {
  ADMIN: 'ADMIN' as const,
  TRAINER: 'TRAINER' as const,
  CUSTOMER: 'CUSTOMER' as const,
  EMPLOYEE: 'EMPLOYEE' as const,
  SOCIAL_MEDIA_ADMIN: 'SOCIAL_MEDIA_ADMIN' as const,
  PHOTOGRAPHER: 'PHOTOGRAPHER' as const,
};

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface PhotographerTask {
  id: string;
  photographer_user_id: string;
  assigned_by_user_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: Date | null;
  completed_at: Date | null;
  notes: string | null;
  notes_ar: string | null;
  created_at: Date;
  updated_at: Date;
}

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
  whatsapp_verified_at: Date | null;
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
  whatsappVerifiedAt: Date | null;
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
  share_tiers?: Array<{
    minParticipants: number;
    maxParticipants: number | null;
    percent: number;
  }>;
  featured_media_type?: 'IMAGE' | 'VIDEO' | 'YOUTUBE';
  featured_media_url?: string | null;
  manual_upcoming_courses?: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    dateTime: string | null;
    price: number | null;
    currency: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'YOUTUBE';
    mediaUrl?: string | null;
    imageUrl: string | null;
    bookingUrl: string | null;
    description: string | null;
  }>;
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
  seatsBooked: number;
  startDateTime: Date | null;
  endDateTime: Date | null;
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
  trainer_photos: string[];
  highlighted_ingredients: Array<{
    name: string;
    source: string;
    photo: string;
  }>;
  final_recipe_title: string | null;
  final_recipe_pdf: string | null;
  final_recipe_brief: string | null;
  final_recipe_visible_to_customers: boolean;
  final_recipe_published_at: Date | null;
  admin_workshop_notes: string | null;
  admin_workshop_notes_photo: string | null;
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
  trainerPhotos: string[];
  highlightedIngredients: Array<{
    name: string;
    source: string;
    photo: string;
  }>;
  finalRecipeTitle: string | null;
  finalRecipePdf: string | null;
  finalRecipeBrief: string | null;
  finalRecipeVisibleToCustomers: boolean;
  finalRecipePublishedAt: Date | null;
  adminWorkshopNotes: string | null;
  adminWorkshopNotesPhoto: string | null;
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
  appointment_contact_name: string | null;
  appointment_contact_phone: string | null;
  notifications_enabled: boolean;
  reminder_minutes_before: number | null;
  notify_at_start: boolean;
  reminder_sent_at: Date | null;
  start_notification_sent_at: Date | null;
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
  is_verified: boolean;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  blocked_balance?: number;
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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  approved_at?: Date | null;
  rejected_at?: Date | null;
  created_at: Date;
}

export type WalletTopupPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface WalletTopupPayment {
  id: string;
  reference: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  gateway: string;
  gateway_transaction_id: string | null;
  status: WalletTopupPaymentStatus;
  payment_url: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ShopCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ShopProduct {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  currency: string;
  sku: string | null;
  image: string | null;
  gallery_images: string[];
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export type ShopOrderStatus =
  | 'PAID'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ShopOrder {
  id: string;
  order_number: string;
  user_id: string;
  status: ShopOrderStatus;
  city: string;
  area: string;
  street_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  postal_code: string | null;
  recipient_full_name: string;
  recipient_phone: string;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  promo_code_id: string | null;
  promo_code: string | null;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: 'WALLET';
  wallet_transaction_id: string | null;
  tracking_number: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  paid_at: Date;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name_en: string;
  product_name_ar: string;
  product_slug: string;
  product_image: string | null;
  created_at: Date;
}

export interface ShopOrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: ShopOrderStatus | null;
  next_status: ShopOrderStatus;
  changed_by_user_id: string | null;
  note: string | null;
  created_at: Date;
}

export interface AppNotification {
  id: string;
  recipient_user_id: string | null;
  recipient_role: UserRole | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: Date | null;
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
