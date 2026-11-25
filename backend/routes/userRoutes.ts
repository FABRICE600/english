import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { repo, sanitizeUser } from '../services/repository.ts';

const router = Router();

// Public featured teachers list
router.get('/teachers', async (_req, res) => {
  const users = await repo.listUsers();
  const teachers = users
    .filter((u) => u.role === 'teacher' && u.teacherApproved)
    .map(sanitizeUser);
  res.json({ teachers });
});

// Admin: list all users
router.get('/', authenticate, requireRole('admin'), async (_req, res) => {
  const users = await repo.listUsers();
  res.json({ users: users.map(sanitizeUser) });
});

// Admin: approve or suspend teacher, or update role
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { teacherApproved, role } = req.body as { teacherApproved?: boolean; role?: 'student' | 'teacher' | 'admin' };

  const patch: Record<string, unknown> = {};
  if (typeof teacherApproved === 'boolean') patch.teacherApproved = teacherApproved;
  if (role && ['student', 'teacher', 'admin'].includes(role)) patch.role = role;

  const updated = await repo.updateUser(id, patch);
  if (!updated) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  if (typeof teacherApproved === 'boolean') {
    await repo.createNotification({
      userId: updated._id,
      title: teacherApproved ? 'Instructor Account Approved' : 'Instructor Approval Paused',
      message: teacherApproved
        ? 'Your teacher profile is now active. You can create courses, lessons, quizzes, and grade assignments.'
        : 'Your instructor privileges have been paused by an administrator.',
      type: teacherApproved ? 'success' : 'warning',
    });
  }

  res.json({ user: sanitizeUser(updated) });
});

// Admin: delete user
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ message: 'Administrators cannot delete their own active account.' });
    return;
  }
  const deleted = await repo.deleteUser(req.params.id);
  if (!deleted) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  res.json({ message: 'User removed successfully.' });
});

export default router;
