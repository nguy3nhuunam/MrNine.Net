import { __iconNode as botIconNode } from "lucide-react/dist/esm/icons/bot.mjs";
import { __iconNode as creditCardIconNode } from "lucide-react/dist/esm/icons/credit-card.mjs";
import { __iconNode as headphonesIconNode } from "lucide-react/dist/esm/icons/headphones.mjs";
import { __iconNode as historyIconNode } from "lucide-react/dist/esm/icons/history.mjs";
import { __iconNode as imageIconNode } from "lucide-react/dist/esm/icons/image.mjs";
import { __iconNode as languagesIconNode } from "lucide-react/dist/esm/icons/languages.mjs";
import { __iconNode as penToolIconNode } from "lucide-react/dist/esm/icons/pen-tool.mjs";
import { __iconNode as settingsIconNode } from "lucide-react/dist/esm/icons/settings.mjs";
import { __iconNode as usersIconNode } from "lucide-react/dist/esm/icons/users.mjs";
import { __iconNode as videoIconNode } from "lucide-react/dist/esm/icons/video.mjs";
import { __iconNode as walletIconNode } from "lucide-react/dist/esm/icons/wallet.mjs";

export type IconName =
  | "bot"
  | "credit-card"
  | "headphones"
  | "history"
  | "image"
  | "languages"
  | "pen-tool"
  | "settings"
  | "users"
  | "video"
  | "wallet";

export type IconNode = [string, Record<string, string>][];

export interface ModuleConfig {
  id: string;
  label: string;
  description: string;
  accent: string;
  accentSoft: string;
  metric: string;
  status: string;
  iconName: IconName;
  iconNode: IconNode;
  position: [number, number, number];
}

const HEX_RADIUS = 1.48;
const EDGE_GAP = 0.26;
const HORIZONTAL_GAP_MULTIPLIER = 2;
const CENTER_STEP =
  Math.sqrt(3) * HEX_RADIUS + EDGE_GAP * HORIZONTAL_GAP_MULTIPLIER;
const ROW_STEP = CENTER_STEP * (Math.sqrt(3) / 2);
const MID_Z = -2.04;
const TOP_Z = MID_Z - ROW_STEP;
const BOT_Z = MID_Z + ROW_STEP;

function rowPosition(
  index: number,
  count: number,
  z: number,
  y: number,
): [number, number, number] {
  const start = -((count - 1) * CENTER_STEP) / 2;
  return [start + index * CENTER_STEP, y, z];
}

function accentSoftFromHex(hex: string) {
  const sanitized = hex.replace("#", "");
  const normalized = sanitized.length === 3
    ? sanitized
        .split("")
        .map((part) => part + part)
        .join("")
    : sanitized;
  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

export const aiModules: ModuleConfig[] = [
  {
    id: "ai-viet-noi-dung",
    label: "AI Viết Nội Dung",
    description:
      "Tạo bài viết, kịch bản và nội dung marketing bằng workflow sáng tạo nhiều lớp.",
    accent: "#FF4D6D",
    accentSoft: accentSoftFromHex("#FF4D6D"),
    metric: "Brand tone locked",
    status: "Creative stack",
    iconName: "pen-tool",
    iconNode: penToolIconNode,
    position: rowPosition(0, 4, TOP_Z, 0.36),
  },
  {
    id: "ai-tao-anh",
    label: "AI Tạo Ảnh",
    description:
      "Sinh hình ảnh điện ảnh với pipeline upscale, inpaint và art direction theo thời gian thực.",
    accent: "#FF8A3D",
    accentSoft: accentSoftFromHex("#FF8A3D"),
    metric: "8K ready / 0.7s",
    status: "Visual forge",
    iconName: "image",
    iconNode: imageIconNode,
    position: rowPosition(1, 4, TOP_Z, 0.36),
  },
  {
    id: "ai-tao-video",
    label: "AI Tạo Video",
    description:
      "Dựng video sinh động với motion interpolation, scene synthesis và render pipeline nhiều lớp.",
    accent: "#F6C945",
    accentSoft: accentSoftFromHex("#F6C945"),
    metric: "24fps / 6 stack",
    status: "Cinematic render",
    iconName: "video",
    iconNode: videoIconNode,
    position: rowPosition(2, 4, TOP_Z, 0.36),
  },
  {
    id: "ai-giong-noi",
    label: "AI Giọng Nói",
    description:
      "Điều khiển synthesis nhiều giọng, voice avatar và cloning pipeline với độ trễ thấp.",
    accent: "#A5F63C",
    accentSoft: accentSoftFromHex("#A5F63C"),
    metric: "32 voice / 16kHz",
    status: "Realtime speech",
    iconName: "headphones",
    iconNode: headphonesIconNode,
    position: rowPosition(3, 4, TOP_Z, 0.36),
  },
  {
    id: "dich-thuat",
    label: "AI Dịch Thuật",
    description:
      "Dịch đa ngôn ngữ theo ngữ cảnh với bộ nhớ thuật ngữ và kiểm soát phong cách theo ngành.",
    accent: "#39E58C",
    accentSoft: accentSoftFromHex("#39E58C"),
    metric: "142 locale / 19ms",
    status: "Context aware",
    iconName: "languages",
    iconNode: languagesIconNode,
    position: rowPosition(0, 5, MID_Z, 0.24),
  },
  {
    id: "mua-api",
    label: "Mua API",
    description:
      "Cấp quyền truy cập mô hình, tạo khóa mới và phân phối hạn mức theo workspace.",
    accent: "#18D6C3",
    accentSoft: accentSoftFromHex("#18D6C3"),
    metric: "12 plan / 4 region",
    status: "Commerce ready",
    iconName: "wallet",
    iconNode: walletIconNode,
    position: rowPosition(1, 5, MID_Z, 0.24),
  },
  {
    id: "chat-bot-ai",
    label: "Chat Bot AI",
    description:
      "Điều phối trợ lý hợp nhất, truy xuất tri thức và giám sát tác vụ thời gian thực.",
    accent: "#20D9FF",
    accentSoft: accentSoftFromHex("#20D9FF"),
    metric: "4.3M query / 11ms",
    status: "Primary core",
    iconName: "bot",
    iconNode: botIconNode,
    position: rowPosition(2, 5, MID_Z, 0.24),
  },
  {
    id: "quan-ly-api",
    label: "Quản Lý API",
    description:
      "Quan sát lưu lượng, rate limit và chất lượng phản hồi qua bảng điều khiển thống nhất.",
    accent: "#3B8BFF",
    accentSoft: accentSoftFromHex("#3B8BFF"),
    metric: "98.7% health",
    status: "Telemetry live",
    iconName: "settings",
    iconNode: settingsIconNode,
    position: rowPosition(3, 5, MID_Z, 0.24),
  },
  {
    id: "nap-tien",
    label: "Nạp Tiền",
    description:
      "Bổ sung tín dụng, tự động hóa ngưỡng nạp và giữ cho inference pipeline luôn trực tuyến.",
    accent: "#6B63FF",
    accentSoft: accentSoftFromHex("#6B63FF"),
    metric: "Wallet live",
    status: "Liquidity sync",
    iconName: "wallet",
    iconNode: walletIconNode,
    position: rowPosition(4, 5, MID_Z, 0.24),
  },
  {
    id: "lich-su",
    label: "Lịch Sử",
    description:
      "Theo dõi toàn bộ phiên làm việc, prompt chain và snapshot hệ thống theo từng mốc thời gian.",
    accent: "#9E5BFF",
    accentSoft: accentSoftFromHex("#9E5BFF"),
    metric: "90 day trail",
    status: "Immutable logs",
    iconName: "history",
    iconNode: historyIconNode,
    position: rowPosition(0, 4, BOT_Z, 0.12),
  },
  {
    id: "affiliate",
    label: "Affiliate",
    description:
      "Quản lý mạng lưới đối tác, chia sẻ doanh thu và đồng bộ chiến dịch tăng trưởng tự động.",
    accent: "#E34CFF",
    accentSoft: accentSoftFromHex("#E34CFF"),
    metric: "84 partner node",
    status: "Growth mesh",
    iconName: "users",
    iconNode: usersIconNode,
    position: rowPosition(1, 4, BOT_Z, 0.12),
  },
  {
    id: "thanh-toan",
    label: "Thanh Toán",
    description:
      "Hợp nhất billing, lưu trữ phương thức thanh toán và dự báo chi phí theo phiên hoạt động.",
    accent: "#FF5BB2",
    accentSoft: accentSoftFromHex("#FF5BB2"),
    metric: "PCI shielded",
    status: "Settlement sync",
    iconName: "credit-card",
    iconNode: creditCardIconNode,
    position: rowPosition(2, 4, BOT_Z, 0.12),
  },
  {
    id: "ho-tro",
    label: "Hỗ Trợ",
    description:
      "Điều phối support, escalations và cuộc gọi trực tiếp cho nhóm khách hàng ưu tiên.",
    accent: "#EAF4FF",
    accentSoft: accentSoftFromHex("#EAF4FF"),
    metric: "24/7 operator",
    status: "Human fallback",
    iconName: "headphones",
    iconNode: headphonesIconNode,
    position: rowPosition(3, 4, BOT_Z, 0.12),
  },
];
