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
  price_per_hour?: number | null; // Nullable - at least one price required
  price_per_day?: number | null; // Nullable - at least one price required
  availability_start?: string; // Time of day (HH:mm)
  availability_end?: string; // Time of day (HH:mm)
  available_days?: number[]; // 0-6 (Sunday-Saturday)
  repeating_weekly?: boolean; // Whether availability repeats weekly
  day_availability_schedule?: {
    // Per-day availability schedule (JSONB)
    // For repeating: key is day of week (0-6)
    // For non-repeating: key is date string (YYYY-MM-DD)
    [key: string]: { startTime: string; endTime: string };
  };
  max_vehicles?: number; // Maximum number of vehicles that can be parked
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
  vehicle_count: number; // Number of vehicles in this booking
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
  space?: ParkingSpace;
}

export type UserRole = "driver" | "host" | "both";
