import { ProfileShell } from "@/components/ProfileShell";

export const metadata = {
  title: "Profile · MrNine",
  description: "Quản lý tài khoản, credits và lịch sử dùng MrNine.",
};

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileShell />;
}
