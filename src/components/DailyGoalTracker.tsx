import React, { useState } from 'react';
import { CheckCircle2, Clock, Layers, Pencil, Target } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useToast } from '../context/ToastContext.tsx';

export interface DailyGoalProgressData {
  type: 'minutes' | 'modules';
  target: number;
  todayMinutes: number;
  todayModules: number;
  currentValue: number;
  progressPercent: number;
  goalMet: boolean;
  updatedAt: string;
}

interface DailyGoalTrackerProps {
  goal: DailyGoalProgressData;
  onUpdated: (nextGoal: DailyGoalProgressData) => void;
}

const MINUTE_PRESETS = [15, 30, 45, 60];
const MODULE_PRESETS = [1, 2, 3, 5];

export function DailyGoalTracker({ goal, onUpdated }: DailyGoalTrackerProps) {
  const { showSuccess, showError } = useToast();

  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<'minutes' | 'modules'>(goal.type);
  const [draftTarget, setDraftTarget] = useState<number>(goal.target);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDraftType(goal.type);
    setDraftTarget(goal.target);
    setEditing((prev) => !prev);
  };

  const handleTypeSwitch = (nextType: 'minutes' | 'modules') => {
    setDraftType(nextType);
    setDraftTarget(nextType === 'minutes' ? 30 : 2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put<{ dailyGoal: DailyGoalProgressData }>('/dashboard/daily-goal', {
        type: draftType,
        target: draftTarget,
      });
      onUpdated(res.data.dailyGoal);
      setEditing(false);
      showSuccess('Daily study goal saved.');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unitLabel = goal.type === 'minutes' ? 'min' : goal.target === 1 ? 'module' : 'modules';

  return (
    <section
      aria-labelledby="daily-goal-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center border shrink-0 ${
              goal.goalMet
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
            }`}
          >
            {goal.goalMet ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Daily Goal Setting · {goal.type === 'minutes' ? 'Study Duration' : 'Module Count'}
            </p>
            <h2
              id="daily-goal-heading"
              className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Today’s Target: {goal.target} {unitLabel}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {goal.goalMet
                ? 'Daily goal achieved! Keep up the strong consistency.'
                : 'Define a daily study duration or completed module count target.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono tabular-nums">
            <span
              className={`text-xl font-bold ${
                goal.goalMet
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-blue-700 dark:text-blue-400'
              }`}
            >
              {goal.progressPercent}%
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {goal.currentValue} / {goal.target} {goal.type === 'minutes' ? 'min' : 'modules'}
            </p>
          </div>

          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? 'Cancel' : 'Set Goal'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div
          role="progressbar"
          aria-label="Daily study goal progress"
          aria-valuenow={goal.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goal.goalMet
                ? 'bg-emerald-600 dark:bg-emerald-400'
                : 'bg-blue-700 dark:bg-blue-500'
            }`}
            style={{ width: `${goal.progressPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>Today logged: {goal.todayMinutes} min · {goal.todayModules} modules</span>
          <span>
            {goal.goalMet
              ? 'Target reached'
              : `${Math.max(0, goal.target - goal.currentValue)} ${goal.type === 'minutes' ? 'min' : 'modules'} remaining`}
          </span>
        </div>
      </div>

      {/* Inline Goal Configuration Panel */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeSwitch('minutes')}
              className={`rounded-lg border p-3 text-left flex items-center gap-2.5 transition-colors ${
                draftType === 'minutes'
                  ? 'border-blue-600 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Study Duration</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Minutes studied per day</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSwitch('modules')}
              className={`rounded-lg border p-3 text-left flex items-center gap-2.5 transition-colors ${
                draftType === 'modules'
                  ? 'border-blue-600 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Module Count</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Lessons or quizzes per day</p>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Quick Target:
              </span>
              {(draftType === 'minutes' ? MINUTE_PRESETS : MODULE_PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDraftTarget(preset)}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors ${
                    draftTarget === preset
                      ? 'border-blue-600 bg-blue-700 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {preset} {draftType === 'minutes' ? 'min' : preset === 1 ? 'mod' : 'mods'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                Custom:
                <input
                  type="number"
                  min={draftType === 'minutes' ? 5 : 1}
                  max={draftType === 'minutes' ? 240 : 20}
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white tabular-nums"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
