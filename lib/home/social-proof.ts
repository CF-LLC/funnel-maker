// Homepage social proof slot. Leave EMPTY until there are real, verifiable numbers or real testimonials
// (with the customer's permission). Nothing here may be invented; the slot renders nothing while empty.
export interface ProofStat { value: string; label: string; source: string }
export interface ProofQuote { quote: string; name: string; role?: string; permissionNote: string }
export interface SocialProof { stats: ProofStat[]; quotes: ProofQuote[] }

export const SOCIAL_PROOF: SocialProof = { stats: [], quotes: [] }
