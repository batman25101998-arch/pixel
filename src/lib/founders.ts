import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";

export const FOUNDER_LIMIT = 10_000;

export async function createFounderEligibleUser(data: Prisma.UserCreateInput) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const founderCount = await transaction.user.count({
            where: { founderNumber: { not: null } }
          });
          const founderNumber = founderCount + 1;

          return transaction.user.create({
            data: {
              ...data,
              founderNumber: founderNumber <= FOUNDER_LIMIT ? founderNumber : null
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === maxAttempts) throw error;
    }
  }

  throw new Error("User creation could not be completed.");
}

export async function getFounderAvailability() {
  if (isDemoMode) {
    return { limit: FOUNDER_LIMIT, allocated: 8421, remaining: 1579 };
  }

  try {
    const allocated = await prisma.user.count({
      where: { founderNumber: { not: null } }
    });
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
