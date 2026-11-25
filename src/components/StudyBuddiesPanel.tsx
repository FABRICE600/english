import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { CourseLevel, LanguageChoice, SkillType } from '../types.ts';

interface StudyGroupMember {
  _id: string;
  name: string;
  preferredLanguage: string;
}

export interface StudyBuddyGroup {
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
  members: StudyGroupMember[];
  isMember: boolean;
  isFull: boolean;
  createdAt: string;
}

export interface StudyForumReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface StudyForumPost {
  _id: string;
  groupId: string | null;
  language: LanguageChoice;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  replies: StudyForumReply[];
  createdAt: string;
}

const SKILL_OPTIONS: SkillType[] = [
  'speaking',
  'grammar',
  'vocabulary',
  'writing',
  'listening',
  'reading',
  'pronunciation',
  'alphabet',
];

export function StudyBuddiesPanel() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [groups, setGroups] = useState<StudyBuddyGroup[]>([]);
  const [posts, setPosts] = useState<StudyForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<'all' | 'english' | 'french'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Create Group Form State
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupLang, setGroupLang] = useState<LanguageChoice>('english');
  const [groupLevel, setGroupLevel] = useState<CourseLevel>('intermediate');
  const [groupSkill, setGroupSkill] = useState<SkillType>('speaking');
  const [groupCadence, setGroupCadence] = useState('Wed & Sat · 18:00 UTC');
  const [groupMaxMembers, setGroupMaxMembers] = useState(6);
  const [groupDescription, setGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);

  // New Forum Thread State
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [postLang, setPostLang] = useState<LanguageChoice>('english');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  // Inline Reply State
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ groups: StudyBuddyGroup[]; posts: StudyForumPost[] }>('/community');
      setGroups(Array.isArray(res.data?.groups) ? res.data.groups : []);
      setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not load Study Buddies community.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  const handleToggleMembership = async (group: StudyBuddyGroup) => {
    setTogglingGroupId(group._id);
    try {
      const res = await api.post<{ group: StudyBuddyGroup }>(`/community/groups/${group._id}/toggle`);
      const updated = res.data.group;
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      showSuccess(
        updated.isMember
          ? `Joined "${updated.name}".`
          : `Left "${updated.name}".`
      );
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not update group membership.'));
    } finally {
      setTogglingGroupId(null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGroup(true);
    try {
      const res = await api.post<{ group: StudyBuddyGroup }>('/community/groups', {
        name: groupName.trim(),
        language: groupLang,
        level: groupLevel,
        focusSkill: groupSkill,
        meetingCadence: groupCadence.trim(),
        maxMembers: groupMaxMembers,
        description: groupDescription.trim(),
      });
      setGroups((prev) => [res.data.group, ...prev]);
      setGroupName('');
      setGroupDescription('');
      setShowNewGroupForm(false);
      showSuccess(`Peer group "${res.data.group.name}" created.`);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not create study group.'));
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPost(true);
    try {
      const selectedGroup = groups.find((g) => g._id === selectedGroupId);
      const effectiveLang = selectedGroup ? selectedGroup.language : postLang;
      const res = await api.post<{ post: StudyForumPost }>('/community/posts', {
        language: effectiveLang,
        groupId: selectedGroup ? selectedGroup._id : null,
        title: postTitle.trim(),
        content: postContent.trim(),
      });
      setPosts((prev) => [res.data.post, ...prev]);
      setPostTitle('');
      setPostContent('');
      setShowNewPostForm(false);
      showSuccess('Discussion thread published.');
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not publish discussion thread.'));
    } finally {
      setCreatingPost(false);
    }
  };

  const handleReplySubmit = async (postId: string) => {
    const text = (replyDrafts[postId] || '').trim();
    if (!text) return;
    setReplyingPostId(postId);
    try {
      const res = await api.post<{ post: StudyForumPost }>(`/community/posts/${postId}/replies`, {
        content: text,
      });
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data.post : p)));
      setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not post reply.'));
    } finally {
      setReplyingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      showSuccess('Discussion thread removed.');
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not delete post.'));
    }
  };

  const visibleGroups = groups.filter((g) =>
    langFilter === 'all' ? true : g.language === langFilter
  );

  const visiblePosts = posts.filter((p) => {
    if (selectedGroupId && p.groupId !== selectedGroupId) return false;
    if (langFilter !== 'all' && p.language !== langFilter) return false;
    return true;
  });

  const selectedGroup = groups.find((g) => g._id === selectedGroupId) || null;
  const myGroupsCount = groups.filter((g) => g.isMember).length;

  return (
    <section
      aria-labelledby="study-buddies-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Collaborative Peer Learning ·{' '}
            <span className="font-mono tabular-nums">{myGroupsCount} joined</span> ·{' '}
            <span className="font-mono tabular-nums">{posts.length} forum threads</span>
          </p>
          <h2
            id="study-buddies-heading"
            className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <Users className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            Study Buddies &amp; Language Discussion Forums
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Join small peer circles (2–10 learners) to practice together and ask questions in English or French forums.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['all', 'english', 'french'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setLangFilter(key);
                  setSelectedGroupId(null);
                  if (key === 'english' || key === 'french') {
                    setPostLang(key);
                    setGroupLang(key);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  langFilter === key
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {key === 'all' ? 'All Languages' : key}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowNewGroupForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {showNewGroupForm ? 'Cancel Group' : 'Start Peer Group'}
          </button>
        </div>
      </div>

      {/* New Peer Group Form */}
      {showNewGroupForm && (
        <form
          onSubmit={handleCreateGroup}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Create a New Study Buddy Group
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              You will join automatically as organizer
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="buddy-group-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Group Name
              </label>
              <input
                id="buddy-group-name"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., French B1 Listening & Café Practice"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="buddy-group-lang"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Language
              </label>
              <select
                id="buddy-group-lang"
                value={groupLang}
                onChange={(e) => setGroupLang(e.target.value as LanguageChoice)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                <option value="english">English</option>
                <option value="french">French</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="buddy-group-level"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Level
              </label>
              <select
                id="buddy-group-level"
                value={groupLevel}
                onChange={(e) => setGroupLevel(e.target.value as CourseLevel)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="buddy-group-skill"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Focus Skill
              </label>
              <select
                id="buddy-group-skill"
                value={groupSkill}
                onChange={(e) => setGroupSkill(e.target.value as SkillType)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white capitalize focus:border-blue-600 focus:outline-none"
              >
                {SKILL_OPTIONS.map((sk) => (
                  <option key={sk} value={sk} className="capitalize">
                    {sk}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="buddy-group-cadence"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Session Schedule
              </label>
              <input
                id="buddy-group-cadence"
                type="text"
                value={groupCadence}
                onChange={(e) => setGroupCadence(e.target.value)}
                placeholder="Wed & Sat · 18:00 UTC"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="buddy-group-max"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Group Cap (2–10)
              </label>
              <input
                id="buddy-group-max"
                type="number"
                min={2}
                max={10}
                value={groupMaxMembers}
                onChange={(e) => setGroupMaxMembers(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label
                htmlFor="buddy-group-desc"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Study Goal &amp; Collaboration Plan
              </label>
              <input
                id="buddy-group-desc"
                type="text"
                required
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Describe what your peer group will practice together..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingGroup}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {creatingGroup ? 'Creating...' : 'Create Study Group'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading peer groups and forums...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Small Peer Study Groups */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Peer Study Groups ({visibleGroups.length})
              </h3>
              {selectedGroup && (
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Show all forum threads
                </button>
              )}
            </div>

            {visibleGroups.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                No study buddy groups for this filter yet. Start the first circle!
              </p>
            ) : (
              <div className="space-y-3">
                {visibleGroups.map((group) => {
                  const isFrench = group.language === 'french';
                  const isSelected = selectedGroupId === group._id;
                  return (
                    <article
                      key={group._id}
                      className={`rounded-xl border p-4 space-y-3 transition-colors ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            <span
                              className={`font-semibold ${
                                isFrench
                                  ? 'text-sky-700 dark:text-sky-400'
                                  : 'text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {group.language}
                            </span>{' '}
                            · {group.level} · {group.focusSkill}
                          </p>
                          <h4 className="mt-0.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                            {group.name}
                          </h4>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                          {group.memberIds.length}/{group.maxMembers} buddies
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {group.description}
                      </p>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{group.meetingCadence}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Members:{' '}
                          {group.members.length > 0
                            ? group.members.map((m) => m.name.split(' ')[0]).join(', ')
                            : 'Open spot'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedGroupId((prev) => (prev === group._id ? null : group._id))
                          }
                          className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {isSelected ? 'Viewing Group Forum' : 'Open Group Forum →'}
                        </button>

                        <button
                          type="button"
                          disabled={togglingGroupId === group._id || (!group.isMember && group.isFull)}
                          onClick={() => handleToggleMembership(group)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                            group.isMember
                              ? 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              : group.isFull
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-700 text-white hover:bg-blue-800'
                          }`}
                        >
                          {group.isMember ? (
                            <>
                              <UserMinus className="h-3.5 w-3.5" />
                              Leave Group
                            </>
                          ) : group.isFull ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Group Full
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              Join Buddies
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Language Discussion Forum */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  {selectedGroup
                    ? `${selectedGroup.name} — Group Discussions`
                    : langFilter === 'all'
                      ? 'English & French Discussion Forum'
                      : `${langFilter === 'english' ? 'English' : 'French'} Discussion Forum`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask grammar questions, share study tips, and reply to peer learners.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPostForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {showNewPostForm ? 'Close' : 'New Topic'}
              </button>
            </div>

            {showNewPostForm && (
              <form
                onSubmit={handleCreatePost}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="forum-post-title"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Discussion Title
                    </label>
                    <input
                      id="forum-post-title"
                      type="text"
                      required
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g., How do you remember French gender rules for -tion nouns?"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="forum-post-lang"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Forum Language
                    </label>
                    <select
                      id="forum-post-lang"
                      disabled={Boolean(selectedGroup)}
                      value={selectedGroup ? selectedGroup.language : postLang}
                      onChange={(e) => setPostLang(e.target.value as LanguageChoice)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none disabled:opacity-70"
                    >
                      <option value="english">English Forum</option>
                      <option value="french">French Forum</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="forum-post-body"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Question or Study Note
                  </label>
                  <textarea
                    id="forum-post-body"
                    rows={3}
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share your question, example sentence, or peer study note..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingPost}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {creatingPost ? 'Posting...' : 'Publish Topic'}
                  </button>
                </div>
              </form>
            )}

            {visiblePosts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No discussion threads match this filter yet.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click &ldquo;New Topic&rdquo; above to start a collaborative language conversation.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                {visiblePosts.map((post) => {
                  const linkedGroup = post.groupId
                    ? groups.find((g) => g._id === post.groupId)
                    : null;
                  const canDelete = user && (user._id === post.authorId || user.role === 'admin');
                  return (
                    <article key={post._id} className="py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            <span
                              className={`font-semibold ${
                                post.language === 'french'
                                  ? 'text-sky-700 dark:text-sky-400'
                                  : 'text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {post.language} forum
                            </span>
                            {linkedGroup ? ` · ${linkedGroup.name}` : ' · Open Community'} ·{' '}
                            <span className="normal-case">{post.authorName}</span> ·{' '}
                            <span className="font-mono tabular-nums normal-case">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </p>
                          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {post.title}
                          </h4>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post._id)}
                            aria-label={`Delete discussion ${post.title}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Replies */}
                      {post.replies.length > 0 && (
                        <div className="pl-4 border-l border-slate-200 dark:border-slate-800 space-y-2.5">
                          {post.replies.map((reply) => (
                            <div key={reply.id} className="text-xs space-y-0.5">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {reply.authorName}{' '}
                                <span className="font-normal font-mono text-slate-400 tabular-nums">
                                  · {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Reply Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          aria-label={`Reply to ${post.title}`}
                          value={replyDrafts[post._id] || ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleReplySubmit(post._id);
                            }
                          }}
                          placeholder="Write a helpful reply..."
                          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={
                            replyingPostId === post._id || !(replyDrafts[post._id] || '').trim()
                          }
                          onClick={() => handleReplySubmit(post._id)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          {replyingPostId === post._id ? 'Sending...' : 'Reply'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
