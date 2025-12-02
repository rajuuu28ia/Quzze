import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizSettings = pgTable("quiz_settings", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  title: text("title").notNull().default("Quiz"),
  prize: text("prize").default("Hadiah"),
  startTime: timestamp("start_time"),
  durationMinutes: integer("duration_minutes").notNull().default(5),
  maxParticipants: integer("max_participants").notNull().default(10),
  redirectLink: text("redirect_link").notNull().default("https://example.com"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizSettingsId: integer("quiz_settings_id").references(() => quizSettings.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  hint: text("hint"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id"),
  quizSettingsId: integer("quiz_settings_id").references(() => quizSettings.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizSettingsRelations = relations(quizSettings, ({ many }) => ({
  questions: many(questions),
  participants: many(participants),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quizSettings: one(quizSettings, {
    fields: [questions.quizSettingsId],
    references: [quizSettings.id],
  }),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  quizSettings: one(quizSettings, {
    fields: [participants.quizSettingsId],
    references: [quizSettings.id],
  }),
}));

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;
export type QuizSettings = typeof quizSettings.$inferSelect;
export type InsertQuizSettings = typeof quizSettings.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;
