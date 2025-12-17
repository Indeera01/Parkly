-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Parking Spaces table
CREATE TABLE IF NOT EXISTS public.parking_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    price_per_day DECIMAL(10, 2) NOT NULL,
    availability_start TIME,
    availability_end TIME,
    available_days INTEGER[], -- Array of day numbers (0-6, Sunday-Saturday)
    repeating_weekly BOOLEAN DEFAULT true, -- Whether availability repeats weekly
    day_availability_schedule JSONB, -- Schedule: for repeating uses day numbers (0-6) as keys, for non-repeating uses date strings (YYYY-MM-DD) as keys
    is_active BOOLEAN DEFAULT true,
    images TEXT[], -- Array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES public.parking_spaces(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'host_cancelled', 'space_deleted')),
    cancellation_reason TEXT, -- Reason for cancellation (e.g., "Space deactivated", "Space deleted")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Parking Spaces policies
CREATE POLICY "Anyone can view active parking spaces"
    ON public.parking_spaces FOR SELECT
    USING (is_active = true OR host_id = auth.uid());

CREATE POLICY "Hosts can insert their own parking spaces"
    ON public.parking_spaces FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own parking spaces"
    ON public.parking_spaces FOR UPDATE
    USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own parking spaces"
    ON public.parking_spaces FOR DELETE
    USING (auth.uid() = host_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT host_id FROM public.parking_spaces WHERE id = space_id
    ));

CREATE POLICY "Users can create their own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings"
    ON public.bookings FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parking_spaces_host_id ON public.parking_spaces(host_id);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_location ON public.parking_spaces(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_active ON public.parking_spaces(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_spaces_updated_at BEFORE UPDATE ON public.parking_spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cancel future bookings when a space is deactivated
CREATE OR REPLACE FUNCTION cancel_bookings_on_space_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- If space is being deactivated (is_active changed from true to false)
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- Cancel all future confirmed/pending bookings for this space
        UPDATE public.bookings
        SET 
            status = 'host_cancelled',
            cancellation_reason = 'Parking space was deactivated by the host',
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE space_id = NEW.id
            AND status IN ('pending', 'confirmed')
            AND start_time > TIMEZONE('utc'::text, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cancel bookings when space is deactivated
CREATE TRIGGER on_space_deactivation
    AFTER UPDATE OF is_active ON public.parking_spaces
    FOR EACH ROW
    WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
    EXECUTE FUNCTION cancel_bookings_on_space_deactivation();

-- Function to mark bookings as cancelled before space deletion
CREATE OR REPLACE FUNCTION cancel_bookings_before_space_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark all future bookings as cancelled before space is deleted
    UPDATE public.bookings
    SET 
        status = 'space_deleted',
        cancellation_reason = 'Parking space was deleted by the host',
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE space_id = OLD.id
        AND status IN ('pending', 'confirmed')
        AND start_time > TIMEZONE('utc'::text, NOW());
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cancel bookings before space deletion
CREATE TRIGGER before_space_deletion
    BEFORE DELETE ON public.parking_spaces
    FOR EACH ROW
    EXECUTE FUNCTION cancel_bookings_before_space_deletion();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

