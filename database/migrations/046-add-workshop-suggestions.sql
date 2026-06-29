-- Visitor-submitted workshop suggestions and votes
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
);

CREATE INDEX IF NOT EXISTS idx_workshop_suggestions_status ON workshop_suggestions(status);

CREATE TABLE IF NOT EXISTS workshop_suggestion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES workshop_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT workshop_suggestion_votes_unique UNIQUE (suggestion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workshop_suggestion_votes_suggestion ON workshop_suggestion_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_workshop_suggestion_votes_user ON workshop_suggestion_votes(user_id);
