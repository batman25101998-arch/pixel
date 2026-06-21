import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/env";
import { createFounderEligibleUser } from "@/lib/founders";

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  username: z.string().trim().min(3, "Username must be at least 3 characters.").max(40).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.")
});

export async function POST(request: Request) {
  const body = registerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Registration details are invalid." }, { status: 400 });
  }

  const email = body.data.email.toLowerCase();
  const username = body.data.username.trim();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true }
  });
  if (existing?.email.toLowerCase() === email) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }
  if (existing) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  try {
    const user = await createFounderEligibleUser({
      email,
      username,
      displayName: username,
      passwordHash: await bcrypt.hash(body.data.password, 12),
      role: isAdminEmail(email) ? "ADMIN" : "USER"
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        founderNumber: user.founderNumber
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email or username is already registered." }, { status: 409 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Account could not be created." }, { status: 500 });
  }
}
