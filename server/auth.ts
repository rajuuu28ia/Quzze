import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-secret-key-2024-do-not-use-in-production';

export const createToken = (adminId: number): string => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string): { adminId: number } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const getTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};
