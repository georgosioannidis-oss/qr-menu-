import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image file sent" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, GIF or WebP image" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Image must be under 2 MB" },
      { status: 400 }
    );
  }

  const ext =
    file.type === "image/jpeg"
      ? ".jpg"
      : file.type === "image/png"
      ? ".png"
      : file.type === "image/gif"
      ? ".gif"
      : ".webp";

  const filename = `${restaurantId}-${Date.now()}${ext}`;

  try {
    const dir = path.join(process.cwd(), "public", "item-images");
    await mkdir(dir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);
  } catch (e) {
    console.error("Item image upload:", e);
    return NextResponse.json(
      { error: "Could not save image" },
      { status: 500 }
    );
  }

  const imageUrl = `/item-images/${filename}`;
  /* Note: files under public/ persist on your machine and typical VPS deploys, but not on
   * ephemeral serverless disks (e.g. Vercel) — use blob/S3 storage in production if uploads 404. */
  return NextResponse.json({ imageUrl });
}

