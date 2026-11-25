import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, signToken, type AuthRequest } from '../middleware/auth.ts';
import { repo, sanitizeUser } from '../services/repository.ts';

const router = Router();

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function getFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as { projectId?: string };
  if (!parsed.projectId) {
    throw new Error('Firebase projectId is missing in firebase-applet-config.json');
  }
  return parsed.projectId;
}

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Google public certificates.');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
  const certs = (await response.json()) as Record<string, string>;
  cachedCerts = {
    certs,
    expiresAt: Date.now() + Math.max(60_000, ttlMs),
  };
  return certs;
}

interface VerifiedFirebasePayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebasePayload> {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
    throw new Error('Malformed Firebase ID token.');
  }
  const projectId = getFirebaseProjectId();
  let certs = await fetchGooglePublicCerts();
  let certPem = certs[decoded.header.kid];
  if (!certPem) {
    // Force refresh once in case Google rotated keys
    cachedCerts = null;
    certs = await fetchGooglePublicCerts();
    certPem = certs[decoded.header.kid];
  }
  if (!certPem) {
    throw new Error('Unknown Firebase signing key.');
  }

  const verified = jwt.verify(idToken, certPem, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as VerifiedFirebasePayload;

  if (!verified.sub || !verified.email) {
    throw new Error('Google account did not supply a verified email.');
  }
  if (verified.email_verified === false) {
    throw new Error('Please verify your Google email address before signing in.');
  }
  return verified;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, preferredLanguage, bio, expertise } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      preferredLanguage?: 'english' | 'french' | 'both';
      bio?: string;
      expertise?: string;
    };

    if (!name || name.trim().length < 2) {
      res.status(400).json({ message: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: 'Please provide a valid email address.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long.' });
      return;
    }

    const assignedRole = role === 'teacher' ? 'teacher' : 'student';
    const existing = await repo.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await repo.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: assignedRole,
      teacherApproved: assignedRole === 'student',
      preferredLanguage: preferredLanguage || 'both',
      bio: bio?.trim() || '',
      expertise: expertise?.trim() || (assignedRole === 'teacher' ? 'English & French Instruction' : 'Language Learner'),
      avatarUrl: '',
    });

    if (assignedRole === 'teacher') {
      const users = await repo.listUsers();
      const admins = users.filter((u) => u.role === 'admin');
      for (const admin of admins) {
        await repo.createNotification({
          userId: admin._id,
          title: 'New Teacher Registration',
          message: `${user.name} registered as a teacher and awaits approval.`,
          type: 'warning',
        });
      }
    } else {
      await repo.createNotification({
        userId: user._id,
        title: 'Welcome to LinguaLearn',
        message: 'Explore our beginner, intermediate, and advanced English & French tracks.',
        type: 'success',
      });
    }

    const token = signToken({ userId: user._id, role: user.role, email: user.email });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', detail: (err as Error).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await repo.findUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signToken({ userId: user._id, role: user.role, email: user.email });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', detail: (err as Error).message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken, role, preferredLanguage } = req.body as {
      idToken?: string;
      role?: string;
      preferredLanguage?: 'english' | 'french' | 'both';
    };

    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ message: 'Firebase ID token is required.' });
      return;
    }

    let claims: VerifiedFirebasePayload;
    try {
      claims = await verifyFirebaseIdToken(idToken);
    } catch (verifyErr) {
      res.status(401).json({
        message: 'Google authentication could not be verified.',
        detail: (verifyErr as Error).message,
      });
      return;
    }

    const email = claims.email!.trim().toLowerCase();
    const existing = await repo.findUserByEmail(email);

    if (existing) {
      let currentUser = existing;
      if (!existing.avatarUrl && claims.picture) {
        const updated = await repo.updateUser(existing._id, { avatarUrl: claims.picture });
        if (updated) currentUser = updated;
      }
      const token = signToken({
        userId: currentUser._id,
        role: currentUser.role,
        email: currentUser.email,
      });
      res.json({ token, user: sanitizeUser(currentUser), isNewUser: false });
      return;
    }

    const assignedRole = role === 'teacher' ? 'teacher' : 'student';
    const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'LinguaLearn Learner';
    const displayName = (claims.name || fallbackName).trim().slice(0, 80);
    const langChoice: 'english' | 'french' | 'both' =
      preferredLanguage === 'english' || preferredLanguage === 'french' ? preferredLanguage : 'both';

    const randomSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomSecret, 10);

    const newUser = await repo.createUser({
      name: displayName,
      email,
      passwordHash,
      role: assignedRole,
      teacherApproved: assignedRole === 'student',
      preferredLanguage: langChoice,
      bio: '',
      expertise: assignedRole === 'teacher' ? 'English & French Instruction' : 'Language Learner',
      avatarUrl: claims.picture || '',
    });

    if (assignedRole === 'teacher') {
      const users = await repo.listUsers();
      const admins = users.filter((u) => u.role === 'admin');
      for (const admin of admins) {
        await repo.createNotification({
          userId: admin._id,
          title: 'New Teacher Registration (Google)',
          message: `${newUser.name} registered with Google as a teacher and awaits approval.`,
          type: 'warning',
        });
      }
    } else {
      await repo.createNotification({
        userId: newUser._id,
        title: 'Welcome to LinguaLearn',
        message: 'Your Google account is connected. Explore English and French courses anytime.',
        type: 'success',
      });
    }

    const token = signToken({
      userId: newUser._id,
      role: newUser.role,
      email: newUser.email,
    });
    res.status(201).json({ token, user: sanitizeUser(newUser), isNewUser: true });
  } catch (err) {
    res.status(500).json({ message: 'Google sign-in failed.', detail: (err as Error).message });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await repo.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, preferredLanguage, bio, expertise, newPassword } = req.body as {
      name?: string;
      preferredLanguage?: 'english' | 'french' | 'both';
      bio?: string;
      expertise?: string;
      newPassword?: string;
    };

    const patch: Record<string, unknown> = {};
    if (name && name.trim().length >= 2) patch.name = name.trim();
    if (preferredLanguage) patch.preferredLanguage = preferredLanguage;
    if (typeof bio === 'string') patch.bio = bio.trim();
    if (typeof expertise === 'string') patch.expertise = expertise.trim();
    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ message: 'New password must be at least 6 characters.' });
        return;
      }
      patch.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await repo.updateUser(req.user!.userId, patch);
    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    res.status(500).json({ message: 'Could not update profile.', detail: (err as Error).message });
  }
});

export default router;
