import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { Profile } from '../types/index.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const childProfiles = pgTable('child_profiles', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  relationship: text('relationship'),
  gender: text('gender'),
  profileData: jsonb('profile_data').$type<Profile>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vaccinations = pgTable('vaccinations', {
  id: text('id').primaryKey(),
  profileId: text('profile_id')
    .references(() => childProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  vaccineId: text('vaccine_id').notNull(),
  doseNumber: integer('dose_number'),
  administeredDate: text('administered_date').notNull(),
  centre: text('centre'),
  status: text('status').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const growthMeasurements = pgTable('growth_measurements', {
  id: text('id').primaryKey(),
  profileId: text('profile_id')
    .references(() => childProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  measuredDate: text('measured_date').notNull(),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studioSessions = pgTable('studio_sessions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  mode: text('mode').notNull(),
  prompt: text('prompt').notNull(),
  responseText: text('response_text'),
  modelUsed: text('model_used').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userUid: text('user_uid'),
  language: text('language').notNull().default('en'),
  timezoneOffsetMinutes: integer('timezone_offset_minutes').notNull().default(-360),
  quietHoursStart: text('quiet_hours_start').notNull().default('22:00'),
  quietHoursEnd: text('quiet_hours_end').notNull().default('07:00'),
  leadHours: integer('lead_hours').notNull().default(48),
  enabled: integer('enabled').notNull().default(1),
  dosesJson: jsonb('doses_json').$type<unknown[]>().notNull(),
  sentKeysJson: jsonb('sent_keys_json').$type<string[]>().notNull(),
  lastNotifiedAt: text('last_notified_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  childProfiles: many(childProfiles),
  studioSessions: many(studioSessions),
}));

export const childProfilesRelations = relations(childProfiles, ({ one, many }) => ({
  owner: one(users, {
    fields: [childProfiles.userUid],
    references: [users.uid],
  }),
  vaccinations: many(vaccinations),
  growthMeasurements: many(growthMeasurements),
}));

export const vaccinationsRelations = relations(vaccinations, ({ one }) => ({
  profile: one(childProfiles, {
    fields: [vaccinations.profileId],
    references: [childProfiles.id],
  }),
}));

export const growthMeasurementsRelations = relations(growthMeasurements, ({ one }) => ({
  profile: one(childProfiles, {
    fields: [growthMeasurements.profileId],
    references: [childProfiles.id],
  }),
}));

export const studioSessionsRelations = relations(studioSessions, ({ one }) => ({
  owner: one(users, {
    fields: [studioSessions.userUid],
    references: [users.uid],
  }),
}));
