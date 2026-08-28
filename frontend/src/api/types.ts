// Mirrors backend/app/schemas/*.py and backend/app/models/*.py.
// Decimal fields (price, total_amount, unit_price, total_revenue) are typed as
// `string` because FastAPI serializes Python Decimal to a JSON string, not a number.

export type UserRole = 'patient' | 'doctor' | 'pharmacy' | 'admin'

export interface User {
  id: number
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
  is_approved: boolean
}

export interface RegisterRequest {
  email: string
  phone?: string | null
  password: string
  role: UserRole
  full_name?: string | null
  store_name?: string | null
  license_number?: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// --- Patient ---

export interface PatientProfile {
  full_name: string | null
  health_conditions: string | null
  address: string | null
}

export interface PatientProfileUpdate {
  full_name?: string | null
  health_conditions?: string | null
  address?: string | null
}

// --- Doctor ---

export interface DoctorProfile {
  id: number
  full_name: string | null
  qualification: string | null
  specialization: string | null
  degree_doc_url: string | null
  license_doc_url: string | null
  availability: Record<string, unknown> | null
  is_approved: boolean
}

export interface DoctorProfileUpdate {
  full_name?: string | null
  qualification?: string | null
  specialization?: string | null
  degree_doc_url?: string | null
  license_doc_url?: string | null
  availability?: Record<string, unknown> | null
}

export interface AvailabilitySlotCreate {
  start_time: string
  end_time: string
}

export interface AvailabilitySlot {
  id: number
  doctor_id: number
  start_time: string
  end_time: string
  is_booked: boolean
}

// --- Pharmacy ---

export interface PharmacyProfile {
  id: number
  store_name: string | null
  license_number: string | null
  drug_license_url: string | null
  gstin: string | null
  address: string | null
  is_approved: boolean
}

export interface PharmacyProfileUpdate {
  store_name?: string | null
  license_number?: string | null
  drug_license_url?: string | null
  gstin?: string | null
  address?: string | null
}

// --- Medicine ---

export interface MedicineCreate {
  name: string
  category?: string | null
  description?: string | null
  price: string
  stock_quantity?: number
  requires_prescription?: boolean
}

export interface MedicineUpdate {
  name?: string
  category?: string | null
  description?: string | null
  price?: string
  stock_quantity?: number
  requires_prescription?: boolean
}

export interface Medicine {
  id: number
  pharmacy_id: number
  pharmacy_name: string | null
  name: string
  category: string | null
  description: string | null
  price: string
  stock_quantity: number
  requires_prescription: boolean
  created_at: string
}

// --- Prescription ---

export interface PrescriptionCreate {
  file_url: string
  notes?: string | null
}

export interface Prescription {
  id: number
  patient_id: number
  file_url: string
  notes: string | null
  appointment_id: number | null
  issued_by_doctor_id: number | null
  uploaded_at: string
}

// --- Order ---

export type FulfillmentType = 'delivery' | 'pickup'
export type OrderStatus = 'pending' | 'preparing' | 'shipped' | 'ready_for_pickup' | 'delivered' | 'cancelled'

export interface OrderItemCreate {
  medicine_id: number
  quantity: number
}

export interface OrderCreate {
  pharmacy_id: number
  items: OrderItemCreate[]
  fulfillment_type: FulfillmentType
  delivery_address?: string | null
  prescription_id?: number | null
}

export interface OrderItem {
  medicine_id: number
  medicine_name: string
  quantity: number
  unit_price: string
}

export interface Order {
  id: number
  patient_id: number
  pharmacy_id: number
  prescription_id: number | null
  prescription_file_url: string | null
  fulfillment_type: FulfillmentType
  delivery_address: string | null
  status: OrderStatus
  total_amount: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

// --- Appointment ---

export type ConsultationMode = 'chat' | 'video'
export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'

export interface AppointmentCreate {
  doctor_id: number
  slot_id: number
  consultation_mode: ConsultationMode
  notes?: string | null
}

export interface AppointmentStatusUpdate {
  status: AppointmentStatus
  meeting_url?: string | null
}

export interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  slot_id: number
  consultation_mode: ConsultationMode
  status: AppointmentStatus
  meeting_url: string | null
  notes: string | null
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface ConsultationMessageCreate {
  body: string
}

export interface ConsultationMessage {
  id: number
  appointment_id: number
  sender_user_id: number
  body: string
  sent_at: string
}

// --- Admin ---

export interface UserStatusUpdate {
  is_active: boolean
}

export interface PendingApprovalItem {
  user_id: number
  email: string
  name: string | null
  role: UserRole
}

export interface PendingApprovalsResponse {
  doctors: PendingApprovalItem[]
  pharmacies: PendingApprovalItem[]
}

export interface ReportSummary {
  users_by_role: Record<string, number>
  pending_approvals_count: number
  orders_by_status: Record<string, number>
  total_revenue: string
  appointments_by_status: Record<string, number>
}

// --- Payment ---

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface PaymentCreate {
  order_id: number
  simulate_failure?: boolean
}

export interface Payment {
  id: number
  order_id: number
  amount: string
  status: PaymentStatus
  provider: string
  provider_reference: string | null
  created_at: string
  updated_at: string
}

// --- Notification ---

export type NotificationChannel = 'email' | 'sms'
export type NotificationType =
  | 'booking_confirmation'
  | 'prescription_uploaded'
  | 'payment_receipt'
  | 'order_status_update'
  | 'appointment_reminder'

export interface Notification {
  id: number
  channel: NotificationChannel
  notification_type: NotificationType
  subject: string
  message: string
  sent_at: string
}
