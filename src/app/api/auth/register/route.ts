import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/env";
import { createFounderEligibleUser } from "@/lib/founders";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(40)
});

export async function POST(request: Request) {
  const body = registerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const email = body.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  const user = await createFounderEligibleUser({
    email,
    username: email.split("@")[0],
    displayName: body.data.displayName,
    passwordHash: await bcrypt.hash(body.data.password, 12),
    role: isAdminEmail(email) ? "ADMIN" : "USER"
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      founderNumber: user.founderNumber,
      kingdomUnlockedAt: user.kingdomUnlockedAt
    }
  }, { status: 201 });
}
