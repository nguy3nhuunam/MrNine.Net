import { PhotoFixShell } from "@/components/PhotoFixShell";

const og = "/api/og?title=Photo%20Fix&subtitle=t%C3%A1ch%20n%E1%BB%81n%20%C2%B7%20l%C3%A0m%20n%C3%A9t%20%C2%B7%20%C4%91%E1%BB%95i%20n%E1%BB%81n&accent=amber";

export const metadata = {
  title: "Photo Fix — tách nền, làm nét, đổi nền",
  description: "Tách nền, làm nét, đổi nền và phục hồi khuôn mặt cho ảnh có sẵn.",
  openGraph: {
    title: "Photo Fix — tách nền, làm nét, đổi nền",
    description: "Restore, replace background, sửa khuôn mặt.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Photo Fix", description: "Restore, replace background, fix face.", images: [og] },
};

export default function PhotoFixPage() {
  return <PhotoFixShell />;
}
