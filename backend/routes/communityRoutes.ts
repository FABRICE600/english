import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.ts';
import { repo } from '../services/repository.ts';
import { getStore } from '../services/store.ts';
import type { CourseLevel, LanguageChoice, SkillType } from '../types.ts';

const router = Router();

const VALID_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const VALID_SKILLS: SkillType[] = [
  'alphabet',
  'pronunciation',
  'grammar',
  'vocabulary',
  'speaking',
  'listening',
  'reading',
  'writing',
];

function hydrateGroup(
  group: {
    _id: string;
    name: string;
    language: LanguageChoice;
    level: CourseLevel;
    focusSkill: SkillType;
    description: string;
    meetingCadence: string;
    maxMembers: number;
    creatorId: string;
    creatorName: string;
    memberIds: string[];
    createdAt: string;
  },
  userMap: Map<string, { name: string; preferredLanguage: string }>,
  currentUserId: string
) {
  const members = group.memberIds.map((id) => {
    const info = userMap.get(id);
    return {
      _id: id,
      name: info?.name || 'LinguaLearn Learner',
      preferredLanguage: info?.preferredLanguage || 'both',
    };
  });

  return {
    ...group,
    members,
    isMember: group.memberIds.includes(currentUserId),
    isFull: group.memberIds.length >= group.maxMembers,
  };
}

// Get peer study groups and language discussion forum posts
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const db = await getStore();
  const langFilter = req.query.language as string | undefined;
  const userId = req.user!.userId;

  const userMap = new Map(
    db.users.map((u) => [u._id, { name: u.name, preferredLanguage: u.preferredLanguage }])
  );

  let groups = db.studyGroups || [];
  let posts = db.forumPosts || [];

  if (langFilter === 'english' || langFilter === 'french') {
    groups = groups.filter((g) => g.language === langFilter);
    posts = posts.filter((p) => p.language === langFilter);
  }

  const enrichedGroups = [...groups]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((g) => hydrateGroup(g, userMap, userId));

  const orderedPosts = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    groups: enrichedGroups,
    posts: orderedPosts,
  });
});

// Create a small collaborative peer study group
router.post('/groups', authenticate, async (req: AuthRequest, res) => {
  const { name, language, level, focusSkill, description, meetingCadence, maxMembers } = req.body as {
    name?: string;
    language?: string;
    level?: string;
    focusSkill?: string;
    description?: string;
    meetingCadence?: string;
    maxMembers?: number;
  };

  if (!name || name.trim().length < 3 || name.trim().length > 80) {
    res.status(400).json({ message: 'Group name must be between 3 and 80 characters.' });
    return;
  }
  if (language !== 'english' && language !== 'french') {
    res.status(400).json({ message: 'Please choose English or French for this peer group.' });
    return;
  }
  const safeLevel: CourseLevel =
    level && VALID_LEVELS.includes(level as CourseLevel) ? (level as CourseLevel) : 'intermediate';
  const safeSkill: SkillType =
    focusSkill && VALID_SKILLS.includes(focusSkill as SkillType)
      ? (focusSkill as SkillType)
      : 'speaking';

  if (!description || description.trim().length < 10) {
    res.status(400).json({ message: 'Please provide a short study focus description (10+ characters).' });
    return;
  }

  const cap = Math.round(Number(maxMembers || 6));
  const safeMax = Number.isFinite(cap) ? Math.min(10, Math.max(2, cap)) : 6;

  const creator = await repo.findUserById(req.user!.userId);
  if (!creator) {
    res.status(404).json({ message: 'User account not found.' });
    return;
  }

  const created = await repo.createStudyGroup({
    name: name.trim(),
    language,
    level: safeLevel,
    focusSkill: safeSkill,
    description: description.trim().slice(0, 260),
    meetingCadence: (meetingCadence || 'Weekly · Collaborative Check-in').trim().slice(0, 80),
    maxMembers: safeMax,
    creatorId: creator._id,
    creatorName: creator.name,
    memberIds: [creator._id],
  });

  const db = await getStore();
  const userMap = new Map(
    db.users.map((u) => [u._id, { name: u.name, preferredLanguage: u.preferredLanguage }])
  );

  res.status(201).json({ group: hydrateGroup(created, userMap, creator._id) });
});

// Join or leave a peer study group
router.post('/groups/:id/toggle', authenticate, async (req: AuthRequest, res) => {
  const result = await repo.toggleStudyGroupMembership(req.params.id, req.user!.userId);
  if (!result.group) {
    res.status(404).json({ message: result.error || 'Study group not found.' });
    return;
  }
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  const db = await getStore();
  const userMap = new Map(
    db.users.map((u) => [u._id, { name: u.name, preferredLanguage: u.preferredLanguage }])
  );

  res.json({ group: hydrateGroup(result.group, userMap, req.user!.userId) });
});

// Create a language forum discussion post
router.post('/posts', authenticate, async (req: AuthRequest, res) => {
  const { language, groupId, title, content } = req.body as {
    language?: string;
    groupId?: string | null;
    title?: string;
    content?: string;
  };

  if (language !== 'english' && language !== 'french') {
    res.status(400).json({ message: 'Please select English or French forum.' });
    return;
  }
  if (!title || title.trim().length < 4 || title.trim().length > 140) {
    res.status(400).json({ message: 'Discussion title must be between 4 and 140 characters.' });
    return;
  }
  if (!content || content.trim().length < 6 || content.trim().length > 1500) {
    res.status(400).json({ message: 'Discussion post must be between 6 and 1500 characters.' });
    return;
  }

  const author = await repo.findUserById(req.user!.userId);
  if (!author) {
    res.status(404).json({ message: 'User account not found.' });
    return;
  }

  const post = await repo.createForumPost({
    groupId: groupId || null,
    language,
    title: title.trim(),
    content: content.trim(),
    authorId: author._id,
    authorName: author.name,
  });

  res.status(201).json({ post });
});

// Reply to a discussion thread
router.post('/posts/:id/replies', authenticate, async (req: AuthRequest, res) => {
  const { content } = req.body as { content?: string };
  if (!content || content.trim().length < 2 || content.trim().length > 1000) {
    res.status(400).json({ message: 'Reply must be between 2 and 1000 characters.' });
    return;
  }

  const author = await repo.findUserById(req.user!.userId);
  if (!author) {
    res.status(404).json({ message: 'User account not found.' });
    return;
  }

  const updated = await repo.addForumReply(req.params.id, {
    authorId: author._id,
    authorName: author.name,
    content: content.trim(),
  });

  if (!updated) {
    res.status(404).json({ message: 'Discussion post not found.' });
    return;
  }

  res.status(201).json({ post: updated });
});

// Delete own forum post (or admin)
router.delete('/posts/:id', authenticate, async (req: AuthRequest, res) => {
  const deleted = await repo.deleteForumPost(
    req.params.id,
    req.user!.userId,
    req.user!.role === 'admin'
  );
  if (!deleted) {
    res.status(404).json({ message: 'Post not found or not authorized to delete.' });
    return;
  }
  res.json({ ok: true });
});

export default router;
