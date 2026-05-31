// TypeScript types mirroring the Postgres schema.
// Use these throughout the Next.js app – not auto-generated, kept in sync manually.

export type AgentRole = 'admin' | 'agent'
export type ListingStatus = 'active' | 'paused' | 'sold'
export type GalleryType = 'grid' | 'carousel-manual' | 'carousel-auto'
export type LeadSource = 'booking' | 'open_house' | 'whatsapp' | 'direct'
export type LeadStatus = 'new' | 'contacted' | 'visited' | 'serious' | 'irrelevant' | 'offer_made' | 'closed'
export type ChangeType = 'images' | 'price' | 'description'
export type PendingStatus = 'pending' | 'approved' | 'rejected'
export type AnalyticsEvent = 'page_view' | 'whatsapp_click' | 'phone_click' | 'booking_click' | 'open_house_register' | 'wiki_question'

export interface Agency {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: Date
}

export interface Agent {
  id: string
  agency_id: string
  name: string
  email: string
  phone: string | null
  photo_url: string | null
  role: AgentRole
  password_hash: string | null
  calendly_url: string | null
  created_at: Date
}

export interface Listing {
  id: string
  agency_id: string
  agent_id: string | null
  slug: string
  status: ListingStatus

  // Step 1
  title: string | null
  street: string | null
  city: string | null
  neighborhood: string | null
  price: number | null
  price_on_request: boolean
  built_area: number | null
  outdoor_area: number | null
  rooms: number | null

  // Step 2
  floor: number | null
  total_floors: number | null
  parking_spots: number | null
  parking_covered: boolean | null
  has_storage: boolean | null
  has_saferoom: boolean | null
  has_elevator: boolean | null
  air_directions: string[]
  build_year: number | null
  renovation_year: number | null
  bathrooms: number | null

  // Step 3
  raw_description: string | null
  ai_title: string | null
  ai_tagline: string | null
  ai_story: string | null
  ai_highlights: string[]

  // Step 4
  hero_image_url: string | null
  image_urls: string[]
  video_url: string | null
  gallery_type: GalleryType | null
  carousel_speed: number | null

  // Step 5
  show_map: boolean
  map_query_override: string | null

  // Steps 6-7
  template_id: string | null
  accent_color: string | null
  font_style: string | null
  section_order: string[]
  hidden_sections: string[]

  // Step 8
  seller_name: string | null
  seller_phone: string | null
  seller_whatsapp: string | null

  open_house_date: Date | null
  open_house_end: Date | null
  created_at: Date
  updated_at: Date
}

export interface SellerToken {
  id: string
  listing_id: string
  token: string
  expires_at: Date
  created_at: Date
}

export interface PendingChange {
  id: string
  listing_id: string
  seller_token_id: string | null
  change_type: ChangeType
  change_data: Record<string, unknown>
  status: PendingStatus
  agent_note: string | null
  created_at: Date
  reviewed_at: Date | null
}

export interface Lead {
  id: string
  listing_id: string
  agency_id: string
  name: string | null
  phone: string | null
  email: string | null
  source: LeadSource
  status: LeadStatus
  created_at: Date
  last_interaction: Date
}

export interface LeadNote {
  id: string
  lead_id: string
  agent_id: string | null
  note: string
  follow_up_at: Date | null
  follow_up_done: boolean
  created_at: Date
}

export interface OpenHouseRegistration {
  id: string
  listing_id: string
  name: string | null
  phone: string | null
  created_at: Date
}

export interface AnalyticsEventRow {
  id: string
  listing_id: string | null
  agency_id: string | null
  event_type: AnalyticsEvent
  referrer: string | null
  utm_source: string | null
  session_id: string | null
  created_at: Date
}
