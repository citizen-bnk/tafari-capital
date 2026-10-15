BEGIN;
CREATE TABLE IF NOT EXISTS asset_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reference text NOT NULL UNIQUE,resume_hash text NOT NULL UNIQUE,owner_id text REFERENCES profiles(id),listing_id uuid UNIQUE REFERENCES listings(id),contact_name text NOT NULL,contact_email text NOT NULL DEFAULT '',contact_phone text NOT NULL DEFAULT '',contact_preference text NOT NULL CHECK(contact_preference IN ('Phone call','Email')),answers jsonb NOT NULL DEFAULT '{}',state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','submitted')),status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','closed')),staff_notes text NOT NULL DEFAULT '',source text NOT NULL DEFAULT 'web' CHECK(source IN ('web','whatsapp')),questionnaire_version integer NOT NULL DEFAULT 1,revision integer NOT NULL DEFAULT 1,consented_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),submitted_at timestamptz);
CREATE INDEX IF NOT EXISTS applications_owner ON asset_applications(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS applications_status ON asset_applications(status,created_at DESC);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES asset_applications(id);
CREATE UNIQUE INDEX IF NOT EXISTS listing_application_source ON listings(application_id);
INSERT INTO schema_migrations(version) VALUES ('002_asset_applications') ON CONFLICT DO NOTHING;
COMMIT;
