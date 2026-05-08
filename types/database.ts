export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'customer' | 'tailor' | 'admin'
  specialties: string[] | null
  onboarding_complete: boolean
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
  // Customer uses "comments" field for order notes
  comments: string | null
  pickup_date: string | null
  pickup_time: string | null
  pickup_address: string | null       // aligned with customer app
  measurement_id: string | null
  image_urls: string[] | null
  created_at: string
  updated_at: string | null
  // joined fields (from select with profiles)
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
