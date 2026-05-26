import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin · MrNine",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const ok = await isAdminEmail(email);
  if (!ok) redirect("/?login=1&from=/admin");
  return <AdminShell adminEmail={email ?? ""} />;
}
