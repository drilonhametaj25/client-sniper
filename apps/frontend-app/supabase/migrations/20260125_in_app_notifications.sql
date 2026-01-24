-- =====================================================
-- MIGRATION: In-App Notifications System
-- Data: 2026-01-25
-- Funzionalità: Notifiche in-app, badge count, read status
-- =====================================================

-- =====================================================
-- 1. TABELLA IN-APP NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL, -- 'lead_score_updated', 'follow_up_reminder', 'email_opened', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Link to related entity
  entity_type VARCHAR(50), -- 'lead', 'email', 'report', 'saved_search'
  entity_id UUID,
  action_url TEXT, -- URL to navigate to

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Metadata
  metadata JSONB DEFAULT '{}',
  icon VARCHAR(50), -- Icon name to display

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON in_app_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON in_app_notifications(type);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert for any user
CREATE POLICY "Service can insert notifications" ON in_app_notifications
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_icon VARCHAR(50) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO in_app_notifications (
    user_id, type, title, message, entity_type, entity_id,
    action_url, priority, icon, metadata
  )
  VALUES (
    p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id,
    p_action_url, p_priority, p_icon, p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM in_app_notifications
    WHERE user_id = p_user_id
      AND is_read = false
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE in_app_notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE in_app_notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS FOR AUTO-NOTIFICATIONS
-- =====================================================

-- Trigger: Notify when email is opened
CREATE OR REPLACE FUNCTION notify_email_opened()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on first open (when opened_at changes from NULL)
  IF OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
    PERFORM create_notification(
      NEW.user_id,
      'email_opened',
      'Email aperta!',
      'La tua email a ' || (SELECT business_name FROM leads WHERE id = NEW.lead_id) || ' è stata aperta.',
      'email',
      NEW.id::UUID,
      '/lead/' || NEW.lead_id,
      'normal',
      'mail-open',
      jsonb_build_object('lead_id', NEW.lead_id, 'open_count', NEW.open_count)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_email_opened ON outreach_emails;
CREATE TRIGGER trigger_notify_email_opened
  AFTER UPDATE ON outreach_emails
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_opened();

-- Trigger: Notify on follow-up due (to be called by cron)
CREATE OR REPLACE FUNCTION check_follow_up_reminders()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT l.id, l.business_name, l.crm_follow_up_date, ul.user_id
    FROM leads l
    JOIN user_unlocked_leads ul ON l.id = ul.lead_id
    WHERE l.crm_follow_up_date IS NOT NULL
      AND l.crm_follow_up_date::date = CURRENT_DATE
      AND l.crm_status NOT IN ('won', 'lost')
  LOOP
    -- Check if notification already sent today
    IF NOT EXISTS (
      SELECT 1 FROM in_app_notifications
      WHERE user_id = r.user_id
        AND entity_id = r.id
        AND type = 'follow_up_reminder'
        AND created_at::date = CURRENT_DATE
    ) THEN
      PERFORM create_notification(
        r.user_id,
        'follow_up_reminder',
        'Follow-up oggi!',
        'Ricordati di contattare ' || r.business_name || ' oggi.',
        'lead',
        r.id,
        '/lead/' || r.id,
        'high',
        'calendar-clock',
        jsonb_build_object('business_name', r.business_name)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CLEANUP OLD NOTIFICATIONS (to be called by cron)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM in_app_notifications
  WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Delete expired notifications
  DELETE FROM in_app_notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

