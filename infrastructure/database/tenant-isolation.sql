-- Tenant isolation, integrity, and append-only history.
-- Appended to the initial Prisma migration. The application role wasli_app
-- does not bypass row-level security. Superusers still bypass RLS;
-- triggers apply to every role.

CREATE OR REPLACE FUNCTION app_tenant_visible(row_center_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.bypass_rls', true) = 'on'
      OR row_center_id = NULLIF(current_setting('app.center_id', true), '')::uuid;
$$;

ALTER TABLE center_memberships
  ADD CONSTRAINT center_memberships_role_center_check
  CHECK (
    (role = 'PLATFORM_ADMIN' AND center_id IS NULL)
    OR (role <> 'PLATFORM_ADMIN' AND center_id IS NOT NULL)
  );

CREATE UNIQUE INDEX center_memberships_center_user_role_active_key
  ON center_memberships (center_id, user_id, role)
  WHERE deleted_at IS NULL AND center_id IS NOT NULL;

CREATE UNIQUE INDEX center_memberships_platform_admin_user_active_key
  ON center_memberships (user_id)
  WHERE role = 'PLATFORM_ADMIN' AND deleted_at IS NULL;

ALTER TABLE parent_students
  ADD CONSTRAINT parent_students_student_center_fkey
  FOREIGN KEY (student_id, center_id) REFERENCES students (id, center_id);

ALTER TABLE authorized_pickups
  ADD CONSTRAINT authorized_pickups_student_center_fkey
  FOREIGN KEY (student_id, center_id) REFERENCES students (id, center_id);

ALTER TABLE class_teachers
  ADD CONSTRAINT class_teachers_class_center_fkey
  FOREIGN KEY (class_id, center_id) REFERENCES classes (id, center_id);

ALTER TABLE class_enrollments
  ADD CONSTRAINT class_enrollments_class_center_fkey
  FOREIGN KEY (class_id, center_id) REFERENCES classes (id, center_id);

ALTER TABLE class_enrollments
  ADD CONSTRAINT class_enrollments_student_center_fkey
  FOREIGN KEY (student_id, center_id) REFERENCES students (id, center_id);

ALTER TABLE class_schedules
  ADD CONSTRAINT class_schedules_class_center_fkey
  FOREIGN KEY (class_id, center_id) REFERENCES classes (id, center_id);

ALTER TABLE class_sessions
  ADD CONSTRAINT class_sessions_class_center_fkey
  FOREIGN KEY (class_id, center_id) REFERENCES classes (id, center_id);

ALTER TABLE pickup_requests
  ADD CONSTRAINT pickup_requests_student_center_fkey
  FOREIGN KEY (student_id, center_id) REFERENCES students (id, center_id);

ALTER TABLE pickup_requests
  ADD CONSTRAINT pickup_requests_session_center_fkey
  FOREIGN KEY (class_session_id, center_id) REFERENCES class_sessions (id, center_id);

ALTER TABLE pickup_events
  ADD CONSTRAINT pickup_events_request_center_fkey
  FOREIGN KEY (pickup_request_id, center_id) REFERENCES pickup_requests (id, center_id);

ALTER TABLE pickup_verifications
  ADD CONSTRAINT pickup_verifications_request_center_fkey
  FOREIGN KEY (pickup_request_id, center_id) REFERENCES pickup_requests (id, center_id);

ALTER TABLE notification_outbox
  ADD CONSTRAINT notification_outbox_notification_center_fkey
  FOREIGN KEY (notification_id, center_id) REFERENCES notifications (id, center_id);

CREATE UNIQUE INDEX pickup_requests_one_active_per_student_session
  ON pickup_requests (student_id, class_session_id)
  WHERE status IN ('PENDING', 'SCHEDULED', 'NOTIFIED', 'PREPARING', 'READY')
    AND deleted_at IS NULL;

ALTER TABLE pickup_verifications
  ADD CONSTRAINT pickup_verifications_pin_hash_not_blank
  CHECK (length(pin_hash) > 0);

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER pickup_events_append_only
  BEFORE UPDATE OR DELETE ON pickup_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_append_only_mutation();

CREATE OR REPLACE FUNCTION enforce_same_center_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  referenced_center uuid;
BEGIN
  IF TG_TABLE_NAME = 'class_sessions' THEN
    IF NEW.schedule_id IS NOT NULL THEN
      SELECT center_id INTO referenced_center FROM class_schedules WHERE id = NEW.schedule_id;
      IF referenced_center IS DISTINCT FROM NEW.center_id THEN
        RAISE EXCEPTION 'class session schedule belongs to another center';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'notifications' THEN
    IF NEW.pickup_request_id IS NOT NULL THEN
      SELECT center_id INTO referenced_center FROM pickup_requests WHERE id = NEW.pickup_request_id;
      IF referenced_center IS DISTINCT FROM NEW.center_id THEN
        RAISE EXCEPTION 'notification pickup request belongs to another center';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'pickup_verifications' THEN
    IF NEW.authorized_pickup_id IS NOT NULL THEN
      SELECT center_id INTO referenced_center FROM authorized_pickups WHERE id = NEW.authorized_pickup_id;
      IF referenced_center IS DISTINCT FROM NEW.center_id THEN
        RAISE EXCEPTION 'authorized pickup person belongs to another center';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER class_sessions_same_center
  BEFORE INSERT OR UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_same_center_reference();

CREATE TRIGGER notifications_same_center
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_same_center_reference();

CREATE TRIGGER pickup_verifications_same_center
  BEFORE INSERT OR UPDATE ON pickup_verifications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_same_center_reference();

GRANT USAGE ON SCHEMA public TO wasli_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wasli_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wasli_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wasli_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO wasli_app;

REVOKE UPDATE, DELETE ON audit_logs FROM wasli_app;
REVOKE UPDATE, DELETE ON pickup_events FROM wasli_app;

ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers FORCE ROW LEVEL SECURITY;
CREATE POLICY centers_tenant_isolation ON centers
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR id = NULLIF(current_setting('app.center_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR id = NULLIF(current_setting('app.center_id', true), '')::uuid
  );

ALTER TABLE center_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY center_memberships_tenant_isolation ON center_memberships
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR (center_id IS NOT NULL AND app_tenant_visible(center_id))
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR (center_id IS NOT NULL AND app_tenant_visible(center_id))
  );

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR (center_id IS NOT NULL AND app_tenant_visible(center_id))
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR (center_id IS NOT NULL AND app_tenant_visible(center_id))
  );

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'center_settings',
    'students',
    'parent_students',
    'authorized_pickups',
    'classes',
    'class_teachers',
    'class_enrollments',
    'class_schedules',
    'class_sessions',
    'pickup_requests',
    'pickup_events',
    'pickup_verifications',
    'notifications',
    'notification_outbox',
    'center_subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (app_tenant_visible(center_id)) WITH CHECK (app_tenant_visible(center_id))',
      tenant_table || '_tenant_isolation',
      tenant_table
    );
  END LOOP;
END
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_select ON users
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR id::text = NULLIF(current_setting('app.user_id', true), '')
    OR EXISTS (
      SELECT 1
      FROM center_memberships AS membership
      WHERE membership.user_id = users.id
        AND membership.deleted_at IS NULL
        AND membership.center_id = NULLIF(current_setting('app.center_id', true), '')::uuid
    )
  );

CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR id::text = NULLIF(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR id::text = NULLIF(current_setting('app.user_id', true), '')
  );

CREATE POLICY users_platform_insert ON users
  FOR INSERT
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');

CREATE POLICY users_platform_delete ON users
  FOR DELETE
  USING (current_setting('app.bypass_rls', true) = 'on');

DO $$
DECLARE
  secret_table text;
BEGIN
  FOREACH secret_table IN ARRAY ARRAY[
    'refresh_tokens',
    'password_reset_tokens',
    'push_tokens'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', secret_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', secret_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (current_setting(''app.bypass_rls'', true) = ''on'' OR user_id::text = NULLIF(current_setting(''app.user_id'', true), '''')) WITH CHECK (current_setting(''app.bypass_rls'', true) = ''on'' OR user_id::text = NULLIF(current_setting(''app.user_id'', true), ''''))',
      secret_table || '_owner_isolation',
      secret_table
    );
  END LOOP;
END
$$;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_plans_read ON subscription_plans
  FOR SELECT
  USING (true);

CREATE POLICY subscription_plans_platform_write ON subscription_plans
  FOR INSERT
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');

CREATE POLICY subscription_plans_platform_update ON subscription_plans
  FOR UPDATE
  USING (current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');

CREATE POLICY subscription_plans_platform_delete ON subscription_plans
  FOR DELETE
  USING (current_setting('app.bypass_rls', true) = 'on');
