import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Turn restaurant name into a URL-friendly unique slug (e.g. "Bella Italia" → "bella-italia") */
function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "restaurant";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const restaurantName =
      typeof body.restaurantName === "string" ? body.restaurantName.trim().slice(0, 100) : "";
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!restaurantName || !firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Restaurant name, your first and last name, email, and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.restaurantUser.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    let slug = slugFromName(restaurantName);
    const existingSlug = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).slice(-6)}`;
    }

    const passwordHash = await hash(password, 10);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName,
        slug,
        waiterRelayEnabled: true,
      },
    });

    await prisma.restaurantUser.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: "owner",
        restaurantId: restaurant.id,
      },
    });

    return NextResponse.json(
      {
        message: "Account created. You can sign in now.",
        restaurantId: restaurant.id,
        slug: restaurant.slug,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
