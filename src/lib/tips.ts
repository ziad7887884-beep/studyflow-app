export const STUDY_TIPS: string[] = [
  'One focused session is more valuable than an hour of distracted studying.',
  'Review your notes within 24 hours of learning to strengthen retention.',
  'Break complex topics into smaller pieces — your brain remembers structure better than detail.',
  'Teaching a concept to someone else is one of the fastest ways to find your own gaps.',
  'Spaced repetition beats cramming — short sessions across days outperform long marathons.',
  'If you are stuck on a problem for more than 10 minutes, move on and come back to it later.',
  'Active recall — testing yourself — is more effective than re-reading the same material.',
  'Switching subjects between sessions can keep your mind fresher than grinding one topic.',
  'A short walk after studying helps consolidate what you just learned.',
  'Write down what you learned in your own words — if you cannot, you do not understand it yet.',
];

export function getRandomTip(): string {
  return STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
}
