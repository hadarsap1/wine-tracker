import { sql } from '@vercel/postgres'
import type {
  Agency,
  Agent,
  Listing,
  Lead,
  LeadNote,
  SellerToken,
  PendingChange,
  OpenHouseRegistration,
  AnalyticsEventRow,
  AnalyticsEvent,
  LeadSource,
  LeadStatus,
} from './schema'

export { sql }

// ─── Agencies ────────────────────────────────────────────

export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const { rows } = await sql<Agency>`
    SELECT * FROM agencies WHERE slug = ${slug} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getAgencyById(id: string): Promise<Agency | null> {
  const { rows } = await sql<Agency>`
    SELECT * FROM agencies WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

// ─── Agents ──────────────────────────────────────────────

export async function getAgentByEmail(email: string): Promise<Agent | null> {
  const { rows } = await sql<Agent>`
    SELECT * FROM agents WHERE email = ${email} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getAgentsByAgency(agencyId: string): Promise<Agent[]> {
  const { rows } = await sql<Agent>`
    SELECT * FROM agents WHERE agency_id = ${agencyId} ORDER BY name
  `
  return rows
}

// ─── Listings ────────────────────────────────────────────

export async function getListingBySlug(
  agencyId: string,
  slug: string,
): Promise<Listing | null> {
  const { rows } = await sql<Listing>`
    SELECT * FROM listings
    WHERE agency_id = ${agencyId} AND slug = ${slug}
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function getListingById(id: string): Promise<Listing | null> {
  const { rows } = await sql<Listing>`
    SELECT * FROM listings WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getListingsByAgent(agentId: string): Promise<Listing[]> {
  const { rows } = await sql<Listing>`
    SELECT * FROM listings WHERE agent_id = ${agentId} ORDER BY created_at DESC
  `
  return rows
}

export async function getListingsByAgency(agencyId: string): Promise<Listing[]> {
  const { rows } = await sql<Listing>`
    SELECT * FROM listings WHERE agency_id = ${agencyId} ORDER BY created_at DESC
  `
  return rows
}

// ─── Seller tokens ───────────────────────────────────────

export async function getValidSellerToken(token: string): Promise<SellerToken | null> {
  const { rows } = await sql<SellerToken>`
    SELECT * FROM seller_tokens
    WHERE token = ${token} AND expires_at > now()
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function createSellerToken(
  listingId: string,
  expiresInHours = 72,
): Promise<SellerToken> {
  const { rows } = await sql<SellerToken>`
    INSERT INTO seller_tokens (listing_id, expires_at)
    VALUES (${listingId}, now() + (${expiresInHours} || ' hours')::interval)
    RETURNING *
  `
  return rows[0]
}

// ─── Pending changes ─────────────────────────────────────

export async function getPendingChanges(listingId: string): Promise<PendingChange[]> {
  const { rows } = await sql<PendingChange>`
    SELECT * FROM pending_changes
    WHERE listing_id = ${listingId} AND status = 'pending'
    ORDER BY created_at DESC
  `
  return rows
}

// ─── Leads ───────────────────────────────────────────────

export async function createLead(data: {
  listing_id: string
  agency_id: string
  name?: string
  phone?: string
  email?: string
  source: LeadSource
}): Promise<Lead> {
  const { rows } = await sql<Lead>`
    INSERT INTO leads (listing_id, agency_id, name, phone, email, source)
    VALUES (
      ${data.listing_id},
      ${data.agency_id},
      ${data.name ?? null},
      ${data.phone ?? null},
      ${data.email ?? null},
      ${data.source}
    )
    RETURNING *
  `
  return rows[0]
}

export async function getLeadsByAgency(
  agencyId: string,
  status?: LeadStatus,
): Promise<Lead[]> {
  if (status) {
    const { rows } = await sql<Lead>`
      SELECT * FROM leads
      WHERE agency_id = ${agencyId} AND status = ${status}
      ORDER BY created_at DESC
    `
    return rows
  }
  const { rows } = await sql<Lead>`
    SELECT * FROM leads WHERE agency_id = ${agencyId} ORDER BY created_at DESC
  `
  return rows
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  await sql`
    UPDATE leads
    SET status = ${status}, last_interaction = now()
    WHERE id = ${leadId}
  `
}

// ─── Lead notes ──────────────────────────────────────────

export async function addLeadNote(data: {
  lead_id: string
  agent_id: string
  note: string
  follow_up_at?: Date
}): Promise<LeadNote> {
  const { rows } = await sql<LeadNote>`
    INSERT INTO lead_notes (lead_id, agent_id, note, follow_up_at)
    VALUES (
      ${data.lead_id},
      ${data.agent_id},
      ${data.note},
      ${data.follow_up_at?.toISOString() ?? null}
    )
    RETURNING *
  `
  await sql`
    UPDATE leads SET last_interaction = now() WHERE id = ${data.lead_id}
  `
  return rows[0]
}

// ─── Open house registrations ────────────────────────────

export async function registerForOpenHouse(data: {
  listing_id: string
  name?: string
  phone?: string
}): Promise<OpenHouseRegistration> {
  const { rows } = await sql<OpenHouseRegistration>`
    INSERT INTO open_house_registrations (listing_id, name, phone)
    VALUES (${data.listing_id}, ${data.name ?? null}, ${data.phone ?? null})
    RETURNING *
  `
  return rows[0]
}

// ─── Analytics ───────────────────────────────────────────

export async function trackEvent(data: {
  listing_id?: string
  agency_id?: string
  event_type: AnalyticsEvent
  referrer?: string
  utm_source?: string
  session_id?: string
}): Promise<void> {
  await sql`
    INSERT INTO analytics_events
      (listing_id, agency_id, event_type, referrer, utm_source, session_id)
    VALUES (
      ${data.listing_id ?? null},
      ${data.agency_id ?? null},
      ${data.event_type},
      ${data.referrer ?? null},
      ${data.utm_source ?? null},
      ${data.session_id ?? null}
    )
  `
}

export async function getAnalyticsSummary(
  listingId: string,
  days = 30,
): Promise<{ event_type: AnalyticsEvent; count: number }[]> {
  const { rows } = await sql<{ event_type: AnalyticsEvent; count: string }>`
    SELECT event_type, COUNT(*)::text AS count
    FROM analytics_events
    WHERE listing_id = ${listingId}
      AND created_at > now() - (${days} || ' days')::interval
    GROUP BY event_type
  `
  return rows.map((r) => ({ event_type: r.event_type, count: parseInt(r.count) }))
}
