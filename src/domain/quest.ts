export type QuestKind = 'revision' | 'practice' | 'writing' | 'presentation' | 'project' | 'exam' | 'custom';

const RULES: [QuestKind, RegExp][] = [
  ['presentation', /present|slides|speech|talk|pitch/i],
  ['exam', /exam|test|quiz|finals|midterm/i],
  ['practice', /practi[cs]e|problem|exercise|worksheet|questions|sums|homework/i],
  ['writing', /essay|write|writing|report|article|letter|summary|assignment/i],
  ['project', /project|model|build|experiment|lab/i],
  ['revision', /revis|chapter|study|read|learn|review|notes/i],
];

export const QUEST_LABEL: Record<QuestKind, string> = {
  revision: 'Chapter revision',
  practice: 'Problem practice',
  writing: 'Written work',
  presentation: 'Presentation',
  project: 'Project',
  exam: 'Exam prep',
  custom: 'Custom quest',
};

export function detectKind(title: string): QuestKind {
  for (const [kind, re] of RULES) if (re.test(title)) return kind;
  return 'custom';
}

/** Strips leading verbs so steps read naturally: "Revise Chemistry Equilibrium" → "Chemistry Equilibrium". */
export function topicOf(title: string): string {
  const t = title.replace(/^(revise|study|prepare( for)?|write|finish|complete|do|practi[cs]e|read|learn|review|make|build)\s+(an?\s+|the\s+|my\s+)?/i, '').trim();
  return t || title;
}

export function questSteps(title: string, kind = detectKind(title)): string[] {
  const topic = topicOf(title);
  switch (kind) {
    case 'revision':
      return [`Skim ${topic} and list the main concepts`, 'Revise the two most important concepts', 'Write down key formulas or definitions', 'Solve five practice questions', 'Quick self-test from memory'];
    case 'practice':
      return ['Gather the questions and the formulas you need', 'Solve the first three problems', 'Check answers and mark mistakes', 'Redo the ones you got wrong', 'Try two harder problems'];
    case 'writing':
      return [`Decide the main point of ${topic}`, 'Write a five-line outline', 'Draft the first section — rough is fine', 'Finish the full draft', 'Read it aloud and polish'];
    case 'presentation':
      return ['Choose the main argument', 'Write a one-page outline', 'Prepare the slides', 'Rehearse once out loud', 'Review and finalise'];
    case 'project':
      return ['Write down what “done” looks like', 'List materials and resources', 'Build the first small piece', 'Test and fix', 'Prepare the final version'];
    case 'exam':
      return ['List the topics the exam covers', 'Rank them weakest to strongest', 'Revise your weakest topic', 'Do one timed practice section', 'Review mistakes and rest'];
    default:
      return [`Open everything you need for ${topic}`, 'Do the first 10-minute chunk', 'Do the next chunk', 'Check your work', 'Wrap up and note what is left'];
  }
}
