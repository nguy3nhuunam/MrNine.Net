import { ProfileShell } from "@/components/ProfileShell";

export const metadata = {
  title: "Profile — credits & history",
  description: "Quản lý tài khoản, credits và lịch sử dùng MrNine.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileShell />;
}
