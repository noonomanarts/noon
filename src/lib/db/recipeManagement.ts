import { query } from './pool';

let recipeManagementSchemaReady: Promise<void> | null = null;

export async function ensureRecipeManagementSchema(): Promise<void> {
  if (recipeManagementSchemaReady) {
    return recipeManagementSchemaReady;
  }

  recipeManagementSchemaReady = (async () => {
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS trainer_photos TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS highlighted_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_title VARCHAR(255)`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_pdf VARCHAR(500)`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_brief TEXT`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_visible_to_customers BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_published_at TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS admin_workshop_notes TEXT`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS admin_workshop_notes_photo VARCHAR(500)`);

    await query(`
      UPDATE class_sessions
      SET trainer_photos = COALESCE(photos, '{}')
      WHERE (trainer_photos IS NULL OR CARDINALITY(trainer_photos) = 0)
        AND photos IS NOT NULL
        AND CARDINALITY(photos) > 0
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_class_sessions_final_recipe_visible
      ON class_sessions(final_recipe_visible_to_customers)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_class_sessions_final_recipe_published_at
      ON class_sessions(final_recipe_published_at DESC)
    `);
  })().catch((error) => {
    recipeManagementSchemaReady = null;
    throw error;
  });

  return recipeManagementSchemaReady;
}
