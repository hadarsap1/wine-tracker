-- ============================================================
-- Property Landing Builder – Initial Schema
-- Migration: 001_initial_schema.sql
-- Run via: psql $DATABASE_URL -f this_file.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- agencies
-- -------------------------------------------------------
CREATE TABLE agencies (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  logo_url        text,
  primary_color   text,
  secondary_color text,
  contact_email   text,
  contact_phone   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agencies_slug ON agencies (slug);

-- -------------------------------------------------------
-- agents
-- -------------------------------------------------------
CREATE TABLE agents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid        NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
  name          text        NOT NULL,
  email         text        UNIQUE NOT NULL,
  phone         text,
  photo_url     text,
  role          text        NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  password_hash text,
  calendly_url  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_agency_id ON agents (agency_id);
CREATE INDEX idx_agents_email     ON agents (email);

-- -------------------------------------------------------
-- listings
-- -------------------------------------------------------
CREATE TABLE listings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           uuid        NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
  agent_id            uuid        REFERENCES agents (id) ON DELETE SET NULL,
  slug                text        NOT NULL,
  status              text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold')),

  -- Step 1: Basic Info
  title               text,
  street              text,
  city                text,
  neighborhood        text,
  price               integer,
  price_on_request    boolean     NOT NULL DEFAULT false,
  built_area          integer,
  outdoor_area        integer,
  rooms               numeric(4,1),

  -- Step 2: Specs
  floor               integer,
  total_floors        integer,
  parking_spots       integer,
  parking_covered     boolean,
  has_storage         boolean,
  has_saferoom        boolean,
  has_elevator        boolean,
  air_directions      text[]      NOT NULL DEFAULT '{}',
  build_year          integer,
  renovation_year     integer,
  bathrooms           integer,

  -- Step 3: AI Content
  raw_description     text,
  ai_title            text,
  ai_tagline          text,
  ai_story            text,
  ai_highlights       text[]      NOT NULL DEFAULT '{}',

  -- Step 4: Media
  hero_image_url      text,
  image_urls          text[]      NOT NULL DEFAULT '{}',
  video_url           text,
  gallery_type        text        DEFAULT 'grid' CHECK (gallery_type IN ('grid', 'carousel-manual', 'carousel-auto')),
  carousel_speed      integer,

  -- Step 5: Map
  show_map            boolean     NOT NULL DEFAULT true,
  map_query_override  text,

  -- Steps 6-7: Design
  template_id         text,
  accent_color        text,
  font_style          text,
  section_order       text[]      NOT NULL DEFAULT '{}',
  hidden_sections     text[]      NOT NULL DEFAULT '{}',

  -- Step 8: Contact
  seller_name         text,
  seller_phone        text,
  seller_whatsapp     text,

  -- Open House
  open_house_date     timestamptz,
  open_house_end      timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (agency_id, slug)
);

CREATE INDEX idx_listings_agency_id ON listings (agency_id);
CREATE INDEX idx_listings_agent_id  ON listings (agent_id);
CREATE INDEX idx_listings_status    ON listings (status);
CREATE INDEX idx_listings_slug      ON listings (agency_id, slug);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- seller_tokens  (magic-link access for sellers)
-- -------------------------------------------------------
CREATE TABLE seller_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  token      text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_tokens_listing_id ON seller_tokens (listing_id);
CREATE INDEX idx_seller_tokens_token      ON seller_tokens (token);

-- -------------------------------------------------------
-- pending_changes  (seller edits awaiting agent approval)
-- -------------------------------------------------------
CREATE TABLE pending_changes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  seller_token_id uuid        REFERENCES seller_tokens (id) ON DELETE SET NULL,
  change_type     text        NOT NULL CHECK (change_type IN ('images', 'price', 'description')),
  change_data     jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  agent_note      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);

CREATE INDEX idx_pending_changes_listing_id ON pending_changes (listing_id);
CREATE INDEX idx_pending_changes_status     ON pending_changes (status);

-- -------------------------------------------------------
-- leads
-- -------------------------------------------------------
CREATE TABLE leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  agency_id        uuid        NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
  name             text,
  phone            text,
  email            text,
  source           text        NOT NULL CHECK (source IN ('booking', 'open_house', 'whatsapp', 'direct')),
  status           text        NOT NULL DEFAULT 'new'
                               CHECK (status IN ('new', 'contacted', 'visited', 'serious', 'irrelevant', 'offer_made', 'closed')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_interaction timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_listing_id ON leads (listing_id);
CREATE INDEX idx_leads_agency_id  ON leads (agency_id);
CREATE INDEX idx_leads_status     ON leads (status);

-- -------------------------------------------------------
-- lead_notes
-- -------------------------------------------------------
CREATE TABLE lead_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid        NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  agent_id        uuid        REFERENCES agents (id) ON DELETE SET NULL,
  note            text        NOT NULL,
  follow_up_at    timestamptz,
  follow_up_done  boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_id      ON lead_notes (lead_id);
CREATE INDEX idx_lead_notes_follow_up_at ON lead_notes (follow_up_at) WHERE follow_up_done = false;

-- -------------------------------------------------------
-- open_house_registrations
-- -------------------------------------------------------
CREATE TABLE open_house_registrations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  name       text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ohr_listing_id ON open_house_registrations (listing_id);

-- -------------------------------------------------------
-- analytics_events
-- -------------------------------------------------------
CREATE TABLE analytics_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid        REFERENCES listings (id) ON DELETE CASCADE,
  agency_id  uuid        REFERENCES agencies (id) ON DELETE CASCADE,
  event_type text        NOT NULL
             CHECK (event_type IN (
               'page_view', 'whatsapp_click', 'phone_click',
               'booking_click', 'open_house_register', 'wiki_question'
             )),
  referrer   text,
  utm_source text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_listing_id  ON analytics_events (listing_id);
CREATE INDEX idx_analytics_agency_id   ON analytics_events (agency_id);
CREATE INDEX idx_analytics_event_type  ON analytics_events (event_type);
CREATE INDEX idx_analytics_created_at  ON analytics_events (created_at DESC);
