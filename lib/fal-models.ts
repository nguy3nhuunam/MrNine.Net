// Latest, most popular FAL.AI models for image + video generation.
// Schema is compact: each model declares the params we expose to UI controls.
// Server only — values forwarded as-is to FAL queue endpoints.

export type FalParamType =
  | "string"
  | "textarea"
  | "select"
  | "number"
  | "boolean";

export type FalParamOption = { value: string | number; label: string };

export type FalParamSpec = {
  key: string;
  label: string;
  type: FalParamType;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: ReadonlyArray<FalParamOption>;
  hint?: string;
  group?: "core" | "advanced";
};

export type FalModel = {
  id: string;
  endpoint: string; // fal model slug, e.g. "fal-ai/flux-pro/v1.1-ultra"
  label: string;
  vendor: string;
  tagline: string;
  highlight?: string; // short pitch
  badge?: string; // small label e.g. "NEW", "PRO"
  promptKey: string; // form field name carrying the main prompt
  promptLabel: string;
  promptPlaceholder: string;
  needsImage?: boolean; // image-to-video / image-to-image
  imageKey?: string; // form field name for the input image url
  imageLabel?: string;
  params: ReadonlyArray<FalParamSpec>;
  outputKind: "image" | "video";
};

const SHARED_PROMPT_PLACEHOLDER_IMAGE =
  "Mô tả ảnh bạn muốn tạo... (ánh sáng, bố cục, phong cách, chất liệu)";
const SHARED_PROMPT_PLACEHOLDER_VIDEO =
  "Mô tả cảnh quay, chuyển động máy, hành động, không khí...";

export const imageModels: ReadonlyArray<FalModel> = [
  {
    id: "flux-1.1-ultra",
    endpoint: "fal-ai/flux-pro/v1.1-ultra",
    label: "FLUX1.1 [pro] Ultra",
    vendor: "Black Forest Labs",
    tagline: "Photoreal 2K, prompt adherence cao nhất",
    highlight: "Mặc định cho ảnh chất lượng phim",
    badge: "PRO",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ khung hình",
        type: "select",
        default: "16:9",
        options: [
          { value: "21:9", label: "21:9 cinematic" },
          { value: "16:9", label: "16:9" },
          { value: "4:3", label: "4:3" },
          { value: "1:1", label: "1:1" },
          { value: "3:4", label: "3:4" },
          { value: "9:16", label: "9:16 mobile" },
          { value: "9:21", label: "9:21" },
        ],
      },
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "raw",
        label: "RAW mode (giảm gloss)",
        type: "boolean",
        default: false,
        group: "advanced",
      },
      {
        key: "safety_tolerance",
        label: "Safety tolerance",
        type: "select",
        default: "2",
        group: "advanced",
        options: [
          { value: "1", label: "1 (chặt)" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
          { value: "6", label: "6 (nới)" },
        ],
      },
      {
        key: "output_format",
        label: "Định dạng",
        type: "select",
        default: "jpeg",
        group: "advanced",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ],
      },
    ],
  },
  {
    id: "flux-kontext-max",
    endpoint: "fal-ai/flux-pro/kontext/max",
    label: "FLUX.1 Kontext [max]",
    vendor: "Black Forest Labs",
    tagline: "Edit / re-imagine ảnh có sẵn theo prompt",
    badge: "EDIT",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: "Ví dụ: thay bầu trời thành hoàng hôn cam tím...",
    needsImage: true,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "match_input_image",
        options: [
          { value: "match_input_image", label: "Giữ tỉ lệ gốc" },
          { value: "21:9", label: "21:9" },
          { value: "16:9", label: "16:9" },
          { value: "4:3", label: "4:3" },
          { value: "1:1", label: "1:1" },
          { value: "3:4", label: "3:4" },
          { value: "9:16", label: "9:16" },
        ],
      },
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "guidance_scale",
        label: "Guidance",
        type: "number",
        default: 3.5,
        min: 1,
        max: 10,
        step: 0.5,
        group: "advanced",
      },
      {
        key: "output_format",
        label: "Định dạng",
        type: "select",
        default: "jpeg",
        group: "advanced",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ],
      },
    ],
  },
  {
    id: "imagen4",
    endpoint: "fal-ai/imagen4/preview",
    label: "Imagen 4",
    vendor: "Google DeepMind",
    tagline: "Chữ và bố cục cực sạch",
    badge: "NEW",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "3:4", label: "3:4" },
          { value: "4:3", label: "4:3" },
        ],
      },
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "negative_prompt",
        label: "Negative prompt",
        type: "textarea",
        default: "",
        group: "advanced",
      },
    ],
  },
  {
    id: "seedream-4",
    endpoint: "fal-ai/bytedance/seedream/v4/text-to-image",
    label: "Seedream 4.0",
    vendor: "ByteDance",
    tagline: "Lên tới 4K, kiểu phim cinematic",
    badge: "NEW",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "image_size",
        label: "Kích thước",
        type: "select",
        default: "square_hd",
        options: [
          { value: "square_hd", label: "Square HD" },
          { value: "square", label: "Square" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
        ],
      },
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "max_images",
        label: "Max images batch",
        type: "number",
        default: 1,
        min: 1,
        max: 6,
        step: 1,
        group: "advanced",
      },
    ],
  },
  {
    id: "ideogram-v3",
    endpoint: "fal-ai/ideogram/v3",
    label: "Ideogram V3",
    vendor: "Ideogram",
    tagline: "Typography và poster đỉnh",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "rendering_speed",
        label: "Tốc độ",
        type: "select",
        default: "BALANCED",
        options: [
          { value: "TURBO", label: "Turbo" },
          { value: "BALANCED", label: "Balanced" },
          { value: "QUALITY", label: "Quality" },
        ],
      },
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" },
        ],
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "AUTO",
        options: [
          { value: "AUTO", label: "Auto" },
          { value: "GENERAL", label: "General" },
          { value: "REALISTIC", label: "Realistic" },
          { value: "DESIGN", label: "Design" },
        ],
      },
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "expand_prompt",
        label: "Auto expand prompt",
        type: "boolean",
        default: true,
        group: "advanced",
      },
    ],
  },
  {
    id: "recraft-v3",
    endpoint: "fal-ai/recraft-v3",
    label: "Recraft V3",
    vendor: "Recraft",
    tagline: "Vector, illustration, brand-ready",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "image_size",
        label: "Kích thước",
        type: "select",
        default: "square_hd",
        options: [
          { value: "square_hd", label: "Square HD" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
        ],
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "realistic_image",
        options: [
          { value: "realistic_image", label: "Realistic" },
          { value: "digital_illustration", label: "Digital illustration" },
          { value: "vector_illustration", label: "Vector illustration" },
        ],
      },
    ],
  },
  {
    id: "qwen-image",
    endpoint: "fal-ai/qwen-image",
    label: "Qwen Image",
    vendor: "Alibaba Qwen",
    tagline: "Chữ tiếng Á / Việt cực tốt",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      {
        key: "image_size",
        label: "Kích thước",
        type: "select",
        default: "landscape_16_9",
        options: [
          { value: "square_hd", label: "Square HD" },
          { value: "square", label: "Square" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
        ],
      },
      {
        key: "num_inference_steps",
        label: "Steps",
        type: "number",
        default: 30,
        min: 10,
        max: 50,
        step: 1,
        group: "advanced",
      },
      {
        key: "guidance_scale",
        label: "Guidance",
        type: "number",
        default: 4,
        min: 1,
        max: 10,
        step: 0.5,
        group: "advanced",
      },
    ],
  },
  {
    id: "nano-banana",
    endpoint: "fal-ai/nano-banana/edit",
    label: "Nano Banana Edit",
    vendor: "Google DeepMind",
    tagline: "Edit ảnh tự nhiên, giữ chủ thể",
    badge: "EDIT",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: "Ví dụ: thay áo trắng, thêm kính mát, đổi nền biển...",
    needsImage: true,
    imageKey: "image_urls",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      {
        key: "num_images",
        label: "Số ảnh",
        type: "number",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: "output_format",
        label: "Định dạng",
        type: "select",
        default: "jpeg",
        group: "advanced",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ],
      },
    ],
  },
];

export const videoModels: ReadonlyArray<FalModel> = [
  {
    id: "veo3",
    endpoint: "fal-ai/veo3",
    label: "Veo 3",
    vendor: "Google DeepMind",
    tagline: "Cinematic 8s + audio sync",
    badge: "PRO",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
      },
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "8s",
        options: [
          { value: "4s", label: "4 giây" },
          { value: "6s", label: "6 giây" },
          { value: "8s", label: "8 giây" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "1080p",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      {
        key: "generate_audio",
        label: "Có âm thanh",
        type: "boolean",
        default: true,
      },
      {
        key: "negative_prompt",
        label: "Negative prompt",
        type: "textarea",
        default: "",
        group: "advanced",
      },
    ],
  },
  {
    id: "veo3-fast",
    endpoint: "fal-ai/veo3/fast",
    label: "Veo 3 Fast",
    vendor: "Google DeepMind",
    tagline: "Veo 3 nhanh hơn, rẻ hơn",
    badge: "FAST",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
      },
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "8s",
        options: [
          { value: "4s", label: "4 giây" },
          { value: "6s", label: "6 giây" },
          { value: "8s", label: "8 giây" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "720p",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      {
        key: "generate_audio",
        label: "Có âm thanh",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "kling-2-1-master",
    endpoint: "fal-ai/kling-video/v2.1/master/text-to-video",
    label: "Kling 2.1 Master",
    vendor: "Kuaishou",
    tagline: "Chuyển động mượt, prompt adherence cao",
    badge: "MASTER",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "5",
        options: [
          { value: "5", label: "5 giây" },
          { value: "10", label: "10 giây" },
        ],
      },
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
      },
      {
        key: "negative_prompt",
        label: "Negative prompt",
        type: "textarea",
        default: "blur, distort, low quality",
        group: "advanced",
      },
      {
        key: "cfg_scale",
        label: "CFG scale",
        type: "number",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        group: "advanced",
      },
    ],
  },
  {
    id: "kling-2-1-master-i2v",
    endpoint: "fal-ai/kling-video/v2.1/master/image-to-video",
    label: "Kling 2.1 Master · I2V",
    vendor: "Kuaishou",
    tagline: "Biến ảnh tĩnh thành cảnh quay",
    badge: "I2V",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: "Mô tả cách máy quay và chủ thể chuyển động...",
    needsImage: true,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "5",
        options: [
          { value: "5", label: "5 giây" },
          { value: "10", label: "10 giây" },
        ],
      },
      {
        key: "negative_prompt",
        label: "Negative prompt",
        type: "textarea",
        default: "blur, distort, low quality",
        group: "advanced",
      },
      {
        key: "cfg_scale",
        label: "CFG scale",
        type: "number",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        group: "advanced",
      },
    ],
  },
  {
    id: "seedance-pro",
    endpoint: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
    label: "Seedance 1.0 Pro",
    vendor: "ByteDance",
    tagline: "1080p, motion stable, render nhanh",
    badge: "PRO",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
          { value: "21:9", label: "21:9" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "1080p",
        options: [
          { value: "480p", label: "480p" },
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "5",
        options: [
          { value: "3", label: "3 giây" },
          { value: "5", label: "5 giây" },
          { value: "10", label: "10 giây" },
        ],
      },
      {
        key: "camera_fixed",
        label: "Cố định máy quay",
        type: "boolean",
        default: false,
        group: "advanced",
      },
    ],
  },
  {
    id: "hailuo-02-pro",
    endpoint: "fal-ai/minimax/hailuo-02/pro/text-to-video",
    label: "Hailuo 02 Pro",
    vendor: "MiniMax",
    tagline: "1080p cinematic của MiniMax",
    badge: "PRO",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "6",
        options: [
          { value: "6", label: "6 giây" },
          { value: "10", label: "10 giây" },
        ],
      },
      {
        key: "prompt_optimizer",
        label: "Tối ưu prompt",
        type: "boolean",
        default: true,
        group: "advanced",
      },
    ],
  },
  {
    id: "wan-2-2-a14b",
    endpoint: "fal-ai/wan/v2.2-a14b/text-to-video",
    label: "Wan 2.2 A14B",
    vendor: "Alibaba",
    tagline: "Open-weights cao cấp, chuyển động dài",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "720p",
        options: [
          { value: "480p", label: "480p" },
          { value: "580p", label: "580p" },
          { value: "720p", label: "720p" },
        ],
      },
      {
        key: "num_frames",
        label: "Số frame",
        type: "number",
        default: 81,
        min: 41,
        max: 121,
        step: 4,
        group: "advanced",
      },
      {
        key: "frames_per_second",
        label: "FPS",
        type: "number",
        default: 16,
        min: 8,
        max: 24,
        step: 1,
        group: "advanced",
      },
    ],
  },
  {
    id: "luma-ray-2",
    endpoint: "fal-ai/luma-dream-machine/ray-2",
    label: "Luma Ray 2",
    vendor: "Luma Labs",
    tagline: "Chuyển động vật lý chân thực",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "21:9", label: "21:9" },
          { value: "9:21", label: "9:21" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "720p",
        options: [
          { value: "540p", label: "540p" },
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "5s",
        options: [
          { value: "5s", label: "5 giây" },
          { value: "9s", label: "9 giây" },
        ],
      },
      {
        key: "loop",
        label: "Loop video",
        type: "boolean",
        default: false,
        group: "advanced",
      },
    ],
  },
  {
    id: "pixverse-4-5",
    endpoint: "fal-ai/pixverse/v4.5/text-to-video",
    label: "Pixverse 4.5",
    vendor: "Pixverse",
    tagline: "Chuyển động cường điệu, anime-friendly",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: SHARED_PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      {
        key: "aspect_ratio",
        label: "Tỉ lệ",
        type: "select",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
      },
      {
        key: "resolution",
        label: "Độ phân giải",
        type: "select",
        default: "720p",
        options: [
          { value: "360p", label: "360p" },
          { value: "540p", label: "540p" },
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      {
        key: "duration",
        label: "Độ dài",
        type: "select",
        default: "5",
        options: [
          { value: "5", label: "5 giây" },
          { value: "8", label: "8 giây" },
        ],
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "None",
        options: [
          { value: "None", label: "None" },
          { value: "anime", label: "Anime" },
          { value: "3d_animation", label: "3D animation" },
          { value: "clay", label: "Clay" },
          { value: "comic", label: "Comic" },
          { value: "cyberpunk", label: "Cyberpunk" },
        ],
      },
    ],
  },
];

export const allModels: ReadonlyArray<FalModel> = [...imageModels, ...videoModels];

export function getModelById(id: string): FalModel | undefined {
  return allModels.find((model) => model.id === id);
}
