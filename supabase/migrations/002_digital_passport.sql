-- TikaTrack v11.0 - Digital Vaccine Passport Database Schema

-- ============================================
-- DIGITAL PASSPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS digital_passports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  
  -- Passport Information
  passport_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Record Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional Info
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- ============================================
-- VACCINATION RECORDS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS vaccination_records_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id UUID NOT NULL REFERENCES digital_passports(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Vaccine Information
  vaccine_id TEXT NOT NULL,
  vaccine_name TEXT NOT NULL,
  vaccine_name_bn TEXT,
  dose_number INTEGER NOT NULL,
  total_doses INTEGER NOT NULL,
  
  -- Vaccination Details
  vaccination_date DATE NOT NULL,
  scheduled_date DATE,
  location TEXT,
  batch_number TEXT,
  
  -- Record Status
  record_status TEXT DEFAULT 'user_entered' CHECK (record_status IN (
    'user_entered',
    'pending_verification',
    'verified',
    'rejected'
  )),
  
  -- Verification
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  -- Additional Info
  notes TEXT,
  side_effects TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(passport_id, vaccine_id, dose_number)
);

-- ============================================
-- QR VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS passport_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id UUID NOT NULL REFERENCES digital_passports(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Token Information
  verification_token TEXT UNIQUE NOT NULL,
  token_type TEXT DEFAULT 'qr' CHECK (token_type IN ('qr', 'link', 'api')),
  
  -- Access Control
  is_active BOOLEAN DEFAULT TRUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES user_profiles(id),
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Access Permissions
  allowed_fields TEXT[] DEFAULT '{basic,vaccinations}',
  max_access_count INTEGER,
  current_access_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  ip_whitelist TEXT[] DEFAULT '{}'
);

-- ============================================
-- RECORD SHARING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS record_sharing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id UUID NOT NULL REFERENCES digital_passports(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Shared With
  shared_with_email TEXT,
  shared_with_user_id UUID REFERENCES user_profiles(id),
  shared_with_role TEXT CHECK (shared_with_role IN (
    'healthcare_professional',
    'parent',
    'caregiver',
    'family_member',
    'other'
  )),
  
  -- Sharing Permissions
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN (
    'view',
    'view_and_download',
    'full_access'
  )),
  
  -- Access Control
  is_active BOOLEAN DEFAULT TRUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES user_profiles(id),
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Consent
  consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  consent_method TEXT CHECK (consent_method IN ('email', 'sms', 'in_person', 'digital')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Access Log
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0
);

-- ============================================
-- VERIFICATION LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID REFERENCES passport_verifications(id) ON DELETE SET NULL,
  sharing_id UUID REFERENCES record_sharing(id) ON DELETE SET NULL,
  
  -- Access Information
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  
  -- Access Details
  fields_accessed TEXT[],
  action_type TEXT CHECK (action_type IN ('view', 'download', 'verify', 'share')),
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_digital_passports_user ON digital_passports(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_passports_child ON digital_passports(child_id);
CREATE INDEX IF NOT EXISTS idx_digital_passports_number ON digital_passports(passport_number);
CREATE INDEX IF NOT EXISTS idx_digital_passports_status ON digital_passports(status);

CREATE INDEX IF NOT EXISTS idx_vaccination_records_passport ON vaccination_records_v2(passport_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_status ON vaccination_records_v2(record_status);

CREATE INDEX IF NOT EXISTS idx_passport_verifications_token ON passport_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_passport_verifications_passport ON passport_verifications(passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_verifications_active ON passport_verifications(is_active);

CREATE INDEX IF NOT EXISTS idx_record_sharing_passport ON record_sharing(passport_id);
CREATE INDEX IF NOT EXISTS idx_record_sharing_shared_by ON record_sharing(shared_by);
CREATE INDEX IF NOT EXISTS idx_record_sharing_shared_with ON record_sharing(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_verification ON verification_logs(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_accessed ON verification_logs(accessed_at);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE digital_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Digital Passports: Users can only view their own passports
CREATE POLICY "Users can view own passports"
  ON digital_passports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own passports"
  ON digital_passports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own passports"
  ON digital_passports FOR UPDATE
  USING (user_id = auth.uid());

-- Shared passports can be viewed by authorized users
CREATE POLICY "Shared passports viewable by authorized users"
  ON digital_passports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM record_sharing
      WHERE record_sharing.passport_id = digital_passports.id
      AND record_sharing.shared_with_user_id = auth.uid()
      AND record_sharing.is_active = TRUE
      AND record_sharing.is_revoked = FALSE
      AND (record_sharing.expires_at IS NULL OR record_sharing.expires_at > NOW())
    )
  );

-- Vaccination Records: Viewable by passport owner and shared users
CREATE POLICY "Passport owners can view records"
  ON vaccination_records_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM digital_passports
      WHERE digital_passports.id = vaccination_records_v2.passport_id
      AND digital_passports.user_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can view records"
  ON vaccination_records_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM record_sharing
      JOIN digital_passports ON digital_passports.id = record_sharing.passport_id
      WHERE record_sharing.passport_id = vaccination_records_v2.passport_id
      AND record_sharing.shared_with_user_id = auth.uid()
      AND record_sharing.is_active = TRUE
      AND record_sharing.is_revoked = FALSE
    )
  );

-- QR Verifications: Public access for verification, owner can manage
CREATE POLICY "Public can verify QR tokens"
  ON passport_verifications FOR SELECT
  USING (is_active = TRUE AND is_revoked = FALSE);

CREATE POLICY "Users can manage own verifications"
  ON passport_verifications FOR ALL
  USING (created_by = auth.uid());

-- Record Sharing: Users can manage their own sharing
CREATE POLICY "Users can view own sharing"
  ON record_sharing FOR SELECT
  USING (shared_by = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can create sharing"
  ON record_sharing FOR INSERT
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can update own sharing"
  ON record_sharing FOR UPDATE
  USING (shared_by = auth.uid());

-- Verification Logs: System-managed, users can view their own
CREATE POLICY "Users can view own verification logs"
  ON verification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM passport_verifications
      WHERE passport_verifications.id = verification_logs.verification_id
      AND passport_verifications.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM record_sharing
      WHERE record_sharing.id = verification_logs.sharing_id
      AND record_sharing.shared_by = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique passport number
CREATE OR REPLACE FUNCTION generate_passport_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'TT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM digital_passports WHERE passport_number = new_number) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Generate secure verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(32), 'hex');
    SELECT EXISTS(SELECT 1 FROM passport_verifications WHERE verification_token = new_token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- Verify QR token and log access
CREATE OR REPLACE FUNCTION verify_qr_token(
  token TEXT,
  ip_addr TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  verification RECORD;
  passport RECORD;
  result JSONB;
BEGIN
  -- Get verification record
  SELECT * INTO verification FROM passport_verifications
  WHERE verification_token = token
  AND is_active = TRUE
  AND is_revoked = FALSE
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;
  
  -- Check access count limit
  IF verification.max_access_count IS NOT NULL 
     AND verification.current_access_count >= verification.max_access_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access limit reached');
  END IF;
  
  -- Get passport information
  SELECT * INTO passport FROM digital_passports
  WHERE id = verification.passport_id
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Passport not found or inactive');
  END IF;
  
  -- Update access count and last accessed
  UPDATE passport_verifications
  SET 
    current_access_count = current_access_count + 1,
    last_accessed_at = NOW()
  WHERE id = verification.id;
  
  -- Log verification
  INSERT INTO verification_logs (
    verification_id,
    ip_address,
    user_agent,
    fields_accessed,
    action_type,
    success
  ) VALUES (
    verification.id,
    ip_addr,
    user_agent,
    verification.allowed_fields,
    'verify',
    TRUE
  );
  
  -- Build result based on allowed fields
  result := jsonb_build_object(
    'success', true,
    'passport_number', passport.passport_number,
    'status', passport.status,
    'is_verified', passport.is_verified
  );
  
  -- Add basic info if allowed
  IF 'basic' = ANY(verification.allowed_fields) THEN
    result := result || jsonb_build_object(
      'full_name', passport.full_name,
      'date_of_birth', passport.date_of_birth,
      'issued_at', passport.issued_at
    );
  END IF;
  
  -- Add vaccination info if allowed
  IF 'vaccinations' = ANY(verification.allowed_fields) THEN
    result := result || jsonb_build_object(
      'vaccinations', (
        SELECT jsonb_agg(jsonb_build_object(
          'vaccine_name', vr.vaccine_name,
          'dose_number', vr.dose_number,
          'vaccination_date', vr.vaccination_date,
          'record_status', vr.record_status
        ))
        FROM vaccination_records_v2 vr
        WHERE vr.passport_id = passport.id
        AND vr.record_status IN ('verified', 'user_entered')
      )
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke verification token
CREATE OR REPLACE FUNCTION revoke_verification_token(
  token_id UUID,
  revoked_by_user UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE passport_verifications
  SET 
    is_revoked = TRUE,
    revoked_at = NOW(),
    revoked_by = revoked_by_user
  WHERE id = token_id
  AND created_by = revoked_by_user;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_digital_passports_updated_at
  BEFORE UPDATE ON digital_passports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaccination_records_v2_updated_at
  BEFORE UPDATE ON vaccination_records_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_record_sharing_updated_at
  BEFORE UPDATE ON record_sharing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TEXT IS 'Digital Vaccine Passport v11.0 schema complete. Includes:
- Digital passports with unique identifiers
- Enhanced vaccination records with verification status
- Secure QR verification tokens
- Consent-based record sharing
- Comprehensive audit logging';
