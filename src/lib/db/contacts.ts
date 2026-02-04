/**
 * Database queries for contact messages
 */
import { query } from "./pool";
import type { ContactMessageStatus } from "./types";

// Helper to generate CUID-like IDs
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}

/**
 * Create contact message
 */
export async function createContactMessage(data: {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}): Promise<Record<string, unknown>> {
  const id = generateId();
  const now = new Date();

  const result = await query(
    `INSERT INTO contact_messages (id, name, email, phone, subject, message, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      data.name,
      data.email,
      data.phone,
      data.subject,
      data.message,
      'NEW',
      now,
      now,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Find contact messages
 */
export async function findContactMessages(options?: {
  status?: ContactMessageStatus;
  skip?: number;
  take?: number;
}): Promise<{ messages: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
}[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(options.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query(
    `SELECT COUNT(*)::int as count FROM contact_messages ${whereClause}`,
    values
  );
  const total = countResult.rows[0]?.count ?? 0;

  // Build main query
  let sql = `SELECT * FROM contact_messages ${whereClause} ORDER BY created_at DESC`;

  if (options?.take) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.take);
  }
  if (options?.skip) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(options.skip);
  }

  const result = await query(sql, values);

  const messages = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));

  return { messages, total };
}

/**
 * Update contact message status
 */
export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus
): Promise<boolean> {
  const result = await query(
    `UPDATE contact_messages SET status = $1 WHERE id = $2`,
    [status, id]
  );
  return (result.rowCount ?? 0) > 0;
}
