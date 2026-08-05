// Client-side copy of the one sentence describing the phase-1 first-time password
// rule. Kept as a string constant rather than imported from the server, because
// server/src is not in the client's build graph — the rule itself lives in
// server/src/services/activation.ts and is implemented only there.
export const DEFAULT_PASSWORD_RULE =
  'Their full name with no spaces or punctuation, each part capitalised, then 123! — for example Steven Miller signs in with StevenMiller123!';
