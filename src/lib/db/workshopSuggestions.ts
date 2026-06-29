import { query } from './pool';

export type WorkshopSuggestionStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN';

export type PublicWorkshopSuggestion = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  votesCount: number;
  votedByCurrentUser: boolean;
};

export type AdminWorkshopSuggestion = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  status: WorkshopSuggestionStatus;
  votesCount: number;
  createdAt: Date;
};

export type AdminWorkshopSuggestionStats = {
  total: number;
  pending: number;
  published: number;
  totalVotes: number;
};

let workshopSuggestionsReady: Promise<void> | null = null;

async function ensureWorkshopSuggestionTables(): Promise<void> {
  if (workshopSuggestionsReady) return workshopSuggestionsReady;

  workshopSuggestionsReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS workshop_suggestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        title_ar TEXT,
        description TEXT,
        description_ar TEXT,
        submitter_name TEXT,
        submitter_email TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_workshop_suggestions_status ON workshop_suggestions(status)`);
    await query(`
      CREATE TABLE IF NOT EXISTS workshop_suggestion_votes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        suggestion_id UUID NOT NULL REFERENCES workshop_suggestions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT workshop_suggestion_votes_unique UNIQUE (suggestion_id, user_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_workshop_suggestion_votes_suggestion ON workshop_suggestion_votes(suggestion_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_workshop_suggestion_votes_user ON workshop_suggestion_votes(user_id)`);
  })();

  return workshopSuggestionsReady;
}

export async function createWorkshopSuggestion(input: {
  title: string;
  description?: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
}): Promise<{ id: string }> {
  await ensureWorkshopSuggestionTables();

  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required.');
  }
  if (title.length > 200) {
    throw new Error('Title is too long.');
  }

  const description = input.description?.trim() || null;
  const submitterName = input.submitterName?.trim() || null;
  const submitterEmail = input.submitterEmail?.trim() || null;

  const result = await query<{ id: string }>(
    `INSERT INTO workshop_suggestions (title, description, submitter_name, submitter_email, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING id`,
    [title, description, submitterName, submitterEmail]
  );

  return { id: result.rows[0].id };
}

export async function getPublishedWorkshopSuggestions(
  currentUserId?: string | null
): Promise<PublicWorkshopSuggestion[]> {
  await ensureWorkshopSuggestionTables();

  const result = await query<{
    id: string;
    title: string;
    title_ar: string | null;
    description: string | null;
    description_ar: string | null;
    votes_count: number;
    voted_by_current_user: boolean;
  }>(
    `SELECT s.id, s.title, s.title_ar, s.description, s.description_ar,
            COUNT(v.id)::int AS votes_count,
            BOOL_OR(v.user_id = $1) AS voted_by_current_user
     FROM workshop_suggestions s
     LEFT JOIN workshop_suggestion_votes v ON v.suggestion_id = s.id
     WHERE s.status = 'PUBLISHED'
     GROUP BY s.id
     ORDER BY votes_count DESC, s.created_at DESC`,
    [currentUserId ?? null]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    votesCount: Number(row.votes_count ?? 0),
    votedByCurrentUser: Boolean(row.voted_by_current_user),
  }));
}

export async function voteForWorkshopSuggestion(input: {
  suggestionId: string;
  userId: string;
}): Promise<{ votesCount: number; votedByCurrentUser: boolean }> {
  await ensureWorkshopSuggestionTables();

  const published = await query(
    `SELECT 1 FROM workshop_suggestions WHERE id = $1 AND status = 'PUBLISHED'`,
    [input.suggestionId]
  );
  if (published.rows.length === 0) {
    throw new Error('Suggestion is not available for voting.');
  }

  await query(
    `INSERT INTO workshop_suggestion_votes (suggestion_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT ON CONSTRAINT workshop_suggestion_votes_unique DO NOTHING`,
    [input.suggestionId, input.userId]
  );

  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM workshop_suggestion_votes WHERE suggestion_id = $1`,
    [input.suggestionId]
  );

  return { votesCount: Number(result.rows[0]?.count ?? 0), votedByCurrentUser: true };
}

export async function getAdminWorkshopSuggestions(options?: {
  status?: WorkshopSuggestionStatus | 'ALL';
}): Promise<{ items: AdminWorkshopSuggestion[]; stats: AdminWorkshopSuggestionStats }> {
  await ensureWorkshopSuggestionTables();

  const status = options?.status ?? 'ALL';
  const where = status === 'ALL' ? '' : 'WHERE s.status = $1';
  const params = status === 'ALL' ? [] : [status];

  const result = await query<{
    id: string;
    title: string;
    title_ar: string | null;
    description: string | null;
    description_ar: string | null;
    submitter_name: string | null;
    submitter_email: string | null;
    status: WorkshopSuggestionStatus;
    votes_count: number;
    created_at: Date;
  }>(
    `SELECT s.id, s.title, s.title_ar, s.description, s.description_ar,
            s.submitter_name, s.submitter_email, s.status,
            COUNT(v.id)::int AS votes_count, s.created_at
     FROM workshop_suggestions s
     LEFT JOIN workshop_suggestion_votes v ON v.suggestion_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY votes_count DESC, s.created_at DESC`,
    params
  );

  const items = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email,
    status: row.status,
    votesCount: Number(row.votes_count ?? 0),
    createdAt: row.created_at,
  }));

  const statsResult = await query<{ total: number; pending: number; published: number; total_votes: number }>(
    `SELECT
        COUNT(DISTINCT s.id)::int AS total,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'PENDING')::int AS pending,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'PUBLISHED')::int AS published,
        COUNT(v.id)::int AS total_votes
     FROM workshop_suggestions s
     LEFT JOIN workshop_suggestion_votes v ON v.suggestion_id = s.id`
  );
  const statsRow = statsResult.rows[0];

  return {
    items,
    stats: {
      total: Number(statsRow?.total ?? 0),
      pending: Number(statsRow?.pending ?? 0),
      published: Number(statsRow?.published ?? 0),
      totalVotes: Number(statsRow?.total_votes ?? 0),
    },
  };
}

export async function updateWorkshopSuggestionStatus(
  id: string,
  status: WorkshopSuggestionStatus
): Promise<void> {
  await ensureWorkshopSuggestionTables();
  await query(
    `UPDATE workshop_suggestions SET status = $2, updated_at = NOW() WHERE id = $1`,
    [id, status]
  );
}

export async function deleteWorkshopSuggestion(id: string): Promise<void> {
  await ensureWorkshopSuggestionTables();
  await query(`DELETE FROM workshop_suggestions WHERE id = $1`, [id]);
}

export async function countPendingWorkshopSuggestions(): Promise<number> {
  await ensureWorkshopSuggestionTables();
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM workshop_suggestions WHERE status = 'PENDING'`
  );
  return Number(result.rows[0]?.count ?? 0);
}
