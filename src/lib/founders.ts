import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";

export const FOUNDER_LIMIT = 10_000;

type SequenceState = {
  lastValue: bigint;
  isCalled: boolean;
};

export async function getFounderAvailability() {
  if (isDemoMode) {
    return { limit: FOUNDER_LIMIT, allocated: 8421, remaining: 1579 };
  }
  try {
    const [state] = await prisma.$queryRaw<SequenceState[]>`
      SELECT last_value AS "lastValue", is_called AS "isCalled"
      FROM founder_number_seq
    `;
    const allocated = state?.isCalled ? Number(state.lastValue) : 0;
    return {
      limit: FOUNDER_LIMIT,
      allocated: Math.min(allocated, FOUNDER_LIMIT),
      remaining: Math.max(FOUNDER_LIMIT - allocated, 0)
    };
  } catch (error) {
    console.error("Founder availability could not be loaded", error);
    return { limit: FOUNDER_LIMIT, allocated: null, remaining: null };
  }
}
