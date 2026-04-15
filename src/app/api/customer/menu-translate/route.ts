import { NextRequest, NextResponse } from "next/server";
import { translateMenuCategories, type MenuCategoryPayload } from "@/lib/translate-menu-categories";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sourceLocale?: string;
      targetLocale?: string;
      categories?: MenuCategoryPayload[];
    };
    const sourceLocale = typeof body.sourceLocale === "string" ? body.sourceLocale : "en";
    const targetLocale = typeof body.targetLocale === "string" ? body.targetLocale : "en";
    const categories = Array.isArray(body.categories) ? body.categories : [];

    if (categories.length > 80) {
      return NextResponse.json({ error: "Too many categories" }, { status: 400 });
    }

    const out = await translateMenuCategories(categories, sourceLocale, targetLocale);
    return NextResponse.json({ categories: out });
  } catch (e) {
    console.error("menu-translate:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
