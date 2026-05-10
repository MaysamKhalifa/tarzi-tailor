export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'customer' | 'tailor' | 'admin'
  // basic tailor fields (already in profile page)
  bio: string | null
  specialty: string | null
  years_exp: number | null
  city: string | null
  area: string | null
  // new onboarding fields
  shop_name: string | null
  shop_address: string | null
  permit_url: string | null
  languages: string[] | null
  availability: string | null
  // i18n preference
  preferred_language: string | null
  // multi-select specialties
  specialties: string[] | null
  onboarding_complete: boolean
  // admin approval
  is_approved: boolean
  // notification preferences
  notification_preferences: Record<string, boolean> | null
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  tailor_id: string | null
  tailor_name: string | null
  order_number: string
  service_type: 'alterations' | 'from_scratch' | 'upcycling'
  garment_type: string
  gender: 'male' | 'female' | null
  status: 'pending' | 'confirmed' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
  price: number | null
  tailor_price: number | null
  tailor_note: string | null
  decline_reason: string | null
  comments: string | null
  pickup_date: string | null
  pickup_time: string | null
  pickup_address: string | null
  measurement_id: string | null
  image_urls: string[] | null
  created_at: string
  updated_at: string | null
  // joined fields
  customer_name?: string | null
  customer_phone?: string | null
}

export interface ChatMessage {
  id: string
  order_id: string
  sender_id: string
  sender_type: 'customer' | 'tailor'
  sender_name: string | null
  message: string
  created_at: string
}

export interface Measurement {
  id: string
  user_id: string
  name: string
  gender: 'male' | 'female'
  chest: number | null
  waist: number | null
  hips: number | null
  shoulder_width: number | null
  arm_length: number | null
  neck: number | null
  inseam: number | null
  thigh: number | null
  height: number | null
  weight: number | null
  notes: string | null
  is_default: boolean
  created_at: string
}

export interface PortfolioItem {
  id: string
  tailor_id: string
  image_url: string
  caption: string | null
  created_at: string
}
