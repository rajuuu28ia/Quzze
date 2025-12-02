import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { quizSettings, questions, participants } from "../api/_lib/schema";
import { eq, asc, desc, and } from "drizzle-orm";

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const validateSecretKey = (req: Request, res: Response, next: Function) => {
  const secretKey = req.query.secretKey as string;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  
  if (!secretKey || secretKey !== adminSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.get("/api/quizzes", validateSecretKey, async (req, res) => {
    try {
      const allQuizzes = await db.select().from(quizSettings).orderBy(desc(quizSettings.createdAt));
      
      const quizzesWithStats = await Promise.all(allQuizzes.map(async (quiz) => {
        const allParticipants = await db.select().from(participants).where(eq(participants.quizSettingsId, quiz.id));
        const completedCount = allParticipants.filter(p => p.completedAt !== null).length;
        
        return {
          ...quiz,
          totalParticipants: allParticipants.length,
          completedParticipants: completedCount,
          slotsRemaining: quiz.maxParticipants - completedCount,
        };
      }));
      
      res.json({ quizzes: quizzesWithStats });
    } catch (error) {
      console.error("Get quizzes error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.post("/api/quizzes", validateSecretKey, async (req, res) => {
    try {
      const { title, prize, startTime, durationMinutes, maxParticipants, redirectLink, isActive, questionsList } = req.body;
      
      let roomCode = generateRoomCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.select().from(quizSettings).where(eq(quizSettings.roomCode, roomCode));
        if (existing.length === 0) break;
        roomCode = generateRoomCode();
        attempts++;
      }
      
      const [newQuiz] = await db.insert(quizSettings).values({
        roomCode,
        title: title || "Quiz",
        prize: prize || "Hadiah",
        startTime: startTime ? new Date(startTime) : null,
        durationMinutes: durationMinutes || 5,
        maxParticipants: maxParticipants || 10,
        redirectLink: redirectLink || "https://example.com",
        isActive: isActive || false,
      }).returning();
      
      if (questionsList && questionsList.length > 0) {
        for (let i = 0; i < questionsList.length; i++) {
          const q = questionsList[i];
          await db.insert(questions).values({
            quizSettingsId: newQuiz.id,
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hint: q.hint || null,
            orderIndex: i,
          });
        }
      }
      
      res.json({ quiz: newQuiz });
    } catch (error) {
      console.error("Create quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.get("/api/quizzes/:id", validateSecretKey, async (req, res) => {
    try {
      const [quiz] = await db.select().from(quizSettings).where(eq(quizSettings.id, parseInt(req.params.id)));
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz tidak ditemukan" });
      }
      
      const questionsList = await db.select().from(questions).where(eq(questions.quizSettingsId, quiz.id)).orderBy(asc(questions.orderIndex));
      const participantsList = await db.select().from(participants).where(eq(participants.quizSettingsId, quiz.id));
      
      res.json({ 
        quiz, 
        questions: questionsList,
        participants: participantsList,
        completedCount: participantsList.filter(p => p.completedAt !== null).length,
      });
    } catch (error) {
      console.error("Get quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.put("/api/quizzes/:id", validateSecretKey, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const { title, prize, startTime, durationMinutes, maxParticipants, redirectLink, isActive, questionsList } = req.body;
      
      const [existingQuiz] = await db.select().from(quizSettings).where(eq(quizSettings.id, quizId));
      if (!existingQuiz) {
        return res.status(404).json({ message: "Quiz tidak ditemukan" });
      }
      
      await db.update(quizSettings)
        .set({
          title: title || existingQuiz.title,
          prize: prize || existingQuiz.prize,
          startTime: startTime ? new Date(startTime) : existingQuiz.startTime,
          durationMinutes: durationMinutes || existingQuiz.durationMinutes,
          maxParticipants: maxParticipants || existingQuiz.maxParticipants,
          redirectLink: redirectLink || existingQuiz.redirectLink,
          isActive: isActive !== undefined ? isActive : existingQuiz.isActive,
          updatedAt: new Date(),
        })
        .where(eq(quizSettings.id, quizId));
      
      if (questionsList && questionsList.length > 0) {
        await db.delete(questions).where(eq(questions.quizSettingsId, quizId));
        
        for (let i = 0; i < questionsList.length; i++) {
          const q = questionsList[i];
          await db.insert(questions).values({
            quizSettingsId: quizId,
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hint: q.hint || null,
            orderIndex: i,
          });
        }
      }
      
      const [updatedQuiz] = await db.select().from(quizSettings).where(eq(quizSettings.id, quizId));
      res.json({ quiz: updatedQuiz });
    } catch (error) {
      console.error("Update quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.delete("/api/quizzes/:id", validateSecretKey, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      
      await db.delete(quizSettings).where(eq(quizSettings.id, quizId));
      
      res.json({ message: "Quiz berhasil dihapus" });
    } catch (error) {
      console.error("Delete quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.get("/api/room/:roomCode", async (req, res) => {
    try {
      const { roomCode } = req.params;
      
      const [settings] = await db.select().from(quizSettings)
        .where(and(eq(quizSettings.roomCode, roomCode), eq(quizSettings.isActive, true)));
      
      if (!settings) {
        return res.json({ available: false, message: "Room tidak ditemukan" });
      }
      
      const allParticipants = await db.select().from(participants).where(eq(participants.quizSettingsId, settings.id));
      const completedParticipants = allParticipants.filter(p => p.completedAt !== null);
      
      if (completedParticipants.length >= settings.maxParticipants) {
        return res.json({ 
          available: false, 
          tooLate: true,
          message: "Slot pemenang sudah penuh" 
        });
      }
      
      const questionsList = await db.select().from(questions)
        .where(eq(questions.quizSettingsId, settings.id))
        .orderBy(asc(questions.orderIndex));
      
      const publicQuestions = questionsList.map(q => ({
        id: q.id,
        question: q.questionText,
        correctAnswer: q.correctAnswer,
        clue: q.hint,
        directLink: settings.redirectLink,
      }));
      
      res.json({ 
        available: true,
        settings: {
          id: settings.id,
          roomCode: settings.roomCode,
          title: settings.title,
          prize: settings.prize,
          startTime: settings.startTime,
          durationMinutes: settings.durationMinutes,
          maxParticipants: settings.maxParticipants,
          completedParticipants: completedParticipants.length,
          redirectLink: settings.redirectLink,
        },
        questions: publicQuestions 
      });
    } catch (error) {
      console.error("Get room error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.get("/api/quiz/public", async (req, res) => {
    try {
      const [settings] = await db.select().from(quizSettings).where(eq(quizSettings.isActive, true)).limit(1);
      
      if (!settings) {
        return res.json({ 
          available: false, 
          message: "Tidak ada quiz yang aktif saat ini" 
        });
      }
      
      const allParticipants = await db.select().from(participants).where(eq(participants.quizSettingsId, settings.id));
      const completedParticipants = allParticipants.filter(p => p.completedAt !== null);
      
      if (completedParticipants.length >= settings.maxParticipants) {
        return res.json({ 
          available: false, 
          tooLate: true,
          message: "Yah, kamu terlambat! Quiz sudah penuh." 
        });
      }
      
      const questionsList = await db.select().from(questions)
        .where(eq(questions.quizSettingsId, settings.id))
        .orderBy(asc(questions.orderIndex));
      
      const publicQuestions = questionsList.map(q => ({
        id: q.id,
        question: q.questionText,
        correctAnswer: q.correctAnswer,
        clue: q.hint,
        directLink: settings.redirectLink,
      }));
      
      res.json({ 
        available: true,
        settings: {
          id: settings.id,
          roomCode: settings.roomCode,
          title: settings.title,
          startTime: settings.startTime,
          durationMinutes: settings.durationMinutes,
          maxParticipants: settings.maxParticipants,
          currentParticipants: allParticipants.length,
          redirectLink: settings.redirectLink,
        },
        questions: publicQuestions 
      });
    } catch (error) {
      console.error("Get public quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.post("/api/quiz/join", async (req, res) => {
    try {
      const { sessionId, roomCode } = req.body;
      
      let settings;
      if (roomCode) {
        [settings] = await db.select().from(quizSettings)
          .where(and(eq(quizSettings.roomCode, roomCode), eq(quizSettings.isActive, true)));
      } else {
        [settings] = await db.select().from(quizSettings).where(eq(quizSettings.isActive, true)).limit(1);
      }
      
      if (!settings) {
        return res.status(400).json({ message: "Tidak ada quiz aktif" });
      }
      
      const [existingParticipant] = await db.select().from(participants)
        .where(and(eq(participants.sessionId, sessionId), eq(participants.quizSettingsId, settings.id)));
      
      if (existingParticipant) {
        return res.json({ success: true, message: "Sudah terdaftar" });
      }
      
      const allParticipants = await db.select().from(participants).where(eq(participants.quizSettingsId, settings.id));
      const completedParticipants = allParticipants.filter(p => p.completedAt !== null);
      
      if (completedParticipants.length >= settings.maxParticipants) {
        return res.status(400).json({ 
          tooLate: true,
          message: "Yah, kamu terlambat! Quiz sudah penuh." 
        });
      }
      
      await db.insert(participants).values({
        sessionId,
        quizSettingsId: settings.id,
      });
      
      res.json({ success: true, message: "Berhasil bergabung" });
    } catch (error) {
      console.error("Join quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.post("/api/quiz/complete", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      const [participant] = await db.select().from(participants)
        .where(eq(participants.sessionId, sessionId));
      
      if (!participant) {
        return res.status(400).json({ message: "Peserta tidak ditemukan" });
      }
      
      if (participant.completedAt) {
        return res.json({ success: true, message: "Sudah selesai" });
      }
      
      const [settings] = await db.select().from(quizSettings)
        .where(eq(quizSettings.id, participant.quizSettingsId));
      
      if (!settings) {
        return res.status(400).json({ message: "Quiz tidak ditemukan" });
      }
      
      const allParticipants = await db.select().from(participants)
        .where(eq(participants.quizSettingsId, settings.id));
      const completedParticipants = allParticipants.filter(p => p.completedAt !== null);
      
      if (completedParticipants.length >= settings.maxParticipants) {
        return res.status(400).json({ 
          tooLate: true,
          message: "Yah, kamu terlambat! Quiz sudah penuh." 
        });
      }
      
      await db.update(participants)
        .set({ completedAt: new Date() })
        .where(eq(participants.sessionId, sessionId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Complete quiz error:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
