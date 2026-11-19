import { query } from './pool';

let recipeManagementSchemaReady: Promise<void> | null = null;

export async function ensureRecipeManagementSchema(): Promise<void> {
  if (recipeManagementSchemaReady) {
    return recipeManagementSchemaReady;
  }

  recipeManagementSchemaReady = (async () => {
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS trainer_photos TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS highlighted_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_title VARCHAR(255)`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_pdf VARCHAR(500)`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_brief TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_title_ar VARCHAR(255)`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_pdf_ar VARCHAR(500)`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_brief_ar TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_visible_to_customers BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_published_at TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS admin_workshop_notes TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS admin_workshop_notes_photo VARCHAR(500)`);

    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_title_ar VARCHAR(255)`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_pdf_ar VARCHAR(500)`);
    await query(`ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS final_recipe_brief_ar TEXT`);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'classes'
            AND column_name = 'photos'
        ) THEN
          UPDATE classes
          SET trainer_photos = COALESCE(photos, '{}')
          WHERE (trainer_photos IS NULL OR CARDINALITY(trainer_photos) = 0)
            AND photos IS NOT NULL
            AND CARDINALITY(photos) > 0;
        ELSIF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'classes'
            AND column_name = 'workshop_photos'
        ) THEN
          UPDATE classes
          SET trainer_photos = COALESCE(workshop_photos, '{}')
          WHERE (trainer_photos IS NULL OR CARDINALITY(trainer_photos) = 0)
            AND workshop_photos IS NOT NULL
            AND CARDINALITY(workshop_photos) > 0;
        END IF;
      END
      $$;
    `);

    // Recipe material that trainers/admins saved on the old per-session
    // table is copied onto the workshop once. Only empty workshop fields are
    // filled, so re-running this never overwrites newer data.
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS recipe_submitted BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS recipe_pdf VARCHAR(500)`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS grocery_list TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_brief TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`
      DO $$
      BEGIN
        IF to_regclass('public.class_sessions') IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'class_sessions' AND column_name = 'recipe_pdf'
           )
        THEN
          UPDATE classes c
          SET recipe_pdf = COALESCE(c.recipe_pdf, legacy.recipe_pdf),
              grocery_list = COALESCE(c.grocery_list, legacy.grocery_list),
              workshop_brief = COALESCE(c.workshop_brief, legacy.workshop_brief),
              recipe_submitted = c.recipe_submitted OR legacy.recipe_submitted
          FROM (
            SELECT DISTINCT ON (class_id)
              class_id, recipe_pdf, grocery_list, workshop_brief, recipe_submitted
            FROM class_sessions
            WHERE recipe_submitted = true
               OR recipe_pdf IS NOT NULL
               OR grocery_list IS NOT NULL
               OR workshop_brief IS NOT NULL
            ORDER BY class_id, start_date_time DESC
          ) AS legacy
          WHERE legacy.class_id = c.id
            AND (
              (c.recipe_pdf IS NULL AND legacy.recipe_pdf IS NOT NULL)
              OR (c.grocery_list IS NULL AND legacy.grocery_list IS NOT NULL)
              OR (c.workshop_brief IS NULL AND legacy.workshop_brief IS NOT NULL)
              OR (c.recipe_submitted = false AND legacy.recipe_submitted = true)
            );
        END IF;
      END
      $$;
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_final_recipe_visible
      ON classes(final_recipe_visible_to_customers)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_final_recipe_published_at
      ON classes(final_recipe_published_at DESC)
    `);
  })().catch((error) => {
    recipeManagementSchemaReady = null;
    throw error;
  });

  return recipeManagementSchemaReady;
}
