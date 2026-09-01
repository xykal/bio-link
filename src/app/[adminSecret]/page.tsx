import { notFound } from "next/navigation";
import AdminPanel from "./AdminPanel";
import { ADMIN_SECRET_PATH } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminEntry({
  params,
}: {
  params: Promise<{ adminSecret: string }>;
}) {
  const { adminSecret } = await params;
  // Only render when the path segment matches the hashed secret;
  // any other random path returns a 404 so the admin UI is never exposed.
  if (adminSecret !== ADMIN_SECRET_PATH) notFound();

  return <AdminPanel />;
}
