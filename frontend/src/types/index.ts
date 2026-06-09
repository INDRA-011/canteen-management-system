export type Role = 'ADMIN' | 'STUDENT'

export interface User {
  id: number
  name: string
  email: string
  college_id: string
  role: Role
  must_change_password: boolean
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface Category {
  id: number
  name: string
  description?: string
}

export interface MenuItem {
  id: number
  category_id: number
  name: string
  price: number
  stock_qty: number
  is_available: boolean
  item_type: string
  category?: Category
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'CANCELLED'

export interface OrderItem {
  id: number
  menu_item_id: number
  quantity: number
  unit_price: number
  menuItem?: MenuItem
}

export interface Order {
  id: number
  user_id: number
  pickup_time: string
  order_type: 'INDIVIDUAL' | 'GROUP'
  status: OrderStatus
  token_number: number
  total_amount: number
  placed_at: string
  items?: OrderItem[]
  user?: User
}

export interface CanteenSettings {
  id: number
  open_time: string
  close_time: string
  slot_interval_minutes: number
  blocked_slots?: string
  is_open: boolean
  updated_at: string
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export interface SlotsResponse {
  slots: string[]
  open_time: string
  close_time: string
  slot_interval_minutes: number
}
