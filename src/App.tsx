import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity, AlarmClock, BarChart3, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Flame, Gauge, Goal, History, Home, Menu, Moon, Pause, BookOpenCheck,
  Play, Plus, RotateCcw, Settings, SkipForward, SlidersHorizontal, Sparkles, Target,
  Timer, TrendingUp, X, BookOpen, BookPlus, Trash2, Pencil,
} from 'lucide-react';
import type { Lecture, PageKey, Priority, Subject, StudySession, Task } from '@/types';
import { useApp } from '@/context/AppContext';
import { useTimer, updateTimerDurations } from '@/context/TimerContext';
import {
  formatDateLongFromKey, formatDayName, formatDuration, getCairoDate, getGreeting,
  lastNDays, monthName, daysInMonth, todayKey, addDays, dateKey,
} from '@/lib/datetime';
import { formatTime12 } from '@/lib/format';
import { getSubjectColor, getSubjectIcon, getSubjectName, SUBJECT_ICONS, COLOR_KEYS, getSubjectById } from '@/lib/subjects';
import { getRandomTip } from '@/lib/tips';
import {
  cx, SectionLabel, MetricCard, ProgressBar, Ring, EmptyState, MiniBarChart, Heatmap,
  TaskRow, Modal, Toggle, NumberControl, SettingGroup, SettingRow,
} from '@/components/ui';

const navItems: Array<{ key: PageKey; label: string; icon: typeof Home }> = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'focus', label: 'Focus', icon: Timer },
  { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { key: 'calendar', label: 'Calendar', icon: History },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'habits', label: 'Habits', icon: Activity },
  { key: 'sleep', label: 'Sleep', icon: Moon },
  { key: 'goals', label: 'Goals', icon: Goal },
  { key: 'lectures', label: 'Lectures', icon: BookOpenCheck },
];

function Sidebar() {
  const { currentPage, setCurrentPage, tasks } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = todayKey();
  const pendingCount = tasks.filter((t) => t.dueDate === today && !t.completed).length;
  return <>
    <aside className={cx('fixed inset-y-0 left-0 z-40 w-60 bg-bg-surface border-r border-border-subtle flex flex-col transition-transform lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="h-16 px-5 flex items-center border-b border-border-subtle">
        <button onClick={() => setCurrentPage('dashboard')} className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-success flex items-center justify-center text-bg-base"><Gauge size={16} strokeWidth={2.5} /></span>
          <span className="font-semibold tracking-tight text-text-primary">StudyFlow</span>
        </button>
        <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-text-tertiary"><X size={18} /></button>
      </div>
      <div className="px-3 pt-5 flex-1">
        <div className="px-3 mb-2 text-2xs uppercase tracking-widest font-medium text-text-tertiary">Workspace</div>
        <nav className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => { setCurrentPage(key); setMobileOpen(false); }} className={cx('nav-item w-full text-left', currentPage === key ? 'nav-item-active' : 'nav-item-inactive')}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{key === 'tasks' && pendingCount > 0 && <span className="ml-auto text-2xs text-text-tertiary">{pendingCount}</span>}</button>)}
        </nav>
      </div>
      <div className="p-3 border-t border-border-subtle"><button onClick={() => { setCurrentPage('settings'); setMobileOpen(false); }} className={cx('nav-item w-full', currentPage === 'settings' ? 'nav-item-active' : 'nav-item-inactive')}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button></div>
    </aside>
    <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-30 lg:hidden w-9 h-9 card flex items-center justify-center text-text-secondary"><Menu size={18} /></button>
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
  </>;
}

function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isSaving, isRemote } = useApp();
  return <header className="h-16 border-b border-border-subtle flex items-center justify-between px-5 sm:px-8 lg:px-10"><div className="pl-10 lg:pl-0"><h1 className="font-semibold text-text-primary tracking-tight">{title}</h1>{subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}</div><div className="flex items-center gap-3"><span className="hidden sm:flex items-center gap-1.5 text-2xs text-text-tertiary">{isSaving ? <><span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" /> Saving</> : <><span className="w-1.5 h-1.5 bg-success rounded-full" /> {isRemote ? 'Synced' : 'Offline'}</>}</span></div></header>;
}

function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <div className="min-h-screen lg:pl-60 pb-20 lg:pb-0"><Topbar title={title} subtitle={subtitle} /><main className="px-5 sm:px-8 lg:px-10 py-7 max-w-[1440px] mx-auto">{children}</main></div>;
}

// ============ DASHBOARD ============
function Dashboard() {
  const { tasks, studySessions, sleepEntries, settings, setCurrentPage, toggleTask } = useApp();
  const [, setClockTick] = useState(0);
  const today = todayKey();
  const todaySessions = studySessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((a, s) => s.durationMinutes, 0);
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const completed = todayTasks.filter((t) => t.completed).length;
  const sleep = sleepEntries.find((s) => s.date === today)?.durationMinutes ?? 0;
  const days = lastNDays(7);
  const bars = days.map((d) => studySessions.filter((s) => s.date === d).reduce((a, s) => s.durationMinutes, 0));
  const streak = computeStreak(studySessions);
  const cairo = getCairoDate();

  useEffect(() => { const timer = window.setInterval(() => setClockTick((t) => t + 1), 1000); return () => window.clearInterval(timer); }, []);

  const hasAnyData = studySessions.length > 0 || tasks.length > 0 || sleepEntries.length > 0;

  return <PageShell title="Dashboard">
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-8">
      <div>
        <p className="text-2xl sm:text-3xl font-semibold tracking-tight">{getGreeting(new Date())}</p>
        <p className="text-sm text-text-secondary mt-1.5">{formatDateLongFromKey(today)}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-2xs uppercase tracking-widest text-text-tertiary">Cairo · القاهرة</div>
          <div className="font-mono text-xl text-text-primary tracking-tight">{String(cairo.getHours()).padStart(2, '0')}<span className="text-text-tertiary animate-pulse">:</span>{String(cairo.getMinutes()).padStart(2, '0')}<span className="text-xs text-text-tertiary ml-1">{String(cairo.getSeconds()).padStart(2, '0')}</span></div>
        </div>
        <button onClick={() => setCurrentPage('focus')} className="btn-primary"><Play size={15} fill="currentColor" /> Start focus</button>
      </div>
    </div>

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <MetricCard icon={Clock3} label="Study time today" value={formatDuration(todayMinutes)} detail={`of ${formatDuration(settings.goals.dailyStudyMinutes)} goal`} tone="success" />
      <MetricCard icon={CheckCircle2} label="Tasks" value={todayTasks.length ? `${completed} / ${todayTasks.length}` : '—'} detail={todayTasks.length ? `${todayTasks.length - completed} remaining` : 'No tasks today'} />
      <MetricCard icon={Flame} label="Study streak" value={streak > 0 ? `${streak} days` : '—'} detail={streak > 0 ? 'Keep it going' : 'Start studying to begin'} tone="warning" />
      <MetricCard icon={Moon} label="Sleep" value={sleep ? formatDuration(sleep) : '—'} detail={sleep ? 'Last night' : 'No entry yet'} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <div className="card p-5 xl:col-span-2">
        <SectionLabel action={<button onClick={() => setCurrentPage('analytics')} className="text-xs text-text-secondary hover:text-text-primary">View analytics <ChevronRight size={13} className="inline ml-1" /></button>}>Today's progress</SectionLabel>
        {todayMinutes === 0 && todayTasks.length === 0 ? (
          <EmptyState icon={Sparkles} title="Nothing tracked yet today" description="Start a focus session or add a task to see your daily progress here." action={<button onClick={() => setCurrentPage('focus')} className="btn-primary"><Play size={14} fill="currentColor" /> Start focus</button>} />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 py-3">
            <Ring value={(todayMinutes / settings.goals.dailyStudyMinutes) * 100} label={`${Math.round((todayMinutes / settings.goals.dailyStudyMinutes) * 100)}%`} sublabel="daily goal" size={128} />
            <div className="flex-1 w-full space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-2"><span className="text-text-secondary">Study goal</span><span className="text-text-primary font-medium">{formatDuration(todayMinutes)} <span className="text-text-tertiary font-normal">/ {formatDuration(settings.goals.dailyStudyMinutes)}</span></span></div>
                <ProgressBar value={(todayMinutes / settings.goals.dailyStudyMinutes) * 100} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2"><span className="text-text-secondary">Task completion</span><span className="text-text-primary font-medium">{completed} <span className="text-text-tertiary font-normal">/ {todayTasks.length || 0}</span></span></div>
                <ProgressBar value={todayTasks.length ? (completed / todayTasks.length) * 100 : 0} color="bg-info" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="card p-5">
        <SectionLabel>Quick insight</SectionLabel>
        {hasAnyData ? (
          <DashboardInsight studySessions={studySessions} />
        ) : (
          <div className="flex items-center gap-3 mt-5"><div className="w-8 h-8 rounded-md bg-bg-hover text-text-secondary flex items-center justify-center shrink-0"><Sparkles size={16} /></div><p className="text-xs text-text-tertiary leading-relaxed">Your insights will appear here once you have a few days of study data.</p></div>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-8">
      <div className="card p-5 xl:col-span-3">
        <SectionLabel action={<button onClick={() => setCurrentPage('tasks')} className="text-xs text-text-secondary hover:text-text-primary">See all <ChevronRight size={13} className="inline ml-1" /></button>}>Today's tasks</SectionLabel>
        {todayTasks.length > 0 ? (
          <div className="divide-y divide-border-subtle">{todayTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} compact onToggle={() => toggleTask(task.id)} />)}</div>
        ) : (
          <EmptyState icon={CheckCircle2} title="No tasks today" description="Add a task to give your day some direction." action={<button onClick={() => setCurrentPage('tasks')} className="btn-secondary"><Plus size={14} /> Add a task</button>} />
        )}
      </div>
      <div className="card p-5 xl:col-span-2">
        <SectionLabel>Study activity · 7 days</SectionLabel>
        {studySessions.length > 0 ? (
          <MiniBarChart data={bars} labels={days.map(formatDayName)} />
        ) : (
          <EmptyState icon={Clock3} title="No study sessions yet" description="Start your first focus session to see your progress here." action={<button onClick={() => setCurrentPage('focus')} className="btn-secondary"><Play size={14} fill="currentColor" /> Start focus</button>} />
        )}
      </div>
    </div>

    <div className="card p-5">
      <SectionLabel action={<span className="text-2xs text-text-tertiary">Last 5 weeks</span>}>Study consistency</SectionLabel>
      {studySessions.length > 0 ? <Heatmap /> : <EmptyState icon={Flame} title="No activity yet" description="Your study consistency heatmap will fill in as you complete focus sessions." />}
    </div>
  </PageShell>;
}

function DashboardInsight({ studySessions }: { studySessions: StudySession[] }) {
  const insight = computeWeeklyInsight(studySessions);
  return <div className="flex gap-3 mt-5"><div className="w-8 h-8 rounded-md bg-success-bg text-success flex items-center justify-center shrink-0"><TrendingUp size={16} /></div><div><p className="text-sm text-text-primary leading-relaxed">{insight}</p></div></div>;
}

// ============ FOCUS ============
function Focus() {
  const { settings, studySessions, subjects, addStudySession } = useApp();
  const timer = useTimer();
  const today = todayKey();
  const todaySessions = studySessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((a, s) => s.durationMinutes, 0);
  const duration = Math.round(timer.duration / 60);

  useEffect(() => {
    updateTimerDurations(settings.timer.focusMinutes, settings.timer.shortBreakMinutes, settings.timer.longBreakMinutes);
  }, [settings.timer.focusMinutes, settings.timer.shortBreakMinutes, settings.timer.longBreakMinutes]);

  useEffect(() => {
    timer.onComplete((mode, durationMinutes, subjectId) => {
      if (mode === 'focus') {
        addStudySession({ date: today, startTime: new Date().toTimeString().slice(0, 5), durationMinutes, subjectId });
      }
    });
  }, [timer, addStudySession, today]);

  const mins = Math.floor(timer.seconds / 60);
  const secs = timer.seconds % 60;
  const progress = ((timer.duration - timer.seconds) / timer.duration) * 100;
  const pomodoroCount = todaySessions.length;
  const longBreakInterval = settings.timer.longBreakInterval;

  const handleStartPause = () => {
    if (timer.completed) return;
    if (timer.running) timer.pause();
    else if (timer.seconds === timer.duration) timer.start();
    else timer.resume();
  };

  return <PageShell title="Focus" subtitle="A quiet space for meaningful work.">
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-1 p-1 bg-bg-surface border border-border-subtle rounded-md w-fit mx-auto mb-8">
        {(['focus', 'short', 'long'] as const).map((m) => <button key={m} onClick={() => timer.changeMode(m)} className={cx('px-5 py-2 rounded-sm text-xs font-medium', timer.mode === m ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary')}>{m === 'focus' ? 'Focus' : m === 'short' ? 'Short break' : 'Long break'}</button>)}
      </div>

      {timer.mode === 'focus' && !timer.completed && (
        <div className="max-w-xs mx-auto mb-6">
          <label className="label text-center">Subject (optional)</label>
          <select value={timer.sessionSubject ?? ''} onChange={(e) => timer.setSessionSubject(e.target.value || null)} className="input">
            <option value="">No subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {timer.completed ? (
        <div className="card max-w-md mx-auto text-center py-12 px-6 animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-success-bg text-success flex items-center justify-center mx-auto mb-5"><Check size={26} /></div>
          <div className="text-2xs uppercase tracking-widest text-success font-medium">Session complete</div>
          <h2 className="text-2xl font-semibold mt-2">{duration} minutes focused</h2>
          <p className="text-sm text-text-secondary mt-2">+{duration} min added to your study time</p>
          <div className="mt-7 p-4 bg-bg-base border border-border-subtle rounded-md text-sm text-text-secondary leading-relaxed">{timer.tip || getRandomTip()}</div>
          <button onClick={() => timer.dismissComplete()} className="btn-primary mt-7">Continue</button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-2xs uppercase tracking-[0.25em] text-text-tertiary mb-7">{timer.mode === 'focus' ? 'Focus session' : timer.mode === 'short' ? 'Short break' : 'Long break'}</div>
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 320 320">
              <circle cx="160" cy="160" r="148" fill="none" stroke="#1a1a1f" strokeWidth="2" />
              <circle cx="160" cy="160" r="148" fill="none" stroke="#3fb950" strokeWidth="3" strokeLinecap="round" strokeDasharray={930} strokeDashoffset={930 - (930 * progress) / 100} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-6xl sm:text-7xl tracking-tight text-text-primary">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</div>
              <div className="text-xs text-text-tertiary mt-3">{timer.running ? 'Stay with it' : 'Ready when you are'}</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-9">
            <button onClick={handleStartPause} className="btn-primary px-7">{timer.running ? <><Pause size={15} /> Pause</> : <><Play size={15} fill="currentColor" /> {timer.seconds === timer.duration ? 'Start' : 'Resume'}</>}</button>
            <button onClick={() => timer.reset()} className="btn-secondary"><RotateCcw size={15} /> Reset</button>
            <button onClick={() => timer.skip()} className="btn-ghost"><SkipForward size={15} /> Skip</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-12">
        <div className="card p-4"><div className="text-xs text-text-tertiary">Today's focus time</div><div className="text-xl font-semibold mt-2">{formatDuration(todayMinutes)}</div></div>
        <div className="card p-4"><div className="text-xs text-text-tertiary">Sessions today</div><div className="flex items-center gap-1.5 mt-3">{Array.from({ length: Math.max(4, Math.ceil(pomodoroCount / longBreakInterval) * longBreakInterval) }).map((_, i) => <span key={i} className={cx('w-2.5 h-2.5 rounded-full', i < pomodoroCount % longBreakInterval || (pomodoroCount > 0 && pomodoroCount % longBreakInterval === 0 && i < longBreakInterval) ? 'bg-success' : 'bg-bg-hover border border-border')} />)}</div></div>
      </div>

      <div className="card p-5 mt-4">
        <SectionLabel>Timer settings</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><div className="text-2xs text-text-tertiary">Focus duration</div><div className="text-sm text-text-primary mt-1">{settings.timer.focusMinutes} min</div></div>
          <div><div className="text-2xs text-text-tertiary">Short break</div><div className="text-sm text-text-primary mt-1">{settings.timer.shortBreakMinutes} min</div></div>
          <div><div className="text-2xs text-text-tertiary">Long break</div><div className="text-sm text-text-primary mt-1">{settings.timer.longBreakMinutes} min</div></div>
          <div><div className="text-2xs text-text-tertiary">Long break after</div><div className="text-sm text-text-primary mt-1">{settings.timer.longBreakInterval} sessions</div></div>
        </div>
      </div>
    </div>
  </PageShell>;
}

// ============ TASKS ============
function Tasks() {
  const { tasks, subjects, toggleTask, addTask, updateTask, deleteTask } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [groupBySubject, setGroupBySubject] = useState(false);
  const today = todayKey();
  const visible = tasks.filter((t) => filter === 'today' ? t.dueDate === today && !t.completed : filter === 'upcoming' ? t.dueDate > today && !t.completed : t.completed);

  const grouped = groupBySubject ? visible.reduce((acc, task) => {
    const key = task.subjectId ?? 'none';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>) : null;

  return <PageShell title="Tasks" subtitle="Stay on top of what matters.">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex gap-1 p-1 bg-bg-surface border border-border-subtle rounded-md">
        <button onClick={() => setFilter('today')} className={cx('px-4 py-2 rounded-sm text-xs', filter === 'today' ? 'tab-active' : 'tab-inactive')}>Today</button>
        <button onClick={() => setFilter('upcoming')} className={cx('px-4 py-2 rounded-sm text-xs', filter === 'upcoming' ? 'tab-active' : 'tab-inactive')}>Upcoming</button>
        <button onClick={() => setFilter('completed')} className={cx('px-4 py-2 rounded-sm text-xs', filter === 'completed' ? 'tab-active' : 'tab-inactive')}>Completed</button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setGroupBySubject((v) => !v)} className={cx('btn text-xs px-3 py-2', groupBySubject ? 'bg-bg-elevated text-text-primary border border-border' : 'btn-secondary')}>Group by subject</button>
        <button onClick={() => { setEditTask(null); setShowModal(true); }} className="btn-primary"><Plus size={15} /> Add task</button>
      </div>
    </div>

    {visible.length === 0 ? (
      <EmptyState icon={CheckCircle2} title={filter === 'completed' ? 'No completed tasks' : filter === 'today' ? 'No tasks for today' : 'No upcoming tasks'} description={filter === 'today' ? 'Add your first task to get started.' : filter === 'upcoming' ? 'Tasks with future due dates will appear here.' : 'Completed tasks will appear here.'} action={filter !== 'completed' ? <button onClick={() => { setEditTask(null); setShowModal(true); }} className="btn-secondary"><Plus size={14} /> Add a task</button> : undefined} />
    ) : groupBySubject && grouped ? (
      <div className="space-y-4">
        {Object.entries(grouped).map(([subjectId, subjectTasks]) => {
          const subject = subjectId === 'none' ? null : getSubjectById(subjects, subjectId);
          const SubjectIcon = subject ? getSubjectIcon(subject.icon) : BookOpen;
          const color = subject ? getSubjectColor(subject.color) : '#62626d';
          return <div key={subjectId} className="card"><div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2"><SubjectIcon size={14} style={{ color }} /><span className="text-xs font-medium text-text-secondary">{subject?.name ?? 'No Subject'}</span><span className="text-2xs text-text-tertiary ml-1">{subjectTasks.length}</span></div><div className="divide-y divide-border-subtle">{subjectTasks.map((task) => <div key={task.id} className="px-5"><TaskRow task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} onEdit={() => { setEditTask(task); setShowModal(true); }} /></div>)}</div></div>;
        })}
      </div>
    ) : (
      <div className="card divide-y divide-border-subtle">{visible.map((task) => <div key={task.id} className="px-5"><TaskRow task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} onEdit={() => { setEditTask(task); setShowModal(true); }} /></div>)}</div>
    )}

    {showModal && <TaskModal onClose={() => { setShowModal(false); setEditTask(null); }} subjects={subjects} editTask={editTask} onSubmit={(taskData) => { if (editTask) { updateTask(editTask.id, taskData); } else { addTask(taskData); } setShowModal(false); setEditTask(null); }} />}
  </PageShell>;
}

function TaskModal({ onClose, subjects, editTask, onSubmit }: { onClose: () => void; subjects: Subject[]; editTask: Task | null; onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void }) {
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(editTask?.subjectId ?? (subjects[0]?.id ?? null));
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium');
  const [minutes, setMinutes] = useState(editTask?.estimatedMinutes ?? 30);
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? todayKey());
  const [dueTime, setDueTime] = useState(editTask?.dueTime ?? '');

  return <Modal onClose={onClose} title={editTask ? 'Edit task' : 'Add task'} subtitle={editTask ? 'Update task details' : 'What needs your attention?'} maxWidth="max-w-lg">
    <div className="space-y-4">
      <div><label className="label">Task name</label><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review physics notes" className="input" /></div>
      <div><label className="label">Description <span className="text-text-tertiary font-normal">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional notes…" className="input min-h-[60px] resize-none" /></div>
      <div><label className="label">Subject</label><select value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value || null)} className="input"><option value="">No Subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{subjects.length === 0 && <p className="text-2xs text-text-tertiary mt-1">No subjects yet. Create one in Settings.</p>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
        <div><label className="label">Estimated time</label><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="input"><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Due date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /></div>
        <div><label className="label">Due time <span className="text-text-tertiary font-normal">(optional)</span></label><input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="input" /></div>
      </div>
    </div>
    <div className="flex gap-2 justify-end mt-7">
      <button onClick={onClose} className="btn-ghost">Cancel</button>
      <button disabled={!title.trim()} onClick={() => onSubmit({ title, description, subjectId, priority, estimatedMinutes: minutes, dueDate, dueTime })} className="btn-primary">{editTask ? 'Save changes' : 'Add task'}</button>
    </div>
  </Modal>;
}


function LecturesPage() {
  const { lectures, subjects, addLecture, updateLecture, deleteLecture, completeLecture } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);

  return <PageShell title="Lecture backlog" subtitle="Track what has piled up and let StudyFlow add new releases automatically.">
    <div className="flex items-center justify-between gap-3 mb-5">
      <div>
        <div className="text-sm text-text-secondary">Total backlog</div>
        <div className="text-3xl font-semibold mt-1">{lectures.reduce((sum, l) => sum + l.backlog, 0)} lectures</div>
      </div>
      <button onClick={() => { setEditLecture(null); setShowModal(true); }} className="btn-primary"><Plus size={15} /> Add lecture track</button>
    </div>

    {lectures.length === 0 ? (
      <EmptyState icon={BookOpenCheck} title="No lecture tracks yet" description="Add a subject, current backlog, and weekly release time. New lectures will then increase the backlog automatically." action={<button onClick={() => { setEditLecture(null); setShowModal(true); }} className="btn-secondary"><Plus size={14} /> Add lecture track</button>} />
    ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {lectures.map((lecture) => {
          const subject = getSubjectById(subjects, lecture.subjectId);
          const SubjectIcon = subject ? getSubjectIcon(subject.icon) : BookOpenCheck;
          const subjectColor = subject ? getSubjectColor(subject.color) : '#62626d';
          return <div key={lecture.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-md bg-bg-hover flex items-center justify-center shrink-0"><SubjectIcon size={18} style={{ color: subjectColor }} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-medium text-text-primary">{lecture.title}</div><div className="text-xs text-text-tertiary mt-1">{subject?.name ?? 'No subject'}</div></div>
                  <div className="text-right"><div className="text-3xl font-semibold leading-none">{lecture.backlog}</div><div className="text-2xs uppercase tracking-widest text-text-tertiary mt-1">backlog</div></div>
                </div>
                <div className="mt-4 p-3 bg-bg-base border border-border-subtle rounded-md">
                  <div className="text-xs text-text-secondary">New lecture</div>
                  <div className="text-sm mt-1 font-medium">Every {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][lecture.releaseSchedule.dayOfWeek]} at {formatTime12(lecture.releaseSchedule.time)}</div>
                  <div className="text-2xs text-text-tertiary mt-1">When a release is due, backlog increases by 1.</div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => completeLecture(lecture.id)} disabled={lecture.backlog === 0} className="btn-primary flex-1"><Check size={14} /> Complete lecture</button>
                  <button onClick={() => { setEditLecture(lecture); setShowModal(true); }} className="btn-secondary" aria-label="Edit lecture"><Pencil size={14} /></button>
                  <button onClick={() => deleteLecture(lecture.id)} className="btn-ghost text-danger" aria-label="Delete lecture"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </div>;
        })}
      </div>
    )}

    {showModal && <LectureModal onClose={() => { setShowModal(false); setEditLecture(null); }} subjects={subjects} editLecture={editLecture} onSubmit={(data) => {
      if (editLecture) updateLecture(editLecture.id, data);
      else addLecture(data);
      setShowModal(false);
      setEditLecture(null);
    }} />}
  </PageShell>;
}

function LectureModal({ onClose, subjects, editLecture, onSubmit }: { onClose: () => void; subjects: Subject[]; editLecture: Lecture | null; onSubmit: (data: Omit<Lecture, 'id' | 'createdAt' | 'lastReleasedKey'>) => void }) {
  const [title, setTitle] = useState(editLecture?.title ?? '');
  const [subjectId, setSubjectId] = useState(editLecture?.subjectId ?? (subjects[0]?.id ?? ''));
  const [backlog, setBacklog] = useState(editLecture?.backlog ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState(editLecture?.releaseSchedule.dayOfWeek ?? new Date().getDay());
  const [time, setTime] = useState(editLecture?.releaseSchedule.time ?? '20:00');
  const [startDate, setStartDate] = useState(editLecture?.releaseSchedule.startDate ?? todayKey());

  return <Modal onClose={onClose} title={editLecture ? 'Edit lecture track' : 'Add lecture track'} subtitle="Set the current backlog and weekly release schedule." maxWidth="max-w-lg">
    <div className="space-y-4">
      <div><label className="label">Lecture name</label><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Physics weekly lecture" className="input" /></div>
      <div><label className="label">Subject</label><select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input">{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{subjects.length === 0 && <p className="text-xs text-danger mt-1">Create the subject first in Settings.</p>}</div>
      <div><label className="label">Current backlog</label><input type="number" min={0} value={backlog} onChange={(e) => setBacklog(Math.max(0, Number(e.target.value)))} className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Release day</label><select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="input">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, i) => <option key={day} value={i}>{day}</option>)}</select></div>
        <div><label className="label">Release time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></div>
      </div>
      <div><label className="label">Schedule starts</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" /><p className="text-2xs text-text-tertiary mt-1">Releases before this date are not added to the backlog.</p></div>
    </div>
    <div className="flex gap-2 justify-end mt-7"><button onClick={onClose} className="btn-ghost">Cancel</button><button disabled={!title.trim() || !subjectId} onClick={() => onSubmit({ title: title.trim(), subjectId, backlog, releaseSchedule: { frequency: 'weekly', dayOfWeek, time, startDate } })} className="btn-primary">{editLecture ? 'Save changes' : 'Add track'}</button></div>
  </Modal>;
}

// ============ CALENDAR ============
function CalendarPage() {
  const { tasks, studySessions, sleepEntries, subjects, toggleTask } = useApp();
  const [selected, setSelected] = useState(todayKey());
  const [month, setMonth] = useState(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const total = daysInMonth(month.getFullYear(), month.getMonth());
  const dates = Array.from({ length: first + total }, (_, i) => i < first ? null : `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i - first + 1).padStart(2, '0')}`);
  const dayTasks = tasks.filter((t) => t.dueDate === selected);
  const daySessions = studySessions.filter((s) => s.date === selected);
  const study = daySessions.reduce((a, s) => a + s.durationMinutes, 0);
  const sleep = sleepEntries.find((s) => s.date === selected)?.durationMinutes ?? 0;
  const hasDayData = dayTasks.length > 0 || daySessions.length > 0 || sleep > 0;

  return <PageShell title="Calendar" subtitle="Look back to understand your rhythm.">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="card p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn-ghost p-1.5"><ChevronLeft size={16} /></button>
          <div className="text-sm font-medium">{monthName(month.getMonth())} {month.getFullYear()}</div>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn-ghost p-1.5"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">{['Su','Mo','Tu','We','Th','Fr','Sa'].map((day) => <div key={day} className="text-center text-2xs text-text-tertiary py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{dates.map((key, i) => key ? <button key={key} onClick={() => setSelected(key)} className={cx('aspect-square rounded-md text-xs transition-colors', selected === key ? 'bg-success text-bg-base font-medium' : key === todayKey() ? 'border border-success/60 text-success' : 'text-text-secondary hover:bg-bg-hover')}>{Number(key.slice(-2))}</button> : <span key={`empty-${i}`} />)}</div>
      </div>
      <div className="lg:col-span-3">
        <div className="mb-4"><div className="text-2xs uppercase tracking-widest text-text-tertiary">Daily summary</div><h2 className="text-xl font-semibold mt-1">{formatDateLongFromKey(selected)}</h2></div>
        {hasDayData ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <MetricCard icon={Clock3} label="Study time" value={formatDuration(study)} detail="focused" tone="success" />
              <MetricCard icon={Timer} label="Pomodoros" value={String(daySessions.length)} detail="sessions" />
              <MetricCard icon={CheckCircle2} label="Tasks" value={dayTasks.length ? `${dayTasks.filter((t) => t.completed).length} / ${dayTasks.length}` : '—'} detail="completed" />
              <MetricCard icon={Moon} label="Sleep" value={sleep ? formatDuration(sleep) : '—'} detail="last night" />
            </div>
            <div className="card p-5 mb-4"><SectionLabel>Planned tasks</SectionLabel>{dayTasks.length ? <div className="divide-y divide-border-subtle">{dayTasks.map((task) => <TaskRow key={task.id} task={task} compact onToggle={() => toggleTask(task.id)} />)}</div> : <p className="text-sm text-text-tertiary py-5">No tasks planned for this day.</p>}</div>
            <div className="card p-5"><SectionLabel>Study sessions</SectionLabel>{daySessions.length ? <div className="divide-y divide-border-subtle">{daySessions.map((session) => <div key={session.id} className="py-3 flex items-center gap-4"><span className="font-mono text-xs text-text-secondary w-12">{session.startTime}</span><span className="w-1.5 h-1.5 rounded-full bg-success" /><span className="text-sm text-text-primary flex-1">{getSubjectName(subjects, session.subjectId)}</span><span className="text-xs text-text-tertiary">{formatDuration(session.durationMinutes)}</span></div>)}</div> : <p className="text-sm text-text-tertiary py-5">No study sessions recorded for this day.</p>}</div>
          </>
        ) : (
          <EmptyState icon={History} title="No data for this day" description="There are no tasks, study sessions, or sleep entries for this date. Try selecting another day." />
        )}
      </div>
    </div>
  </PageShell>;
}

// ============ ANALYTICS ============
function Analytics() {
  const { studySessions, tasks, setCurrentPage } = useApp();
  const [range, setRange] = useState(7);
  const keys = lastNDays(range);
  const bars = keys.map((d) => studySessions.filter((s) => s.date === d).reduce((a, s) => s.durationMinutes, 0));
  const total = studySessions.reduce((a, s) => a + s.durationMinutes, 0);
  const completed = tasks.filter((t) => t.completed).length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const avgSession = studySessions.length ? Math.round(total / studySessions.length) : 0;
  const streak = computeStreak(studySessions);
  const daysStudied = new Set(studySessions.map((s) => s.date)).size;
  const consistencyPct = studySessions.length > 0 ? Math.round((daysStudied / Math.max(keys.length, 1)) * 100) : 0;
  const hasData = studySessions.length > 0 || tasks.length > 0;

  return <PageShell title="Your Progress" subtitle="Patterns worth paying attention to.">
    {!hasData ? (
      <EmptyState icon={BarChart3} title="No data available yet" description="Your analytics will appear as you use StudyFlow. Start a focus session or add tasks to begin." action={<button onClick={() => setCurrentPage('focus')} className="btn-secondary"><Play size={14} fill="currentColor" /> Start focus</button>} />
    ) : (
      <>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div><div className="text-4xl sm:text-5xl font-semibold tracking-tight">{formatDuration(total)}</div><div className="text-sm text-text-secondary mt-2">Total study time</div></div>
          <div className="flex gap-1 p-1 bg-bg-surface border border-border-subtle rounded-md">{[7, 30, 90].map((n) => <button key={n} onClick={() => setRange(n)} className={cx('px-4 py-2 rounded-sm text-xs', range === n ? 'tab-active' : 'tab-inactive')}>{n}D</button>)}</div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <MetricCard icon={Clock3} label="Study time" value={formatDuration(total)} detail={`${studySessions.length} sessions`} tone="success" />
          <MetricCard icon={CheckCircle2} label="Task completion" value={`${completion}%`} detail={`${completed} of ${tasks.length} tasks`} />
          <MetricCard icon={Timer} label="Average session" value={avgSession ? formatDuration(avgSession) : '—'} detail={`across ${studySessions.length} sessions`} />
          <MetricCard icon={Flame} label="Current streak" value={streak > 0 ? `${streak} days` : '—'} detail={streak > 0 ? 'Keep it going' : 'Start today'} tone="warning" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card p-5 xl:col-span-2"><SectionLabel>Study time over time</SectionLabel>{studySessions.length > 0 ? <MiniBarChart data={bars} labels={range === 7 ? keys.map(formatDayName) : keys.filter((_, i) => i % Math.ceil(range / 7) === 0).map(formatDayName)} height={220} /> : <EmptyState icon={Clock3} title="No study sessions yet" description="Start your first focus session to see your study time chart." />}</div>
          <div className="card p-5"><SectionLabel>Consistency</SectionLabel>{daysStudied > 0 ? <><div className="flex items-center justify-center py-8"><Ring value={consistencyPct} label={`${consistencyPct}%`} sublabel="days studied" size={150} /></div><div className="flex justify-between items-center pt-4 border-t border-border-subtle text-xs"><span className="text-text-tertiary">Days studied</span><span className="text-text-primary">{daysStudied}</span></div></> : <EmptyState icon={Sparkles} title="No data yet" description="Your consistency will appear here once you start studying." />}</div>
          {tasks.length > 0 && <div className="card p-5 xl:col-span-2"><SectionLabel>Task completion</SectionLabel><div className="flex items-center gap-8 py-5"><div className="flex-1"><div className="flex justify-between text-xs mb-2"><span className="text-text-secondary">Completed</span><span className="text-text-primary">{completed}</span></div><ProgressBar value={completion} /><div className="flex justify-between text-xs mt-5 mb-2"><span className="text-text-secondary">Remaining</span><span className="text-text-primary">{tasks.length - completed}</span></div><ProgressBar value={100 - completion} color="bg-info" /></div><div className="text-right"><div className="text-3xl font-semibold">{completion}%</div><div className="text-xs text-text-tertiary mt-1">overall</div></div></div></div>}
          <div className="card p-5"><SectionLabel>Insights</SectionLabel><div className="space-y-4 mt-4">{computeAnalyticsInsights(studySessions, tasks).map((text, i) => <Insight key={i} text={text} />)}</div></div>
        </div>
      </>
    )}
  </PageShell>;
}

function Insight({ text }: { text: string }) {
  return <div className="flex gap-3"><span className="w-6 h-6 rounded bg-success-bg text-success flex items-center justify-center shrink-0"><TrendingUp size={13} /></span><p className="text-xs text-text-secondary leading-relaxed">{text}</p></div>;
}

// ============ HABITS ============
function Habits() {
  const { habits, habitLogs, toggleHabit, addHabit, deleteHabit } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const keys = lastNDays(30);

  const computeStreak = (habitId: string): number => {
    let count = 0;
    for (let i = keys.length - 1; i >= 0; i--) {
      const log = habitLogs.find((l) => l.habitId === habitId && l.date === keys[i]);
      if (log?.completed) count++;
      else if (i < keys.length - 1) break; // streak breaks (not today)
    }
    return count;
  };

  return <PageShell title="Habits" subtitle="Small actions, repeated often.">
    <div className="flex justify-end mb-5"><button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add habit</button></div>
    {habits.length === 0 ? (
      <EmptyState icon={Activity} title="No habits yet" description="Add your first habit to start tracking daily consistency." action={<button onClick={() => setShowAdd(true)} className="btn-secondary"><Plus size={14} /> Add a habit</button>} />
    ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {habits.map((habit) => {
          const done = habitLogs.filter((l) => l.habitId === habit.id && l.completed).length;
          const current = computeStreak(habit.id);
          const pct = Math.round((done / 30) * 100);
          return <div key={habit.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-md bg-bg-hover text-text-secondary flex items-center justify-center"><BookOpen size={17} /></div><div><h3 className="text-sm font-medium">{habit.name}</h3><p className="text-2xs text-text-tertiary mt-1">{done} of 30 days · {pct}%</p></div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleHabit(habit.id)} className={cx('btn text-xs px-3 py-1.5', habitLogs.find((l) => l.habitId === habit.id && l.date === todayKey())?.completed ? 'bg-success-bg text-success' : 'btn-secondary')}>{habitLogs.find((l) => l.habitId === habit.id && l.date === todayKey())?.completed ? <><Check size={13} /> Done today</> : 'Mark complete'}</button>
                <button onClick={() => deleteHabit(habit.id)} className="text-text-tertiary hover:text-danger transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-5">
              <div className="flex-1"><div className="flex gap-1 flex-wrap">{keys.map((key) => <button key={key} title={key} onClick={() => toggleHabit(habit.id, key)} className={cx('w-3.5 h-3.5 rounded-sm transition-colors', habitLogs.find((l) => l.habitId === habit.id && l.date === key)?.completed ? 'bg-success' : 'bg-bg-hover hover:bg-border')} />)}</div><div className="flex justify-between text-2xs text-text-tertiary mt-2"><span>30 days ago</span><span>Today</span></div></div>
              <div className="text-right pl-4 border-l border-border-subtle"><div className="text-lg font-semibold">{current}</div><div className="text-2xs text-text-tertiary">day streak</div></div>
            </div>
          </div>;
        })}
      </div>
    )}
    {showAdd && <HabitModal onClose={() => setShowAdd(false)} onAdd={(name) => { addHabit({ name, icon: 'BookOpen', color: 'success' }); setShowAdd(false); }} />}
  </PageShell>;
}

function HabitModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return <Modal onClose={onClose} title="Add habit" maxWidth="max-w-sm">
    <div><label className="label">Habit name</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Practice Spanish" className="input" /></div>
    <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={onClose}>Cancel</button><button disabled={!name.trim()} className="btn-primary" onClick={() => onAdd(name)}>Add habit</button></div>
  </Modal>;
}

// ============ SLEEP ============
function Sleep() {
  const { sleepEntries, addSleepEntry } = useApp();
  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [date, setDate] = useState(todayKey());
  const avg = sleepEntries.length ? Math.round(sleepEntries.reduce((a, e) => a + e.durationMinutes, 0) / sleepEntries.length) : 0;
  const lastNight = sleepEntries.find((e) => e.date === todayKey());
  const days = lastNDays(7);
  const trend = days.map((d) => sleepEntries.find((e) => e.date === d)?.durationMinutes ?? 0);
  const hasData = sleepEntries.length > 0;

  return <PageShell title="Sleep" subtitle="Rest is part of the plan.">
    {!hasData ? (
      <EmptyState icon={Moon} title="No sleep data yet" description="Log your first night of sleep to start tracking your rest patterns." action={<div className="card p-5 max-w-sm mx-auto text-left"><div className="space-y-4"><div><label className="label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Sleep time</label><input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="input" /></div><div><label className="label">Wake time</label><input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="input" /></div></div><button onClick={() => addSleepEntry({ date, sleepTime, wakeTime })} className="btn-primary w-full"><Plus size={14} /> Save sleep entry</button></div></div>} />
    ) : (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
          <MetricCard icon={Moon} label="Average sleep" value={formatDuration(avg)} detail={`over ${sleepEntries.length} nights`} tone="success" />
          <MetricCard icon={AlarmClock} label="Last night" value={lastNight ? formatDuration(lastNight.durationMinutes) : '—'} detail={lastNight ? formatDateLongFromKey(lastNight.date) : 'Not logged yet'} />
          <MetricCard icon={TrendingUp} label="Entries logged" value={String(sleepEntries.length)} detail="total nights" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="card p-5 xl:col-span-3"><SectionLabel>Weekly sleep trend</SectionLabel><MiniBarChart data={trend} labels={days.map(formatDayName)} color="#58a6ff" height={220} /></div>
          <div className="card p-5 xl:col-span-2"><SectionLabel>Log sleep</SectionLabel><div className="space-y-4 mt-4"><div><label className="label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Sleep time</label><input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="input" /></div><div><label className="label">Wake time</label><input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="input" /></div></div><button onClick={() => addSleepEntry({ date, sleepTime, wakeTime })} className="btn-primary w-full"><Plus size={14} /> Save sleep entry</button></div></div>
          <div className="card p-5 xl:col-span-3"><SectionLabel>Recent entries</SectionLabel><div className="divide-y divide-border-subtle">{sleepEntries.slice(0, 7).map((entry) => <div key={entry.id} className="py-3 flex items-center justify-between"><span className="text-sm text-text-primary">{formatDateLongFromKey(entry.date)}</span><span className="text-sm text-text-secondary">{formatDuration(entry.durationMinutes)}</span><span className="text-xs text-text-tertiary">{formatTime12(entry.sleepTime)} — {formatTime12(entry.wakeTime)}</span></div>)}</div></div>
          <div className="card p-5 xl:col-span-2"><SectionLabel>Study & sleep</SectionLabel><div className="flex gap-3 mt-4"><span className="w-7 h-7 rounded bg-info-bg text-info flex items-center justify-center shrink-0"><Sparkles size={14} /></span><p className="text-xs text-text-secondary leading-relaxed">Your sleep and study correlation insights will appear here once you have enough data.</p></div></div>
        </div>
      </>
    )}
  </PageShell>;
}

// ============ GOALS ============
function Goals() {
  const { settings, updateSettings, studySessions, tasks } = useApp();
  const goals = settings.goals;
  const todayMinutes = studySessions.filter((s) => s.date === todayKey()).reduce((a, s) => a + s.durationMinutes, 0);
  const weekMinutes = studySessions.filter((s) => lastNDays(7).includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  const monthMinutes = studySessions.filter((s) => s.date.slice(0, 7) === todayKey().slice(0, 7)).reduce((a, s) => a + s.durationMinutes, 0);
  const completionPct = tasks.length ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0;
  const cards: Array<[string, number, number, string]> = [
    ['Daily Study Goal', todayMinutes, goals.dailyStudyMinutes, 'day'],
    ['Weekly Goal', weekMinutes, goals.weeklyStudyMinutes, 'week'],
    ['Monthly Goal', monthMinutes, goals.monthlyStudyMinutes, 'month'],
    ['Task Completion Goal', completionPct, goals.taskCompletionPercent, 'completion'],
  ];

  return <PageShell title="Goals" subtitle="Make progress visible and actionable.">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map(([label, current, goal, unit]) => <div key={label} className="card p-5">
        <div className="flex items-start justify-between"><div><div className="text-sm font-medium">{label}</div><div className="text-xs text-text-tertiary mt-1">{unit === 'completion' ? `${Math.round(current)}% completed` : `${formatDuration(current)} of ${formatDuration(goal)}`}</div></div><Target size={17} className="text-text-tertiary" /></div>
        <div className="mt-5"><ProgressBar value={goal > 0 ? (current / goal) * 100 : 0} /></div>
        <div className="flex justify-between mt-3 text-2xs"><span className="text-success">{Math.round(Math.min(100, goal > 0 ? (current / goal) * 100 : 0))}% complete</span><span className="text-text-tertiary">{unit === 'completion' ? `${goal}% target` : `${formatDuration(Math.max(0, goal - current))} remaining`}</span></div>
      </div>)}
    </div>
    <div className="card p-5 mt-5"><SectionLabel>Adjust goals</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        {[['dailyStudyMinutes','Daily goal','minutes'],['weeklyStudyMinutes','Weekly goal','minutes'],['monthlyStudyMinutes','Monthly goal','minutes'],['taskCompletionPercent','Task completion','percent']].map(([key,label,unit]) => <div key={key}><label className="label">{label}</label><div className="flex items-center gap-2"><input type="number" className="input" value={goals[key as keyof typeof goals]} onChange={(e) => updateSettings((s) => ({ ...s, goals: { ...s.goals, [key]: Number(e.target.value) } }))} /><span className="text-xs text-text-tertiary">{unit}</span></div></div>)}
      </div>
    </div>
  </PageShell>;
}

// ============ SETTINGS ============
function SettingsPage() {
  const { settings, updateSettings, subjects, addSubject, updateSubject, deleteSubject, clearAllData } = useApp();
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return <PageShell title="Settings" subtitle="Make StudyFlow work for you.">
    <div className="max-w-3xl space-y-4">
      <SettingGroup title="Timer" icon={Timer}>
        <SettingRow label="Focus duration" description="Length of each focus session"><NumberControl value={settings.timer.focusMinutes} onChange={(v) => updateSettings((s) => ({ ...s, timer: { ...s.timer, focusMinutes: v } }))} suffix="min" /></SettingRow>
        <SettingRow label="Short break" description="Between focus sessions"><NumberControl value={settings.timer.shortBreakMinutes} onChange={(v) => updateSettings((s) => ({ ...s, timer: { ...s.timer, shortBreakMinutes: v } }))} suffix="min" /></SettingRow>
        <SettingRow label="Long break" description="After a completed cycle"><NumberControl value={settings.timer.longBreakMinutes} onChange={(v) => updateSettings((s) => ({ ...s, timer: { ...s.timer, longBreakMinutes: v } }))} suffix="min" /></SettingRow>
        <SettingRow label="Long break interval" description="Focus sessions before a long break"><NumberControl value={settings.timer.longBreakInterval} onChange={(v) => updateSettings((s) => ({ ...s, timer: { ...s.timer, longBreakInterval: v } }))} suffix="sessions" /></SettingRow>
      </SettingGroup>

      <SettingGroup title="Manage Subjects" icon={BookPlus}>
        <div className="px-5 py-4">
          {subjects.length === 0 ? (
            <p className="text-sm text-text-tertiary mb-4">No subjects yet. Create one to organize your tasks and study sessions.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {subjects.map((subject) => {
                const Icon = getSubjectIcon(subject.icon);
                const color = getSubjectColor(subject.color);
                return <div key={subject.id} className="flex items-center gap-3 py-2 px-3 bg-bg-base border border-border-subtle rounded-md">
                  <Icon size={16} style={{ color }} />
                  <span className="text-sm text-text-primary flex-1">{subject.name}</span>
                  <button onClick={() => { setEditSubject(subject); setShowSubjectModal(true); }} className="text-text-tertiary hover:text-text-primary"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteSubjectTarget(subject)} className="text-text-tertiary hover:text-danger"><Trash2 size={14} /></button>
                </div>;
              })}
            </div>
          )}
          <button onClick={() => { setEditSubject(null); setShowSubjectModal(true); }} className="btn-secondary text-xs"><Plus size={14} /> Add subject</button>
        </div>
      </SettingGroup>

      <SettingGroup title="Notifications" icon={AlarmClock}>
        <SettingRow label="Completion sound" description="Play a sound when a timer finishes"><Toggle checked={settings.soundEnabled} onChange={() => updateSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))} /></SettingRow>
        <SettingRow label="Timer notifications" description="Show reminders when a session ends"><Toggle checked={settings.notificationsEnabled} onChange={() => updateSettings((s) => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))} /></SettingRow>
      </SettingGroup>

      <SettingGroup title="Data" icon={SlidersHorizontal}>
        <SettingRow label="Clear all data" description="Remove all tasks, sessions, habits, and sleep entries"><button onClick={() => setShowClearConfirm(true)} className="btn-secondary text-xs text-danger"><RotateCcw size={13} /> Clear data</button></SettingRow>
      </SettingGroup>
    </div>

    {showSubjectModal && <SubjectModal onClose={() => { setShowSubjectModal(false); setEditSubject(null); }} editSubject={editSubject} onSubmit={(data) => { if (editSubject) { updateSubject(editSubject.id, data); } else { addSubject(data); } setShowSubjectModal(false); setEditSubject(null); }} />}
    {deleteSubjectTarget && <DeleteSubjectModal subject={deleteSubjectTarget} subjects={subjects} onClose={() => setDeleteSubjectTarget(null)} onConfirm={(reassignTo) => { deleteSubject(deleteSubjectTarget.id, reassignTo); setDeleteSubjectTarget(null); }} />}
    {showClearConfirm && <ConfirmModal title="Clear all data?" description="This will permanently remove all your tasks, study sessions, habits, and sleep entries. This cannot be undone." confirmLabel="Clear everything" onConfirm={() => { clearAllData(); setShowClearConfirm(false); }} onClose={() => setShowClearConfirm(false)} />}
  </PageShell>;
}

function SubjectModal({ onClose, editSubject, onSubmit }: { onClose: () => void; editSubject: Subject | null; onSubmit: (data: Omit<Subject, 'id'>) => void }) {
  const [name, setName] = useState(editSubject?.name ?? '');
  const [icon, setIcon] = useState(editSubject?.icon ?? 'BookOpen');
  const [color, setColor] = useState(editSubject?.color ?? 'success');
  const iconEntries = Object.entries(SUBJECT_ICONS);

  return <Modal onClose={onClose} title={editSubject ? 'Edit subject' : 'Add subject'} maxWidth="max-w-md">
    <div className="space-y-4">
      <div><label className="label">Subject name</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" className="input" /></div>
      <div><label className="label">Icon</label><div className="grid grid-cols-8 gap-2">{iconEntries.map(([key, Icon]) => <button key={key} onClick={() => setIcon(key)} className={cx('w-9 h-9 rounded-md flex items-center justify-center transition-colors', icon === key ? 'bg-bg-hover text-text-primary border border-border' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary')}><Icon size={16} /></button>)}</div></div>
      <div><label className="label">Accent color</label><div className="flex gap-2 flex-wrap">{COLOR_KEYS.map((key) => <button key={key} onClick={() => setColor(key)} className={cx('w-7 h-7 rounded-full transition-transform', color === key && 'ring-2 ring-offset-2 ring-offset-bg-elevated')} style={{ backgroundColor: getSubjectColor(key) }} />)}</div></div>
    </div>
    <div className="flex gap-2 justify-end mt-7"><button onClick={onClose} className="btn-ghost">Cancel</button><button disabled={!name.trim()} onClick={() => onSubmit({ name, icon, color })} className="btn-primary">{editSubject ? 'Save' : 'Add subject'}</button></div>
  </Modal>;
}

function DeleteSubjectModal({ subject, subjects, onClose, onConfirm }: { subject: Subject; subjects: Subject[]; onClose: () => void; onConfirm: (reassignTo: string | null) => void }) {
  const [choice, setChoice] = useState<'none' | 'reassign'>('none');
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const otherSubjects = subjects.filter((s) => s.id !== subject.id);

  return <Modal onClose={onClose} title={`Delete "${subject.name}"?`} subtitle="This will not delete the tasks associated with this subject. Choose what to do with them." maxWidth="max-w-md">
    <div className="space-y-3">
      <button onClick={() => setChoice('none')} className={cx('w-full text-left p-4 rounded-md border transition-colors', choice === 'none' ? 'border-success bg-success-bg/30' : 'border-border-subtle hover:border-border')}>
        <div className="text-sm text-text-primary font-medium">Move tasks to "No Subject"</div>
        <div className="text-xs text-text-tertiary mt-1">Tasks will remain but without a subject label.</div>
      </button>
      {otherSubjects.length > 0 && (
        <div className={cx('p-4 rounded-md border transition-colors', choice === 'reassign' ? 'border-success bg-success-bg/30' : 'border-border-subtle')}>
          <button onClick={() => { setChoice('reassign'); if (!reassignTo) setReassignTo(otherSubjects[0].id); }} className="w-full text-left">
            <div className="text-sm text-text-primary font-medium">Move tasks to another subject</div>
            <div className="text-xs text-text-tertiary mt-1">Choose a subject to reassign tasks to.</div>
          </button>
          {choice === 'reassign' && <select value={reassignTo ?? ''} onChange={(e) => setReassignTo(e.target.value || null)} className="input mt-3">{otherSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        </div>
      )}
    </div>
    <div className="flex gap-2 justify-end mt-7"><button onClick={onClose} className="btn-ghost">Cancel</button><button onClick={() => onConfirm(choice === 'reassign' ? reassignTo : null)} className="btn-danger">Delete subject</button></div>
  </Modal>;
}

function ConfirmModal({ title, description, confirmLabel, onConfirm, onClose }: { title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return <Modal onClose={onClose} title={title} maxWidth="max-w-sm">
    <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    <div className="flex gap-2 justify-end mt-7"><button onClick={onClose} className="btn-ghost">Cancel</button><button onClick={onConfirm} className="btn-danger">{confirmLabel}</button></div>
  </Modal>;
}

// ============ HELPERS ============
function computeStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  let day = new Date();
  // Allow today to be empty (streak not broken if you haven't studied yet today)
  if (!dates.has(dateKey(day))) {
    day = addDays(day, -1);
  }
  while (dates.has(dateKey(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

function computeWeeklyInsight(sessions: StudySession[]): string {
  const last7 = lastNDays(7);
  const prev7 = lastNDays(14).slice(0, 7);
  const recent = sessions.filter((s) => last7.includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  const prev = sessions.filter((s) => prev7.includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  if (prev === 0 && recent > 0) return 'You have started building a study habit this week. Keep going.';
  if (recent === 0) return 'No study time logged this week yet. Start a session to build momentum.';
  const pct = Math.round(((recent - prev) / prev) * 100);
  if (pct > 5) return `You're studying ${pct}% more this week than last week.`;
  if (pct < -5) return `You're studying ${Math.abs(pct)}% less this week than last week. Try a short session today.`;
  return 'Your study time is consistent with last week. Steady progress.';
}

function computeAnalyticsInsights(sessions: StudySession[], tasks: Task[]): string[] {
  const insights: string[] = [];
  if (sessions.length < 7) {
    insights.push('Keep logging sessions — your first meaningful insights will appear after a week of data.');
    return insights;
  }
  const last7 = lastNDays(7);
  const prev7 = lastNDays(14).slice(0, 7);
  const recent = sessions.filter((s) => last7.includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  const prev = sessions.filter((s) => prev7.includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  if (prev > 0) {
    const pct = Math.round(((recent - prev) / prev) * 100);
    if (pct > 5) insights.push(`Your average study time increased ${pct}% compared with the previous 7 days.`);
    else if (pct < -5) insights.push(`Your study time decreased ${Math.abs(pct)}% compared with the previous 7 days.`);
  }
  // Task completion correlation with study time
  const taskDays = tasks.filter((t) => t.dueDate);
  if (taskDays.length > 5) {
    const studiedDays = new Set(sessions.map((s) => s.date));
    const completedOnStudyDays = tasks.filter((t) => t.completed && studiedDays.has(t.dueDate)).length;
    const completedOnNonStudyDays = tasks.filter((t) => t.completed && !studiedDays.has(t.dueDate)).length;
    const totalStudyDayTasks = tasks.filter((t) => studiedDays.has(t.dueDate)).length;
    const totalNonStudyDayTasks = tasks.filter((t) => !studiedDays.has(t.dueDate)).length;
    if (totalStudyDayTasks > 0 && totalNonStudyDayTasks > 0) {
      const studyDayRate = completedOnStudyDays / totalStudyDayTasks;
      const nonStudyDayRate = completedOnNonStudyDays / totalNonStudyDayTasks;
      if (studyDayRate > nonStudyDayRate + 0.1) {
        insights.push('You complete more tasks on days when you study for at least one session.');
      }
    }
  }
  // Consistency insight
  const dayOfWeekCounts = new Map<string, number>();
  sessions.forEach((s) => {
    const dow = new Date(s.date).getDay().toString();
    dayOfWeekCounts.set(dow, (dayOfWeekCounts.get(dow) ?? 0) + 1);
  });
  if (dayOfWeekCounts.size >= 3) {
    const weekdayCount = [1,2,3,4].reduce((a, d) => a + (dayOfWeekCounts.get(d.toString()) ?? 0), 0);
    const weekendCount = [0,5,6].reduce((a, d) => a + (dayOfWeekCounts.get(d.toString()) ?? 0), 0);
    if (weekdayCount > weekendCount * 1.5) {
      insights.push('You are most consistent between Monday and Thursday.');
    }
  }
  if (insights.length === 0) insights.push('Your data is building up. More insights will appear as patterns emerge.');
  return insights;
}

// ============ APP ============
function App() {
  const { currentPage, setCurrentPage } = useApp();
  const renderPage = () => {
    switch (currentPage) {
      case 'focus': return <Focus />;
      case 'tasks': return <Tasks />;
      case 'calendar': return <CalendarPage />;
      case 'analytics': return <Analytics />;
      case 'habits': return <Habits />;
      case 'sleep': return <Sleep />;
      case 'goals': return <Goals />;
      case 'lectures': return <LecturesPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };
  return <>
    <Sidebar />
    {renderPage()}
    <div className="fixed bottom-0 left-0 right-0 lg:hidden h-16 bg-bg-surface border-t border-border-subtle flex items-center justify-around z-20">
      {navItems.slice(0, 5).map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setCurrentPage(key)} className={cx('flex flex-col items-center gap-1 px-3 py-1 text-2xs', currentPage === key ? 'text-success' : 'text-text-tertiary')}><Icon size={17} /><span>{label}</span></button>)}
    </div>
  </>;
}

export default App;
