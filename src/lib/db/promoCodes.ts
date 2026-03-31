import { pool } from './pool';

let promoCodesTableReady = false;

async function ensurePromoCodesTable(): Promise<void> {
  if (promoCodesTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(50) NOT NULL,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
      discount_value NUMERIC(10, 3) NOT NULL DEFAULT 0,
      max_uses INTEGER DEFAULT NULL,
      times_used INTEGER NOT NULL DEFAULT 0,
      min_order_amount NUMERIC(10, 3) NOT NULL DEFAULT 0,
      starts_at TIMESTAMPTZ DEFAULT NULL,
      expires_at TIMESTAMPTZ DEFAULT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_unique ON promo_codes (UPPER(code))`);
  promoCodesTableReady = true;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export type PromoCode = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses: number | null;
  timesUsed: number;
  minOrderAmount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PromoCodeRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: string | number;
  max_uses: number | null;
  times_used: number;
  min_order_amount: string | number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapRow(r: PromoCodeRow): PromoCode {
  return {
    id: r.id,
    code: r.code,
    discountType: r.discount_type as PromoCode['discountType'],
    discountValue: Number(r.discount_value),
    maxUses: r.max_uses,
    timesUsed: Number(r.times_used),
    minOrderAmount: Number(r.min_order_amount),
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD                                                         */
/* ------------------------------------------------------------------ */
export async function listPromoCodes(): Promise<PromoCode[]> {
  await ensurePromoCodesTable();
  const { rows } = await pool.query(
    `SELECT * FROM promo_codes ORDER BY created_at DESC`
  );
  return (rows as PromoCodeRow[]).map(mapRow);
}

export async function getPromoCodeById(id: string): Promise<PromoCode | null> {
  await ensurePromoCodesTable();
  const { rows } = await pool.query(`SELECT * FROM promo_codes WHERE id = $1`, [id]);
  return rows.length ? mapRow(rows[0] as PromoCodeRow) : null;
}

export async function createPromoCode(data: {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses?: number | null;
  minOrderAmount?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
}): Promise<PromoCode> {
  await ensurePromoCodesTable();
  const { rows } = await pool.query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, min_order_amount, starts_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.code.trim().toUpperCase(),
      data.discountType,
      data.discountValue,
      data.maxUses ?? null,
      data.minOrderAmount ?? 0,
      data.startsAt || null,
      data.expiresAt || null,
    ]
  );
  return mapRow(rows[0] as PromoCodeRow);
}

export async function updatePromoCode(
  id: string,
  data: {
    code?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    maxUses?: number | null;
    minOrderAmount?: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    isActive?: boolean;
  }
): Promise<PromoCode | null> {
  await ensurePromoCodesTable();
  const existing = await getPromoCodeById(id);
  if (!existing) return null;

  const code = data.code !== undefined ? data.code.trim().toUpperCase() : existing.code;
  const discountType = data.discountType ?? existing.discountType;
  const discountValue = data.discountValue ?? existing.discountValue;
  const maxUses = data.maxUses !== undefined ? data.maxUses : existing.maxUses;
  const minOrderAmount = data.minOrderAmount ?? existing.minOrderAmount;
  const startsAt = data.startsAt !== undefined ? (data.startsAt || null) : existing.startsAt;
  const expiresAt = data.expiresAt !== undefined ? (data.expiresAt || null) : existing.expiresAt;
  const isActive = data.isActive !== undefined ? data.isActive : existing.isActive;

  const { rows } = await pool.query(
    `UPDATE promo_codes
     SET code = $2, discount_type = $3, discount_value = $4, max_uses = $5,
         min_order_amount = $6, starts_at = $7, expires_at = $8, is_active = $9, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, code, discountType, discountValue, maxUses, minOrderAmount, startsAt, expiresAt, isActive]
  );
  return rows.length ? mapRow(rows[0] as PromoCodeRow) : null;
}

export async function deletePromoCode(id: string): Promise<boolean> {
  await ensurePromoCodesTable();
  const { rowCount } = await pool.query(`DELETE FROM promo_codes WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/*  Public: validate & apply                                           */
/* ------------------------------------------------------------------ */
export async function validatePromoCode(
  code: string,
  orderAmount: number
): Promise<{ valid: false; reason: string } | { valid: true; promo: PromoCode; discountAmount: number }> {
  await ensurePromoCodesTable();
  const { rows } = await pool.query(
    `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1)`,
    [code.trim()]
  );

  if (!rows.length) {
    return { valid: false, reason: 'Promo code not found' };
  }

  const promo = mapRow(rows[0] as PromoCodeRow);

  if (!promo.isActive) {
    return { valid: false, reason: 'Promo code is no longer active' };
  }

  const now = new Date();
  if (promo.startsAt && new Date(promo.startsAt) > now) {
    return { valid: false, reason: 'Promo code is not yet active' };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    return { valid: false, reason: 'Promo code has expired' };
  }

  if (promo.maxUses !== null && promo.timesUsed >= promo.maxUses) {
    return { valid: false, reason: 'Promo code usage limit reached' };
  }

  if (orderAmount < promo.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount is ${promo.minOrderAmount} OMR` };
  }

  let discountAmount: number;
  if (promo.discountType === 'PERCENTAGE') {
    discountAmount = Number(((orderAmount * promo.discountValue) / 100).toFixed(3));
  } else {
    discountAmount = Math.min(promo.discountValue, orderAmount);
  }

  // Never discount more than order total
  discountAmount = Math.min(discountAmount, orderAmount);

  return { valid: true, promo, discountAmount };
}

export async function incrementPromoCodeUsage(id: string): Promise<void> {
  await ensurePromoCodesTable();
  await pool.query(
    `UPDATE promo_codes SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}
