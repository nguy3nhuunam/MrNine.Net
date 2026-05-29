import { PlaygroundClient } from "@/components/dashboard/PlaygroundClient";
import { requireUser } from "@/lib/pg/session";

export const metadata = { title: "Playground · MrNine" };
export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API Playground</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Gọi thẳng gateway từ trình duyệt với key của bạn. Browser →{" "}
          <code className="text-[#dff8e4]">api.mrnine.net</code> trực tiếp, không proxy qua dashboard.
        </p>
      </div>
      <PlaygroundClient />
    </div>
  );
}
