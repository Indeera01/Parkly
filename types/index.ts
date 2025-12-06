export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  created_at: string;
}

export interface ParkingSpace {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  price_per_hour: number;
  price_per_day: number;
  availability_start?: string; // Time of day (HH:mm)
  availability_end?: string; // Time of day (HH:mm)
  available_days?: number[]; // 0-6 (Sunday-Saturday)
  is_active: boolean;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  space_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
  space?: ParkingSpace;
}

export type UserRole = "driver" | "host" | "both";
