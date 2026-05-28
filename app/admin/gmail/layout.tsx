import { GatewayAdminFrame } from "@/components/admin/GatewayAdminFrame";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <GatewayAdminFrame>{children}</GatewayAdminFrame>;
}
