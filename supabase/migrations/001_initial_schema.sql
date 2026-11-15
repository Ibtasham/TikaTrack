-- TikaTrack v10.0 Database Schema
-- Secure Cloud Infrastructure with Family Sharing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'bn')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FAMILIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FAMILY MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'parent', 'caregiver', 'viewer')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(family_id, user_id)
);

-- ============================================
-- CHILD PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VACCINATION RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vaccination_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vaccine_id TEXT NOT NULL,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER NOT NULL,
  total_doses INTEGER NOT NULL,
  vaccination_date DATE NOT NULL,
  scheduled_date DATE,
  location TEXT,
  batch_number TEXT,
  notes TEXT,
  side_effects TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, vaccine_id, dose_number)
);

-- ============================================
-- REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  vaccine_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('before-due', 'on-due', 'overdue')),
  days_before INTEGER DEFAULT 7,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REMINDER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reminder_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  days_before INTEGER[] DEFAULT '{7,3,1}',
  on_due_date BOOLEAN DEFAULT TRUE,
  on_overdue BOOLEAN DEFAULT TRUE,
  overdue_interval INTEGER DEFAULT 3,
  browser_notifications BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DATA EXPORT REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_type TEXT NOT NULL CHECK (export_type IN ('full', 'child', 'vaccinations')),
  child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  file_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_family ON child_profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_child ON vaccination_records(child_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_date ON vaccination_records(vaccination_date);
CREATE INDEX IF NOT EXISTS idx_reminders_child ON reminders(child_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only view and update their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Families: Members can view their family
CREATE POLICY "Family members can view family"
  ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family owners can update family"
  ON families FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Family Members: Members can view other members in their family
CREATE POLICY "Members can view family members"
  ON family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family owners can manage members"
  ON family_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
      AND families.owner_id = auth.uid()
    )
  );

-- Child Profiles: Family members can view children
CREATE POLICY "Family members can view children"
  ON child_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = child_profiles.family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents and owners can manage children"
  ON child_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = child_profiles.family_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'parent', 'caregiver')
    )
  );

-- Vaccination Records: Family members can view records
CREATE POLICY "Family members can view vaccination records"
  ON vaccination_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      JOIN family_members ON family_members.family_id = child_profiles.family_id
      WHERE child_profiles.id = vaccination_records.child_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents and owners can manage vaccination records"
  ON vaccination_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      JOIN family_members ON family_members.family_id = child_profiles.family_id
      WHERE child_profiles.id = vaccination_records.child_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'parent', 'caregiver')
    )
  );

-- Reminders: Family members can view reminders
CREATE POLICY "Family members can view reminders"
  ON reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      JOIN family_members ON family_members.family_id = child_profiles.family_id
      WHERE child_profiles.id = reminders.child_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents and owners can manage reminders"
  ON reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      JOIN family_members ON family_members.family_id = child_profiles.family_id
      WHERE child_profiles.id = reminders.child_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'parent', 'caregiver')
    )
  );

-- Reminder Preferences: Users can only manage their own preferences
CREATE POLICY "Users can view own reminder preferences"
  ON reminder_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own reminder preferences"
  ON reminder_preferences FOR ALL
  USING (user_id = auth.uid());

-- Audit Logs: Users can view their own logs, admins can view all
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Data Export Requests: Users can only view their own requests
CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create export requests"
  ON data_export_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_profiles_updated_at BEFORE UPDATE ON child_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaccination_records_updated_at BEFORE UPDATE ON vaccination_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_preferences_updated_at BEFORE UPDATE ON reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('new', NEW, 'old', OLD)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert default reminder preferences for new users
CREATE OR REPLACE FUNCTION create_default_reminder_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO reminder_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reminder_preferences();

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- Family members with user profiles
CREATE OR REPLACE VIEW family_members_with_profiles AS
SELECT 
  fm.id,
  fm.family_id,
  fm.user_id,
  fm.role,
  fm.invited_at,
  fm.joined_at,
  up.email,
  up.full_name,
  up.avatar_url
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id;

-- Children with vaccination statistics
CREATE OR REPLACE VIEW children_with_stats AS
SELECT 
  cp.id,
  cp.family_id,
  cp.name,
  cp.date_of_birth,
  cp.gender,
  COUNT(vr.id) as total_vaccinations,
  MAX(vr.vaccination_date) as last_vaccination_date
FROM child_profiles cp
LEFT JOIN vaccination_records vr ON vr.child_id = cp.id
GROUP BY cp.id;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Delete user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS VOID AS $$
BEGIN
  -- Delete user's data exports
  DELETE FROM data_export_requests WHERE user_id = auth.uid();
  
  -- Delete user's reminder preferences
  DELETE FROM reminder_preferences WHERE user_id = auth.uid();
  
  -- If user is family owner, transfer or delete family
  UPDATE families 
  SET owner_id = (
    SELECT user_id FROM family_members 
    WHERE family_id = families.id 
    AND role = 'parent' 
    LIMIT 1
  )
  WHERE owner_id = auth.uid();
  
  -- Delete family if no other members
  DELETE FROM families 
  WHERE owner_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = families.id 
    AND user_id != auth.uid()
  );
  
  -- Remove user from all families
  DELETE FROM family_members WHERE user_id = auth.uid();
  
  -- Delete user profile (cascades to auth.users)
  DELETE FROM user_profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
