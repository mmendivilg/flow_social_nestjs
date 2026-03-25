export const CHAT_TYPES = ['dating', 'friends', 'work', 'general'] as const;
export type ChatType = (typeof CHAT_TYPES)[number];

export const SUBMIT_MODES = ['suggest_reply', 'ask_advice'] as const;
export type SubmitMode = (typeof SUBMIT_MODES)[number];

export const ENTRY_MODES = [...SUBMIT_MODES, 'analyze_options'] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];

export const ENTRY_ROLES = ['user_submission', 'assistant_output'] as const;
export type EntryRole = (typeof ENTRY_ROLES)[number];

export const ENTRY_STATUSES = ['success', 'failed'] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const SUGGEST_REPLY_LABELS = ['safe', 'balanced', 'bold'] as const;
export type SuggestReplyLabel = (typeof SUGGEST_REPLY_LABELS)[number];
