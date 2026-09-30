import type { Subject } from '@/types';
import {
  Atom, BookOpen, Calculator, Code, Dna, FlaskConical, Globe, GraduationCap,
  Languages, Music, Palette, Pencil, Brain, Leaf, HeartPulse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Calculator,
  FlaskConical,
  Dna,
  Globe,
  Code,
  Languages,
  Music,
  Palette,
  Pencil,
  GraduationCap,
  Brain,
  Leaf,
  HeartPulse,
  Atom,
};

export const SUBJECT_COLORS: Record<string, string> = {
  success: '#3fb950',
  info: '#58a6ff',
  warning: '#d29922',
  danger: '#f85149',
  violet: '#a371f7',
  cyan: '#39c5cf',
  pink: '#db61a2',
  orange: '#e8873c',
};

export const COLOR_KEYS = Object.keys(SUBJECT_COLORS);

export function getSubjectIcon(iconName: string): LucideIcon {
  return SUBJECT_ICONS[iconName] ?? BookOpen;
}

export function getSubjectColor(colorKey: string): string {
  return SUBJECT_COLORS[colorKey] ?? SUBJECT_COLORS.success;
}

export function getSubjectById(subjects: Subject[], id: string | null): Subject | null {
  if (!id) return null;
  return subjects.find((s) => s.id === id) ?? null;
}

export function getSubjectName(subjects: Subject[], id: string | null): string {
  const subject = getSubjectById(subjects, id);
  return subject?.name ?? 'No Subject';
}
