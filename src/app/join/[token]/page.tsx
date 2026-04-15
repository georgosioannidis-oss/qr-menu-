import { prisma } from "@/lib/prisma";
import { isStaffInviteRole } from "@/lib/dashboard-roles";
import { JoinStaffForm } from "./JoinStaffForm";

export const dynamic = "force-dynamic";

export default async function JoinStaffPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = raw?.trim().toLowerCase() ?? "";
  const invite =
    token.length > 0
      ? await prisma.staffInvite.findUnique({
          where: { token },
          include: { restaurant: { select: { name: true } } },
        })
      : null;

  const now = new Date();
  const valid =
    invite && !invite.usedAt && invite.expiresAt > now && isStaffInviteRole(invite.role);

  if (!valid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
        <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-xl font-bold leading-tight text-neutral-900 sm:text-lg">Link not valid</h1>
          <p className="mb-6 text-base leading-relaxed text-neutral-600 sm:text-sm">
            This invite may have expired, already been used, or the link is incorrect. Ask your manager for a
            new invite from Office.
          </p>
          <a
            href="/dashboard/login"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#C15C2A] px-4 py-2.5 text-base font-semibold text-white hover:opacity-95 sm:min-h-0 sm:text-sm"
          >
            Go to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <JoinStaffForm
      token={token}
      restaurantName={invite!.restaurant.name}
      inviteRole={invite!.role}
      invitePermissions={invite!.permissions}
    />
  );
}
