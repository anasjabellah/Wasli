-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CenterStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupportedLanguage" AS ENUM ('AR', 'FR', 'EN');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('PLATFORM_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'RECEPTION', 'PARENT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('PENDING', 'SCHEDULED', 'NOTIFIED', 'PREPARING', 'READY', 'HANDED_OVER', 'CANCELLED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PickupEventType" AS ENUM ('CREATED', 'SCHEDULED', 'NOTIFIED', 'PREPARING', 'DELAYED', 'READY', 'HANDOVER_ATTEMPTED', 'HANDED_OVER', 'CANCELLED', 'REJECTED', 'EXPIRED', 'PRIORITY_UPDATED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address_line" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "languages" "SupportedLanguage"[] DEFAULT ARRAY['FR', 'AR']::"SupportedLanguage"[],
    "status" "CenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_settings" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "pickup_lead_minutes" INTEGER NOT NULL DEFAULT 15,
    "request_expiry_minutes" INTEGER NOT NULL DEFAULT 120,
    "max_pin_attempts" INTEGER NOT NULL DEFAULT 5,
    "pin_length" INTEGER NOT NULL DEFAULT 6,
    "priority_weights" JSONB NOT NULL DEFAULT '{"sessionCompletion":100,"waitingMinutes":1,"delayed":50,"teacherAvailable":10}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_memberships" (
    "id" UUID NOT NULL,
    "center_id" UUID,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "center_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_students" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "parent_user_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "can_request_pickup" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorized_pickups" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" "GuardianRelationship" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "authorized_pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "room" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_teachers" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "teacher_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "schedule_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "scheduled_end_at" TIMESTAMP(3) NOT NULL,
    "actual_end_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_requests" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_session_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "status" "PickupStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligible_at" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "preparing_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "handed_over_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "delay_reason" TEXT,
    "delayed_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_events" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "pickup_request_id" UUID NOT NULL,
    "type" "PickupEventType" NOT NULL,
    "from_status" "PickupStatus",
    "to_status" "PickupStatus",
    "actor_user_id" UUID,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_verifications" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "pickup_request_id" UUID NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "authorized_pickup_id" UUID,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "verified_by_user_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pickup_request_id" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "center_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_subscriptions" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "centers_slug_key" ON "centers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "center_settings_center_id_key" ON "center_settings"("center_id");

-- CreateIndex
CREATE INDEX "center_memberships_center_id_user_id_idx" ON "center_memberships"("center_id", "user_id");

-- CreateIndex
CREATE INDEX "center_memberships_user_id_idx" ON "center_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "students_center_id_status_idx" ON "students"("center_id", "status");

-- CreateIndex
CREATE INDEX "students_center_id_last_name_first_name_idx" ON "students"("center_id", "last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "students_id_center_id_key" ON "students"("id", "center_id");

-- CreateIndex
CREATE INDEX "parent_students_parent_user_id_student_id_idx" ON "parent_students"("parent_user_id", "student_id");

-- CreateIndex
CREATE INDEX "parent_students_student_id_idx" ON "parent_students"("student_id");

-- CreateIndex
CREATE INDEX "parent_students_center_id_idx" ON "parent_students"("center_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parent_user_id_student_id_key" ON "parent_students"("parent_user_id", "student_id");

-- CreateIndex
CREATE INDEX "authorized_pickups_center_id_student_id_idx" ON "authorized_pickups"("center_id", "student_id");

-- CreateIndex
CREATE INDEX "classes_center_id_status_idx" ON "classes"("center_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "classes_id_center_id_key" ON "classes"("id", "center_id");

-- CreateIndex
CREATE INDEX "class_teachers_center_id_teacher_user_id_idx" ON "class_teachers"("center_id", "teacher_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_teachers_class_id_teacher_user_id_key" ON "class_teachers"("class_id", "teacher_user_id");

-- CreateIndex
CREATE INDEX "class_enrollments_center_id_student_id_idx" ON "class_enrollments"("center_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_class_id_student_id_key" ON "class_enrollments"("class_id", "student_id");

-- CreateIndex
CREATE INDEX "class_schedules_center_id_class_id_weekday_idx" ON "class_schedules"("center_id", "class_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "class_schedules_id_center_id_key" ON "class_schedules"("id", "center_id");

-- CreateIndex
CREATE INDEX "class_sessions_center_id_starts_at_idx" ON "class_sessions"("center_id", "starts_at");

-- CreateIndex
CREATE INDEX "class_sessions_center_id_scheduled_end_at_idx" ON "class_sessions"("center_id", "scheduled_end_at");

-- CreateIndex
CREATE INDEX "class_sessions_class_id_starts_at_idx" ON "class_sessions"("class_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_id_center_id_key" ON "class_sessions"("id", "center_id");

-- CreateIndex
CREATE INDEX "pickup_requests_center_id_status_idx" ON "pickup_requests"("center_id", "status");

-- CreateIndex
CREATE INDEX "pickup_requests_student_id_class_session_id_idx" ON "pickup_requests"("student_id", "class_session_id");

-- CreateIndex
CREATE INDEX "pickup_requests_center_id_requested_at_idx" ON "pickup_requests"("center_id", "requested_at");

-- CreateIndex
CREATE INDEX "pickup_requests_center_id_status_priority_score_idx" ON "pickup_requests"("center_id", "status", "priority_score");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_requests_id_center_id_key" ON "pickup_requests"("id", "center_id");

-- CreateIndex
CREATE INDEX "pickup_events_pickup_request_id_created_at_idx" ON "pickup_events"("pickup_request_id", "created_at");

-- CreateIndex
CREATE INDEX "pickup_events_center_id_created_at_idx" ON "pickup_events"("center_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_verifications_pickup_request_id_key" ON "pickup_verifications"("pickup_request_id");

-- CreateIndex
CREATE INDEX "pickup_verifications_center_id_idx" ON "pickup_verifications"("center_id");

-- CreateIndex
CREATE INDEX "notifications_center_id_status_idx" ON "notifications"("center_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_id_center_id_key" ON "notifications"("id", "center_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_outbox_notification_id_key" ON "notification_outbox"("notification_id");

-- CreateIndex
CREATE INDEX "notification_outbox_status_next_attempt_at_idx" ON "notification_outbox"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "notification_outbox_center_id_idx" ON "notification_outbox"("center_id");

-- CreateIndex
CREATE INDEX "audit_logs_center_id_created_at_idx" ON "audit_logs"("center_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "center_subscriptions_center_id_key" ON "center_subscriptions"("center_id");

-- AddForeignKey
ALTER TABLE "center_settings" ADD CONSTRAINT "center_settings_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_memberships" ADD CONSTRAINT "center_memberships_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_memberships" ADD CONSTRAINT "center_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickups" ADD CONSTRAINT "authorized_pickups_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickups" ADD CONSTRAINT "authorized_pickups_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "class_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_events" ADD CONSTRAINT "pickup_events_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_events" ADD CONSTRAINT "pickup_events_pickup_request_id_fkey" FOREIGN KEY ("pickup_request_id") REFERENCES "pickup_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_events" ADD CONSTRAINT "pickup_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_verifications" ADD CONSTRAINT "pickup_verifications_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_verifications" ADD CONSTRAINT "pickup_verifications_pickup_request_id_fkey" FOREIGN KEY ("pickup_request_id") REFERENCES "pickup_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_verifications" ADD CONSTRAINT "pickup_verifications_authorized_pickup_id_fkey" FOREIGN KEY ("authorized_pickup_id") REFERENCES "authorized_pickups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_verifications" ADD CONSTRAINT "pickup_verifications_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pickup_request_id_fkey" FOREIGN KEY ("pickup_request_id") REFERENCES "pickup_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
