import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { db } from "./_lib/db";
import { admins, quizSettings, questions, participants } from "./_lib/schema";
import { eq, asc, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

declare module "express-session" {
  interface SessionData {
    adminId?: number;
  }
}

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "quiz-admin-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

const rateLimitLogin = (req: Request, res: Response, next: Function) => {
  const ip = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (attempts) {
    if (now - attempts.lastAttempt > LOCKOUT_TIME) {
      loginAttempts.delete(ip);
    } else if (attempts.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000);
      return res.status(429).json({ 
        message: `Terlalu banyak percobaan login. Coba lagi dalam ${remainingTime} menit.` 
      });
    }
  }
  next();
};

const recordLoginAttempt = (ip: string, success: boolean) => {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const attempts = loginAttempts.get(ip);
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = Date.now();
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
};

const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.session.adminId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.post("/api/admin/login", rateLimitLogin, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    
    if (!username || !password) {
      recordLoginAttempt(ip, false);
      return res.status(401).json({ message: "Username dan password harus diisi" });
    }
    
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    
    if (!admin) {
      recordLoginAttempt(ip, false);
      return res.status(401).json({ message: "Username atau password salah" });
    }
    
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      recordLoginAttempt(ip, false);
      return res.status(401).json({ message: "Username atau password salah" });
    }
    
    recordLoginAttempt(ip, true);
    req.session.adminId = admin.id;
    res.json({ message: "Login berhasil", admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Gagal logout" });
    }
    res.json({ message: "Logout berhasil" });
  });
});

app.get("/api/admin/check", (req, res) => {
  if (req.session.adminId) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.post("/api/admin/setup", async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    
    if (!username || username.length < 3) {
      return res.status(400).json({ message: "Username minimal 3 karakter" });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }
    
    const existingAdmins = await db.select().from(admins);
    if (existingAdmins.length > 0) {
      return res.status(400).json({ message: "Admin sudah ada" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const [newAdmin] = await db.insert(admins).values({
      username,
      password: hashedPassword,
    }).returning();
    
    res.json({ message: "Admin berhasil dibuat", admin: { id: newAdmin.id, username: newAdmin.username } });
  } catch (error) {
    console.error("Setup error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.get("/api/admin/exists", async (req, res) => {
  try {
    const existingAdmins = await db.select().from(admins);
    res.json({ exists: existingAdmins.length > 0 });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.get("/api/quiz/settings", isAuthenticated, async (req, res) => {
  try {
    const [settings] = await db.select().from(quizSettings).orderBy(desc(quizSettings.id)).limit(1);
    const questionsList = settings 
      ? await db.select().from(questions).where(eq(questions.quizSettingsId, settings.id)).orderBy(asc(questions.orderIndex))
      : [];
    res.json({ settings, questions: questionsList });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.post("/api/quiz/settings", isAuthenticated, async (req, res) => {
  try {
    const { title, startTime, durationMinutes, maxParticipants, redirectLink, isActive, questionsList } = req.body;
    
    await db.delete(quizSettings);
    
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(quizSettings).where(eq(quizSettings.roomCode, roomCode));
      if (existing.length === 0) break;
      roomCode = generateRoomCode();
      attempts++;
    }
    
    const [newSettings] = await db.insert(quizSettings).values({
      roomCode,
      title: title || "Quiz",
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
          quizSettingsId: newSettings.id,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          hint: q.hint || null,
          orderIndex: i,
        });
      }
    }
    
    const savedQuestions = await db.select().from(questions).where(eq(questions.quizSettingsId, newSettings.id)).orderBy(asc(questions.orderIndex));
    
    res.json({ settings: newSettings, questions: savedQuestions });
  } catch (error) {
    console.error("Save settings error:", error);
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
    
    const participantCount = await db.select().from(participants).where(eq(participants.quizSettingsId, settings.id));
    
    if (participantCount.length >= settings.maxParticipants) {
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
        title: settings.title,
        startTime: settings.startTime,
        durationMinutes: settings.durationMinutes,
        maxParticipants: settings.maxParticipants,
        currentParticipants: participantCount.length,
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
    const { sessionId } = req.body;
    
    const [settings] = await db.select().from(quizSettings).where(eq(quizSettings.isActive, true)).limit(1);
    
    if (!settings) {
      return res.status(400).json({ message: "Tidak ada quiz aktif" });
    }
    
    const [existingParticipant] = await db.select().from(participants)
      .where(eq(participants.sessionId, sessionId));
    
    if (existingParticipant) {
      return res.json({ success: true, message: "Sudah terdaftar" });
    }
    
    const participantCount = await db.select().from(participants).where(eq(participants.quizSettingsId, settings.id));
    
    if (participantCount.length >= settings.maxParticipants) {
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
    
    await db.update(participants)
      .set({ completedAt: new Date() })
      .where(eq(participants.sessionId, sessionId));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Complete quiz error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

app.get("/api/quiz/participants", isAuthenticated, async (req, res) => {
  try {
    const [settings] = await db.select().from(quizSettings).orderBy(desc(quizSettings.id)).limit(1);
    
    if (!settings) {
      return res.json({ participants: [] });
    }
    
    const participantsList = await db.select().from(participants)
      .where(eq(participants.quizSettingsId, settings.id))
      .orderBy(desc(participants.createdAt));
    
    res.json({ participants: participantsList });
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

export default app;
