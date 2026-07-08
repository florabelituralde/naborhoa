// Shared logic for the HOA AI assistant's "no answer" detection.
// Used by both the in-app AIChatBubble and the public GuestChat so the
// contact-the-HOA fallback triggers consistently whenever the assistant
// cannot ground an answer in a specific document/section.

// The canonical phrase the prompt instructs the assistant to use when it
// cannot cite a document/section. Kept in sync with the prompt rules.
export const NO_ANSWER_MARKER = "i can send this inquiry to the hoa admin for further clarification";

// Phrases the assistant uses when it cannot fully answer from the docs and
// offers to escalate to the HOA admin. Detecting these (not just the exact
// marker) makes the contact-the-HOA fallback trigger reliably even if the
// model paraphrases the offer.
const REFUSAL_PHRASES = [
  "i can send this inquiry to the hoa admin",
  "send this inquiry to the hoa admin",
  "hoa admin for further clarification",
  "i don't have that information",
  "please contact your hoa",
  "contact your hoa board",
  "not in the community's official documents",
  "not stated in",
  "i couldn't find",
  "i could not find",
  "no information in",
  "is not covered in",
  "not found in the",
];

// Returns true when the assistant's reply indicates it could not cite a
// specific document/section to answer the question.
export function isUnanswered(content) {
  const c = (content || "").toLowerCase();
  if (!c.trim()) return true;
  return REFUSAL_PHRASES.some((p) => c.includes(p));
}