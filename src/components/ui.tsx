import type { ReactNode } from 'react';
import { BookOpen, Check, Pencil, Trash2, X, Forward, type LucideIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDateLongFromKey, formatDuration, formatDurationShort, lastNDays } from '@/lib/datetime';
import { getSubjectColor, getSubjectIcon, getSubjectName } from '@/lib/subjects';
import { formatTime12 } from '@/lib/format';
import type { Task } from '@/types';

export function cx(...classes: Array<string | false | undefined>) { return classes.filter(Boolean).join(' '); }

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="flex items-center justify-between mb-3"><h2 className="text-xs uppercase tracking-widest font-medium text-text-tertiary">{children}</h2>{action}</div>;
}

export function MetricCard({ icon: Icon, label, value, detail, tone = 'default' }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: 'default' | 'success' | 'warning' }) {
  return <div className="card p-4 sm:p-5 hover:border-border-strong transition-colors"><div className="flex items-start justify-between"><span className="text-xs text-text-secondary">{label}</span><span className={cx('w-7 h-7 rounded-md flex items-center justify-center', tone === 'success' ? 'bg-success-bg text-success' : tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-bg-hover text-text-secondary')}><Icon size={15} /></span></div><div className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">{value}</div><div className="text-2xs text-text-tertiary mt-1">{detail}</div></div>;
}

export function ProgressBar({ value, className = '', color = 'bg-success' }: { value: number; className?: string; color?: string }) {
  return <div className={cx('h-1.5 rounded-full bg-bg-hover overflow-hidden', className)}><div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Ring({ value, label, sublabel, size = 112, color = '#3fb950' }: { value: number; label: string; sublabel: string; size?: number; color?: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#25252d" strokeWidth="7" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (circ * Math.min(100, value)) / 100} className="transition-all duration-700" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-xl font-semibold">{label}</div><div className="text-2xs text-text-tertiary">{sublabel}</div></div></div>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="card py-12 px-6 text-center"><div className="w-10 h-10 rounded-lg bg-bg-hover text-text-secondary flex items-center justify-center mx-auto mb-4"><Icon size={19} /></div><h3 className="text-sm font-medium text-text-primary">{title}</h3><p className="text-xs text-text-tertiary max-w-xs mx-auto mt-2 leading-relaxed">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function MiniBarChart({ data, labels, color = '#3fb950', height = 150 }: { data: number[]; labels: string[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return <div><div className="flex items-end gap-2 sm:gap-3" style={{ height }}><div className="flex flex-col justify-between h-full text-2xs text-text-tertiary pr-1"><span>{formatDurationShort(max)}</span><span>{formatDurationShort(Math.round(max / 2))}</span><span>0m</span></div><div className="flex items-end justify-between gap-1.5 sm:gap-3 flex-1 h-full border-b border-border-subtle">{data.map((v, i) => <div key={i} className="flex-1 h-full flex items-end group relative"><div className="w-full rounded-t-sm transition-all duration-500 group-hover:opacity-80" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v ? 4 : 0 }} /><div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-elevated border border-border rounded px-1.5 py-1 text-2xs whitespace-nowrap z-10">{formatDuration(v)}</div></div>)}</div></div><div className="flex pl-8 mt-2 justify-between text-2xs text-text-tertiary">{labels.map((l) => <span key={l}>{l}</span>)}</div></div>;
}

export function Heatmap() {
  const keys = lastNDays(35);
  const { studySessions, setCurrentPage } = useApp();
  const values = keys.map((key) => studySessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.durationMinutes, 0));
  const level = (v: number) => v === 0 ? 'bg-heat-0' : v <= 30 ? 'bg-heat-1' : v <= 60 ? 'bg-heat-2' : v <= 120 ? 'bg-heat-3' : 'bg-heat-4';
  return <div><div className="flex gap-1.5 flex-wrap">{keys.map((key, i) => <button key={key} title={`${formatDateLongFromKey(key)} · ${formatDuration(values[i])}`} onClick={() => setCurrentPage('calendar')} className={cx('w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm hover:ring-2 hover:ring-text-secondary/30 transition-all', level(values[i]))} />)}</div><div className="flex items-center gap-3 mt-4 text-2xs text-text-tertiary"><span>Less</span>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={cx('w-3.5 h-3.5 rounded-sm', `bg-heat-${i}`)} />)}<span>More</span></div></div>;
}

export function TaskRow({ task, compact = false, onToggle, onDelete, onEdit, onPostpone }: { task: Task; compact?: boolean; onToggle: () => void; onDelete?: () => void; onEdit?: () => void; onPostpone?: () => void }) {
  const { subjects } = useApp();
  const subjectName = getSubjectName(subjects, task.subjectId);
  const subject = subjects.find((s) => s.id === task.subjectId);
  const SubjectIcon = subject ? getSubjectIcon(subject.icon) : BookOpen;
  const subjectColor = subject ? getSubjectColor(subject.color) : '#62626d';
  return <div className={cx('flex items-center gap-3 group', compact ? 'py-3' : 'py-4')}><button onClick={onToggle} className={cx('w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors', task.completed ? 'bg-success border-success text-bg-base' : 'border-border-strong hover:border-success')}>{task.completed && <span className="text-bg-base"><Check size={11} strokeWidth={3} /></span>}</button><div className="min-w-0 flex-1"><div className={cx('text-sm truncate', task.completed ? 'text-text-tertiary line-through' : 'text-text-primary')}>{task.title}</div><div className="flex items-center gap-2 mt-1 text-2xs text-text-tertiary"><span className="flex items-center gap-1"><SubjectIcon size={11} style={{ color: subjectColor }} />{subjectName}</span>{task.source && task.source !== 'manual' && <><span className="w-0.5 h-0.5 rounded-full bg-text-tertiary" /><span>{task.source}</span></>}<span className="w-0.5 h-0.5 rounded-full bg-text-tertiary" /><span className={cx(task.priority === 'high' ? 'text-danger' : task.priority === 'medium' ? 'text-warning' : 'text-text-tertiary')}>{task.priority}</span><span className="w-0.5 h-0.5 rounded-full bg-text-tertiary" /><span>{task.estimatedMinutes} min</span></div></div>{task.dueTime && <span className="text-2xs text-text-tertiary">{formatTime12(task.dueTime)}</span>}{onPostpone && !task.completed && <button title="Postpone one day" onClick={onPostpone} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-primary transition-all"><Forward size={14} /></button>}{onEdit && <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-primary transition-all"><Pencil size={14} /></button>}{onDelete && <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all"><Trash2 size={14} /></button>}</div>;
}

export function Modal({ onClose, children, title, subtitle, maxWidth = 'max-w-md' }: { onClose: () => void; children: ReactNode; title: string; subtitle?: string; maxWidth?: string }) {
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}><div className={cx('card-elevated w-full p-6 animate-scale-in', maxWidth)} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-semibold">{title}</h2>{subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}</div><button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={18} /></button></div>{children}</div></div>;
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button onClick={onChange} className={cx('w-9 h-5 rounded-full p-0.5 transition-colors', checked ? 'bg-success' : 'bg-bg-hover border border-border')}><span className={cx('block w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} /></button>;
}

export function NumberControl({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div className="flex items-center gap-2"><input type="number" min="1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="input w-20 text-right" /><span className="text-xs text-text-tertiary w-16">{suffix}</span></div>;
}

export function SettingGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <div className="card"><div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2"><Icon size={15} className="text-text-tertiary" /><h2 className="text-sm font-medium">{title}</h2></div><div className="divide-y divide-border-subtle">{children}</div></div>;
}

export function SettingRow({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return <div className="px-5 py-4 flex items-center justify-between gap-4"><div><div className="text-sm text-text-primary">{label}</div><div className="text-xs text-text-tertiary mt-1">{description}</div></div>{children}</div>;
}
