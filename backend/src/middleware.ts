import { Request, Response, NextFunction } from "express";
import { queries } from "./db";

export type Session = {
  id: string;
  privy_user_id: string;
  privy_token: string;
};

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.header("x-session-id");
  if (!sessionId) {
    return res.status(401).json({ error: "Missing session" });
  }
  const session = queries.getSession.get(sessionId) as Session | undefined;
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }
  req.session = session;
  next();
};
