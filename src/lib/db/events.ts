/**
 * Database queries for events and calendar
 */
import { query, transaction } from "./pool";
import { generateUUID } from "./uuid";
import type { EventType, EventStatus, PackageType, PaymentStatus, CalendarEventType } from "./types";

/**
 * Find many event bookings
 */
export async function findManyEventBookings(options: {
  where?: {
    eventType?: EventType;
    status?: EventStatus;
    userId?: string;
    search?: string;
  };
  orderBy?: { [key: string]: 'asc' | 'desc' };
  skip?: number;
  take?: number;
}): Promise<{ events: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.where?.eventType) {
    conditions.push(`e.event_type = $${paramIndex++}`);
    values.push(options.where.eventType);
  }
  if (options.where?.status) {
    conditions.push(`e.status = $${paramIndex++}`);
    values.push(options.where.status);
  }
  if (options.where?.userId) {
    conditions.push(`e.user_id = $${paramIndex++}`);
    values.push(options.where.userId);
  }
  if (options.where?.search) {
    conditions.push(`(
      e.booking_number ILIKE $${paramIndex}
      OR e.full_name ILIKE $${paramIndex}
      OR e.email ILIKE $${paramIndex}
      OR e.phone_number ILIKE $${paramIndex}
      OR COALESCE(e.company_or_group_name, '') ILIKE $${paramIndex}
    )`);
    values.push(`%${options.where.search}%`);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query(
    `SELECT COUNT(*)::int as count FROM event_bookings e ${whereClause}`,
    values
  );
  const total = countResult.rows[0]?.count ?? 0;

  // Build main query
  let sql = `
    SELECT e.*,
           u.id as user_id, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone
    FROM event_bookings e
    LEFT JOIN users u ON e.user_id = u.id
    ${whereClause}
  `;

  // Order by
  const orderBy = options.orderBy || { created_at: 'desc' };
  const orderParts = Object.entries(orderBy).map(([key, dir]) => `e.${key} ${dir.toUpperCase()}`);
  sql += ` ORDER BY ${orderParts.join(', ')}`;

  // Pagination
  if (options.take) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.take);
  }
  if (options.skip) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(options.skip);
  }

  const result = await query(sql, values);

  const events = result.rows.map(row => ({
    id: row.id,
    bookingNumber: row.booking_number,
    userId: row.user_id,
    eventType: row.event_type,
    selectedDate: row.selected_date,
    selectedTime: row.selected_time,
    packageType: row.package_type,
    numberOfParticipants: row.number_of_participants,
    numberOfGroups: row.number_of_groups,
    gifts: row.gifts,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    companyOrGroupName: row.company_or_group_name,
    preferredDish: row.preferred_dish,
    specialRequests: row.special_requests,
    status: row.status,
    clientConfirmed: row.client_confirmed,
    clientConfirmedAt: row.client_confirmed_at,
    digitalSignature: row.digital_signature,
    agreementAccepted: row.agreement_accepted,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : null,
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    paymentProof: row.payment_proof,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id ? {
      id: row.user_id,
      fullName: row.user_full_name,
      email: row.user_email,
      phoneNumber: row.user_phone,
    } : null,
  }));

  return { events, total };
}

/**
 * Find unique event booking
 */
export async function findUniqueEventBooking(
  where: { id?: string; bookingNumber?: string }
): Promise<Record<string, unknown> | null> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (where.id) {
    conditions.push(`e.id = $${paramIndex++}`);
    values.push(where.id);
  }
  if (where.bookingNumber) {
    conditions.push(`e.booking_number = $${paramIndex++}`);
    values.push(where.bookingNumber);
  }

  if (conditions.length === 0) return null;

  const result = await query(
    `SELECT e.*,
            u.id as user_id, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone
     FROM event_bookings e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE ${conditions.join(' AND ')}`,
    values
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    userId: row.user_id,
    eventType: row.event_type,
    selectedDate: row.selected_date,
    selectedTime: row.selected_time,
    packageType: row.package_type,
    numberOfParticipants: row.number_of_participants,
    numberOfGroups: row.number_of_groups,
    gifts: row.gifts,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    companyOrGroupName: row.company_or_group_name,
    preferredDish: row.preferred_dish,
    specialRequests: row.special_requests,
    status: row.status,
    clientConfirmed: row.client_confirmed,
    clientConfirmedAt: row.client_confirmed_at,
    digitalSignature: row.digital_signature,
    agreementAccepted: row.agreement_accepted,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : null,
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    paymentProof: row.payment_proof,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id ? {
      id: row.user_id,
      fullName: row.user_full_name,
      email: row.user_email,
      phoneNumber: row.user_phone,
    } : null,
  };
}

/**
 * Create event booking
 */
export async function createEventBooking(data: {
  userId?: string;
  eventType: EventType;
  selectedDate: Date;
  selectedTime: string;
  packageType?: PackageType;
  numberOfParticipants: number;
  numberOfGroups?: number;
  gifts?: Record<string, unknown>;
  fullName: string;
  email: string;
  phoneNumber: string;
  companyOrGroupName?: string;
  preferredDish?: string;
  specialRequests?: string;
  totalAmount?: number;
}): Promise<Record<string, unknown>> {
  const id = generateUUID();
  const now = new Date();
  
  // Generate booking number
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const countResult = await query(`SELECT COUNT(*)::int as count FROM event_bookings`);
  const count = countResult.rows[0]?.count ?? 0;
  const bookingNumber = `EVT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const result = await query(
    `INSERT INTO event_bookings (
      id, booking_number, user_id, event_type, selected_date, selected_time,
      package_type, number_of_participants, number_of_groups, gifts,
      full_name, email, phone_number, company_or_group_name, preferred_dish,
      special_requests, status, total_amount, currency, payment_status,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *`,
    [
      id,
      bookingNumber,
      data.userId || null,
      data.eventType,
      data.selectedDate,
      data.selectedTime,
      data.packageType || null,
      data.numberOfParticipants,
      data.numberOfGroups || null,
      data.gifts ? JSON.stringify(data.gifts) : null,
      data.fullName,
      data.email,
      data.phoneNumber,
      data.companyOrGroupName || null,
      data.preferredDish || null,
      data.specialRequests || null,
      'NEW',
      data.totalAmount || null,
      'OMR',
      'PENDING',
      now,
      now,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    userId: row.user_id,
    eventType: row.event_type,
    selectedDate: row.selected_date,
    selectedTime: row.selected_time,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Update event booking
 */
export async function updateEventBooking(
  id: string,
  data: Partial<{
    status: EventStatus;
    packageType: PackageType;
    numberOfParticipants: number;
    numberOfGroups: number;
    gifts: Record<string, unknown>;
    fullName: string;
    email: string;
    phoneNumber: string;
    companyOrGroupName: string;
    preferredDish: string;
    specialRequests: string;
    clientConfirmed: boolean;
    clientConfirmedAt: Date;
    digitalSignature: string;
    agreementAccepted: boolean;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    paidAt: Date;
    paymentProof: string;
    adminNotes: string;
  }>
): Promise<Record<string, unknown> | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    status: 'status',
    packageType: 'package_type',
    numberOfParticipants: 'number_of_participants',
    numberOfGroups: 'number_of_groups',
    gifts: 'gifts',
    fullName: 'full_name',
    email: 'email',
    phoneNumber: 'phone_number',
    companyOrGroupName: 'company_or_group_name',
    preferredDish: 'preferred_dish',
    specialRequests: 'special_requests',
    clientConfirmed: 'client_confirmed',
    clientConfirmedAt: 'client_confirmed_at',
    digitalSignature: 'digital_signature',
    agreementAccepted: 'agreement_accepted',
    totalAmount: 'total_amount',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    paidAt: 'paid_at',
    paymentProof: 'payment_proof',
    adminNotes: 'admin_notes',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      updates.push(`${dbField} = $${paramIndex++}`);
      values.push(key === 'gifts' ? JSON.stringify(value) : value);
    }
  }

  if (updates.length === 0) {
    return await findUniqueEventBooking({ id });
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const result = await query(
    `UPDATE event_bookings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;

  return await findUniqueEventBooking({ id });
}

/**
 * Delete event booking
 */
export async function deleteEventBooking(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM event_bookings WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Count event bookings
 */
export async function countEventBookings(): Promise<number> {
  const result = await query(`SELECT COUNT(*)::int as count FROM event_bookings`);
  return result.rows[0]?.count ?? 0;
}

// ==================== Calendar Events ====================

let calendarEnhancementsReady = false;

async function ensureCalendarEnhancements(): Promise<void> {
  if (calendarEnhancementsReady) return;

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'calendar_event_type'
          AND e.enumlabel = 'APPOINTMENT'
      ) THEN
        ALTER TYPE calendar_event_type ADD VALUE 'APPOINTMENT';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'calendar_event_type'
          AND e.enumlabel = 'SCHEDULER'
      ) THEN
        ALTER TYPE calendar_event_type ADD VALUE 'SCHEDULER';
      END IF;
    END $$;
  `);

  await query(`
    ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS appointment_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS appointment_contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER,
      ADD COLUMN IF NOT EXISTS notify_at_start BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS start_notification_sent_at TIMESTAMP WITH TIME ZONE
  `);

  calendarEnhancementsReady = true;
}

/**
 * Find calendar events
 */
export async function findCalendarEvents(options?: {
  startDate?: Date;
  endDate?: Date;
  type?: CalendarEventType;
}): Promise<Record<string, unknown>[]> {
  try {
    await ensureCalendarEnhancements();

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.startDate && options?.endDate) {
      conditions.push(`ce.end_date_time > $${paramIndex++}`);
      values.push(options.startDate);
      conditions.push(`ce.start_date_time < $${paramIndex++}`);
      values.push(options.endDate);
    }

    if (options?.type) {
      conditions.push(`ce.type = $${paramIndex++}`);
      values.push(options.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT ce.*,
              cs.id as session_id,
              c.id as class_id, c.title as class_title, c.category as class_category,
              t.id as trainer_id, t.full_name as trainer_full_name,
              eb.id as event_booking_id, eb.booking_number, eb.event_type, eb.full_name as event_full_name, eb.status as event_status
       FROM calendar_events ce
       LEFT JOIN class_sessions cs ON ce.class_session_id = cs.id
       LEFT JOIN classes c ON cs.class_id = c.id
       LEFT JOIN users t ON c.trainer_id = t.id
       LEFT JOIN event_bookings eb ON ce.event_booking_id = eb.id
       ${whereClause}
       ORDER BY ce.start_date_time ASC`,
      values
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      startDateTime: row.start_date_time,
      endDateTime: row.end_date_time,
      title: row.title,
      description: row.description,
      classSessionId: row.class_session_id,
      eventBookingId: row.event_booking_id,
      isBlocked: row.is_blocked,
      blockReason: row.block_reason,
      internalNotes: row.internal_notes,
      visibleToTrainers: row.visible_to_trainers,
      visibleTrainerIds: row.visible_trainer_ids || [],
      appointmentContactName: row.appointment_contact_name,
      appointmentContactPhone: row.appointment_contact_phone,
      notificationsEnabled: row.notifications_enabled,
      reminderMinutesBefore: row.reminder_minutes_before,
      notifyAtStart: row.notify_at_start,
      reminderSentAt: row.reminder_sent_at,
      startNotificationSentAt: row.start_notification_sent_at,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      classSession: row.session_id ? {
        id: row.session_id,
        class: row.class_id ? {
          id: row.class_id,
          title: row.class_title,
          category: row.class_category,
          trainer: row.trainer_id ? {
            id: row.trainer_id,
            fullName: row.trainer_full_name,
          } : null,
        } : null,
      } : null,
      eventBooking: row.event_booking_id ? {
        id: row.event_booking_id,
        bookingNumber: row.booking_number,
        eventType: row.event_type,
        fullName: row.event_full_name,
        status: row.event_status,
      } : null,
    }));
  } catch (error) {
    console.error('Error in findCalendarEvents:', error);
    // Return empty array on error instead of throwing
    return [];
  }
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(data: {
  type: CalendarEventType;
  startDateTime: Date;
  endDateTime: Date;
  title: string;
  description?: string;
  classSessionId?: string;
  classId?: string;
  eventBookingId?: string;
  isBlocked?: boolean;
  blockReason?: string;
  internalNotes?: string;
  visibleToTrainers?: boolean;
  visibleTrainerIds?: string[];
  appointmentContactName?: string;
  appointmentContactPhone?: string;
  notificationsEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  notifyAtStart?: boolean;
  reminderSentAt?: Date | null;
  startNotificationSentAt?: Date | null;
  color?: string;
}): Promise<Record<string, unknown>> {
  await ensureCalendarEnhancements();

  const id = generateUUID();
  const now = new Date();

  const result = await query(
    `INSERT INTO calendar_events (
      id, type, start_date_time, end_date_time, title, description,
      class_session_id, class_id, event_booking_id, is_blocked, block_reason,
      internal_notes, visible_to_trainers, visible_trainer_ids,
      appointment_contact_name, appointment_contact_phone,
      notifications_enabled, reminder_minutes_before, notify_at_start,
      reminder_sent_at, start_notification_sent_at,
      color, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
    )
    RETURNING *`,
    [
      id,
      data.type,
      data.startDateTime,
      data.endDateTime,
      data.title,
      data.description || null,
      data.classSessionId || null,
      data.classId || null,
      data.eventBookingId || null,
      data.isBlocked || false,
      data.blockReason || null,
      data.internalNotes || null,
      data.visibleToTrainers || false,
      data.visibleTrainerIds || [],
      data.appointmentContactName || null,
      data.appointmentContactPhone || null,
      data.notificationsEnabled || false,
      typeof data.reminderMinutesBefore === 'number' ? data.reminderMinutesBefore : null,
      data.notifyAtStart || false,
      data.reminderSentAt || null,
      data.startNotificationSentAt || null,
      data.color || null,
      now,
      now,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    startDateTime: row.start_date_time,
    endDateTime: row.end_date_time,
    title: row.title,
    description: row.description,
    isBlocked: row.is_blocked,
    blockReason: row.block_reason,
    internalNotes: row.internal_notes,
    visibleToTrainers: row.visible_to_trainers,
    visibleTrainerIds: row.visible_trainer_ids || [],
    appointmentContactName: row.appointment_contact_name,
    appointmentContactPhone: row.appointment_contact_phone,
    notificationsEnabled: row.notifications_enabled,
    reminderMinutesBefore: row.reminder_minutes_before,
    notifyAtStart: row.notify_at_start,
    reminderSentAt: row.reminder_sent_at,
    startNotificationSentAt: row.start_notification_sent_at,
    createdAt: row.created_at,
  };
}

// ==================== Wallet Operations ====================

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(userId: string): Promise<Record<string, unknown>> {
  // Try to find existing wallet
  let result = await query(
    `SELECT * FROM wallets WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Create new wallet
    const id = generateUUID();
    const now = new Date();
    result = await query(
      `INSERT INTO wallets (id, user_id, balance, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, 0, 'OMR', now, now]
    );
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    balance: parseFloat(row.balance),
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(
  id: string,
  data: Partial<{
    type: CalendarEventType;
    startDateTime: Date;
    endDateTime: Date;
    title: string;
    description: string;
    isBlocked: boolean;
    blockReason: string;
    internalNotes: string;
    visibleToTrainers: boolean;
    visibleTrainerIds: string[];
    appointmentContactName: string;
    appointmentContactPhone: string;
    notificationsEnabled: boolean;
    reminderMinutesBefore: number | null;
    notifyAtStart: boolean;
    reminderSentAt: Date | null;
    startNotificationSentAt: Date | null;
    color: string;
  }>
): Promise<Record<string, unknown> | null> {
  await ensureCalendarEnhancements();

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    type: 'type',
    startDateTime: 'start_date_time',
    endDateTime: 'end_date_time',
    title: 'title',
    description: 'description',
    isBlocked: 'is_blocked',
    blockReason: 'block_reason',
    internalNotes: 'internal_notes',
    visibleToTrainers: 'visible_to_trainers',
    visibleTrainerIds: 'visible_trainer_ids',
    appointmentContactName: 'appointment_contact_name',
    appointmentContactPhone: 'appointment_contact_phone',
    notificationsEnabled: 'notifications_enabled',
    reminderMinutesBefore: 'reminder_minutes_before',
    notifyAtStart: 'notify_at_start',
    reminderSentAt: 'reminder_sent_at',
    startNotificationSentAt: 'start_notification_sent_at',
    color: 'color',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      updates.push(`${dbField} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    const existing = await query(`SELECT * FROM calendar_events WHERE id = $1 LIMIT 1`, [id]);
    return existing.rows[0] ?? null;
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const result = await query(
    `UPDATE calendar_events
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM calendar_events WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Add credit to wallet
 */
export async function addWalletCredit(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await transaction(async (client) => {
    // Get or create wallet
    let walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      const walletId = generateUUID();
      const now = new Date();
      walletResult = await client.query(
        `INSERT INTO wallets (id, user_id, balance, currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [walletId, userId, 0, 'OMR', now, now]
      );
    }

    const wallet = walletResult.rows[0];

    // Update balance
    await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = $2 WHERE id = $3`,
      [amount, new Date(), wallet.id]
    );

    // Create transaction record
    const transactionId = generateUUID();
    await client.query(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, type, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [transactionId, wallet.id, amount, 'CREDIT', reason, new Date()]
    );
  });
}

/**
 * Get event bookings by user ID
 */
export async function getEventBookingsByUserId(userId: string) {
  const result = await query(
    `SELECT * FROM event_bookings WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({
    ...row,
    total_amount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null,
  }));
}

export async function getEventBookingByIdForUser(userId: string, bookingId: string) {
  const result = await query(
    `SELECT * FROM event_bookings
     WHERE user_id = $1 AND id = $2
     LIMIT 1`,
    [userId, bookingId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    total_amount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null,
  };
}
