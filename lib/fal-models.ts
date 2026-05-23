// FAL.AI model registry — latest + most popular, organized by capability tab.
// Each model declares the params we expose to UI controls; values are forwarded
// as-is to the FAL queue endpoint.

export type FalCapability =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video";

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
  endpoint: string;
  label: string;
  vendor: string;
  tagline: string;
  badge?: string;
  capability: FalCapability;
  promptKey: string;
  promptLabel: string;
  promptPlaceholder: string;
  imageKey?: string; // form field name for the source image url (i2i / i2v)
  imageLabel?: string;
  imageIsArray?: boolean; // some endpoints (nano-banana) want image_urls: string[]
  params: ReadonlyArray<FalParamSpec>;
  outputKind: "image" | "video";
};

const PROMPT_PLACEHOLDER_IMAGE =
  "Mô tả ảnh bạn muốn tạo... (chủ thể, ánh sáng, bố cục, phong cách, chất liệu)";
const PROMPT_PLACEHOLDER_EDIT =
  "Mô tả thay đổi: thay nền, đổi trang phục, thêm vật thể, sửa chi tiết...";
const PROMPT_PLACEHOLDER_VIDEO =
  "Mô tả cảnh quay, chuyển động máy, hành động, không khí...";
const PROMPT_PLACEHOLDER_I2V =
  "Mô tả cách máy quay và chủ thể chuyển động...";

const ASPECT_FULL: ReadonlyArray<FalParamOption> = [
  { value: "21:9", label: "21:9 cinematic" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "9:16", label: "9:16 mobile" },
  { value: "9:21", label: "9:21" },
];

const ASPECT_VIDEO: ReadonlyArray<FalParamOption> = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const IMAGE_SIZES_FAL: ReadonlyArray<FalParamOption> = [
  { value: "square_hd", label: "Square HD (1024x1024)" },
  { value: "square", label: "Square (512x512)" },
  { value: "portrait_4_3", label: "Portrait 4:3" },
  { value: "portrait_16_9", label: "Portrait 16:9" },
  { value: "landscape_4_3", label: "Landscape 4:3" },
  { value: "landscape_16_9", label: "Landscape 16:9" },
];

const FORMAT_OPTIONS: ReadonlyArray<FalParamOption> = [
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

// ============================================================================
// TEXT-TO-IMAGE
// ============================================================================
export const textToImageModels: ReadonlyArray<FalModel> = [
  {
    id: "flux-1-1-ultra",
    endpoint: "fal-ai/flux-pro/v1.1-ultra",
    label: "FLUX1.1 [pro] Ultra",
    vendor: "Black Forest Labs",
    tagline: "2K photoreal, prompt adherence cao nhất",
    badge: "PRO",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_FULL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "raw", label: "RAW mode", type: "boolean", default: false, hint: "Giảm gloss kiểu Midjourney" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
      {
        key: "safety_tolerance",
        label: "Safety tolerance",
        type: "select",
        default: "2",
        group: "advanced",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
          { value: "6", label: "6" },
        ],
      },
      { key: "output_format", label: "Định dạng", type: "select", default: "jpeg", group: "advanced", options: FORMAT_OPTIONS },
      { key: "enable_safety_checker", label: "Safety checker", type: "boolean", default: true, group: "advanced" },
    ],
  },
  {
    id: "flux-pro-1-1",
    endpoint: "fal-ai/flux-pro/v1.1",
    label: "FLUX1.1 [pro]",
    vendor: "Black Forest Labs",
    tagline: "Bản pro tiêu chuẩn, tốc độ tốt",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "landscape_16_9", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "safety_tolerance", label: "Safety tolerance", type: "select", default: "2", group: "advanced", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
        { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" },
      ]},
      { key: "output_format", label: "Định dạng", type: "select", default: "jpeg", group: "advanced", options: FORMAT_OPTIONS },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "flux-dev",
    endpoint: "fal-ai/flux/dev",
    label: "FLUX.1 [dev]",
    vendor: "Black Forest Labs",
    tagline: "Bản open-weights, 12B params",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "landscape_4_3", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 28, min: 1, max: 50, step: 1 },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 3.5, min: 1, max: 20, step: 0.5 },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
      { key: "enable_safety_checker", label: "Safety checker", type: "boolean", default: true, group: "advanced" },
    ],
  },
  {
    id: "flux-schnell",
    endpoint: "fal-ai/flux/schnell",
    label: "FLUX.1 [schnell]",
    vendor: "Black Forest Labs",
    tagline: "Cực nhanh — render 1-4 steps",
    badge: "FAST",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "landscape_4_3", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 4, min: 1, max: 12, step: 1 },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "imagen4",
    endpoint: "fal-ai/imagen4/preview",
    label: "Imagen 4",
    vendor: "Google DeepMind",
    tagline: "Chữ và bố cục cực sạch",
    badge: "NEW",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "1:1", label: "1:1" }, { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" }, { value: "3:4", label: "3:4" }, { value: "4:3", label: "4:3" },
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "imagen4-ultra",
    endpoint: "fal-ai/imagen4/preview/ultra",
    label: "Imagen 4 Ultra",
    vendor: "Google DeepMind",
    tagline: "Bản cao cấp nhất của Google",
    badge: "ULTRA",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "1:1", label: "1:1" }, { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" }, { value: "3:4", label: "3:4" }, { value: "4:3", label: "4:3" },
      ]},
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "gpt-image-1",
    endpoint: "fal-ai/gpt-image-1/text-to-image/byok",
    label: "GPT Image 1",
    vendor: "OpenAI",
    tagline: "GPT-4o Image — chữ và composition top",
    badge: "BYOK",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "auto", options: [
        { value: "auto", label: "Auto" },
        { value: "1024x1024", label: "1024x1024" },
        { value: "1024x1536", label: "1024x1536 (portrait)" },
        { value: "1536x1024", label: "1536x1024 (landscape)" },
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "quality", label: "Chất lượng", type: "select", default: "auto", options: [
        { value: "auto", label: "Auto" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ]},
      { key: "background", label: "Background", type: "select", default: "auto", group: "advanced", options: [
        { value: "auto", label: "Auto" },
        { value: "transparent", label: "Transparent" },
        { value: "opaque", label: "Opaque" },
      ]},
      { key: "openai_api_key", label: "OpenAI API Key (BYOK)", type: "string", default: "", hint: "Bắt buộc — model này chạy bằng key OpenAI của bạn" },
    ],
  },
  {
    id: "seedream-4",
    endpoint: "fal-ai/bytedance/seedream/v4/text-to-image",
    label: "Seedream 4.0",
    vendor: "ByteDance",
    tagline: "Up to 4K, cinematic",
    badge: "NEW",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "square_hd", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "max_images", label: "Max images batch", type: "number", default: 1, min: 1, max: 6, step: 1, group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "ideogram-v3",
    endpoint: "fal-ai/ideogram/v3",
    label: "Ideogram V3",
    vendor: "Ideogram",
    tagline: "Typography và poster",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "rendering_speed", label: "Tốc độ", type: "select", default: "BALANCED", options: [
        { value: "TURBO", label: "Turbo" },
        { value: "BALANCED", label: "Balanced" },
        { value: "QUALITY", label: "Quality" },
      ]},
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "1:1", label: "1:1" }, { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" }, { value: "4:3", label: "4:3" },
        { value: "3:4", label: "3:4" }, { value: "3:2", label: "3:2" }, { value: "2:3", label: "2:3" },
      ]},
      { key: "style", label: "Style", type: "select", default: "AUTO", options: [
        { value: "AUTO", label: "Auto" },
        { value: "GENERAL", label: "General" },
        { value: "REALISTIC", label: "Realistic" },
        { value: "DESIGN", label: "Design" },
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "expand_prompt", label: "Auto expand prompt", type: "boolean", default: true, group: "advanced" },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
    ],
  },
  {
    id: "recraft-v3",
    endpoint: "fal-ai/recraft-v3",
    label: "Recraft V3",
    vendor: "Recraft",
    tagline: "Vector, illustration, brand-ready",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "square_hd", options: IMAGE_SIZES_FAL },
      { key: "style", label: "Style", type: "select", default: "realistic_image", options: [
        { value: "realistic_image", label: "Realistic" },
        { value: "digital_illustration", label: "Digital illustration" },
        { value: "vector_illustration", label: "Vector illustration" },
        { value: "icon", label: "Icon" },
      ]},
    ],
  },
  {
    id: "qwen-image",
    endpoint: "fal-ai/qwen-image",
    label: "Qwen Image",
    vendor: "Alibaba Qwen",
    tagline: "Chữ tiếng Á / tiếng Việt cực tốt",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "landscape_16_9", options: IMAGE_SIZES_FAL },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 30, min: 10, max: 50, step: 1, group: "advanced" },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 4, min: 1, max: 10, step: 0.5, group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "hidream-i1-full",
    endpoint: "fal-ai/hidream-i1-full",
    label: "HiDream I1 Full",
    vendor: "HiDream",
    tagline: "Open-source 17B, chất lượng cao",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "square_hd", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 5, min: 1, max: 10, step: 0.5, group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "stable-diffusion-3-5-large",
    endpoint: "fal-ai/stable-diffusion-v35-large",
    label: "Stable Diffusion 3.5 Large",
    vendor: "Stability AI",
    tagline: "Bản 3.5 lớn, ổn định, đa style",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "square_hd", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 28, min: 10, max: 50, step: 1, group: "advanced" },
      { key: "guidance_scale", label: "Guidance (CFG)", type: "number", default: 4.5, min: 1, max: 10, step: 0.5, group: "advanced" },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "luma-photon",
    endpoint: "fal-ai/luma-photon",
    label: "Luma Photon",
    vendor: "Luma Labs",
    tagline: "Photoreal, lighting tự nhiên",
    capability: "text-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_IMAGE,
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "1:1", label: "1:1" }, { value: "3:4", label: "3:4" }, { value: "4:3", label: "4:3" },
        { value: "9:16", label: "9:16" }, { value: "16:9", label: "16:9" }, { value: "9:21", label: "9:21" }, { value: "21:9", label: "21:9" },
      ]},
    ],
  },
];

// ============================================================================
// IMAGE-TO-IMAGE (edit / re-imagine / inpaint)
// ============================================================================
export const imageToImageModels: ReadonlyArray<FalModel> = [
  {
    id: "flux-kontext-max",
    endpoint: "fal-ai/flux-pro/kontext/max",
    label: "FLUX.1 Kontext [max]",
    vendor: "Black Forest Labs",
    tagline: "Edit / re-imagine bằng prompt — bản pro nhất",
    badge: "PRO",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "match_input_image", options: [
        { value: "match_input_image", label: "Giữ tỉ lệ gốc" },
        ...ASPECT_FULL,
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 3.5, min: 1, max: 10, step: 0.5, group: "advanced" },
      { key: "output_format", label: "Định dạng", type: "select", default: "jpeg", group: "advanced", options: FORMAT_OPTIONS },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "flux-kontext-pro",
    endpoint: "fal-ai/flux-pro/kontext",
    label: "FLUX.1 Kontext [pro]",
    vendor: "Black Forest Labs",
    tagline: "Edit prompt-driven, nhanh hơn",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "match_input_image", options: [
        { value: "match_input_image", label: "Giữ tỉ lệ gốc" },
        ...ASPECT_FULL,
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 3.5, min: 1, max: 10, step: 0.5, group: "advanced" },
    ],
  },
  {
    id: "nano-banana-edit",
    endpoint: "fal-ai/nano-banana/edit",
    label: "Nano Banana Edit",
    vendor: "Google DeepMind",
    tagline: "Edit ảnh tự nhiên, giữ chủ thể",
    badge: "EDIT",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: "Ví dụ: thay áo trắng, thêm kính mát, đổi nền biển...",
    imageKey: "image_urls",
    imageLabel: "Ảnh nguồn (URL)",
    imageIsArray: true,
    outputKind: "image",
    params: [
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "output_format", label: "Định dạng", type: "select", default: "jpeg", group: "advanced", options: FORMAT_OPTIONS },
    ],
  },
  {
    id: "gpt-image-1-edit",
    endpoint: "fal-ai/gpt-image-1/edit-image/byok",
    label: "GPT Image 1 · Edit",
    vendor: "OpenAI",
    tagline: "Edit ảnh bằng GPT-4o Image",
    badge: "BYOK",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_urls",
    imageLabel: "Ảnh nguồn (URL)",
    imageIsArray: true,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "auto", options: [
        { value: "auto", label: "Auto" },
        { value: "1024x1024", label: "1024x1024" },
        { value: "1024x1536", label: "1024x1536" },
        { value: "1536x1024", label: "1536x1024" },
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "quality", label: "Chất lượng", type: "select", default: "auto", options: [
        { value: "auto", label: "Auto" }, { value: "low", label: "Low" },
        { value: "medium", label: "Medium" }, { value: "high", label: "High" },
      ]},
      { key: "openai_api_key", label: "OpenAI API Key (BYOK)", type: "string", default: "", hint: "Bắt buộc" },
    ],
  },
  {
    id: "seedream-4-edit",
    endpoint: "fal-ai/bytedance/seedream/v4/edit",
    label: "Seedream 4 · Edit",
    vendor: "ByteDance",
    tagline: "Edit ảnh chất lượng cao, đa ảnh nguồn",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_urls",
    imageLabel: "Ảnh nguồn (URL)",
    imageIsArray: true,
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "square_hd", options: IMAGE_SIZES_FAL },
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
      { key: "max_images", label: "Max images batch", type: "number", default: 1, min: 1, max: 6, step: 1, group: "advanced" },
    ],
  },
  {
    id: "qwen-image-edit",
    endpoint: "fal-ai/qwen-image-edit",
    label: "Qwen Image · Edit",
    vendor: "Alibaba Qwen",
    tagline: "Edit có hỗ trợ chữ Á/Việt",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "image_size", label: "Kích thước", type: "select", default: "landscape_16_9", options: IMAGE_SIZES_FAL },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 30, min: 10, max: 50, step: 1, group: "advanced" },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 4, min: 1, max: 10, step: 0.5, group: "advanced" },
    ],
  },
  {
    id: "ideogram-v3-edit",
    endpoint: "fal-ai/ideogram/v3/edit",
    label: "Ideogram V3 · Edit",
    vendor: "Ideogram",
    tagline: "Edit kèm typography, mask",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Mô tả chỉnh sửa",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "rendering_speed", label: "Tốc độ", type: "select", default: "BALANCED", options: [
        { value: "TURBO", label: "Turbo" },
        { value: "BALANCED", label: "Balanced" },
        { value: "QUALITY", label: "Quality" },
      ]},
      { key: "style", label: "Style", type: "select", default: "AUTO", options: [
        { value: "AUTO", label: "Auto" },
        { value: "GENERAL", label: "General" },
        { value: "REALISTIC", label: "Realistic" },
        { value: "DESIGN", label: "Design" },
      ]},
      { key: "num_images", label: "Số ảnh", type: "number", default: 1, min: 1, max: 4, step: 1 },
    ],
  },
  {
    id: "recraft-v3-image-to-image",
    endpoint: "fal-ai/recraft-v3/image-to-image",
    label: "Recraft V3 · I2I",
    vendor: "Recraft",
    tagline: "Re-style theo strength",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt",
    promptPlaceholder: PROMPT_PLACEHOLDER_EDIT,
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "strength", label: "Strength", type: "number", default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: "style", label: "Style", type: "select", default: "realistic_image", options: [
        { value: "realistic_image", label: "Realistic" },
        { value: "digital_illustration", label: "Digital illustration" },
        { value: "vector_illustration", label: "Vector illustration" },
      ]},
    ],
  },
  {
    id: "clarity-upscaler",
    endpoint: "fal-ai/clarity-upscaler",
    label: "Clarity Upscaler",
    vendor: "Magnific-style",
    tagline: "Upscale + chi tiết hoá ảnh",
    badge: "UPSCALE",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt mô tả",
    promptPlaceholder: "Mô tả ảnh để mô hình giữ chi tiết tốt hơn...",
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "upscale_factor", label: "Upscale", type: "number", default: 2, min: 1, max: 4, step: 1 },
      { key: "creativity", label: "Creativity", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "advanced" },
      { key: "resemblance", label: "Resemblance", type: "number", default: 0.6, min: 0, max: 1, step: 0.05, group: "advanced" },
      { key: "guidance_scale", label: "Guidance", type: "number", default: 4, min: 1, max: 10, step: 0.5, group: "advanced" },
      { key: "num_inference_steps", label: "Steps", type: "number", default: 18, min: 8, max: 50, step: 1, group: "advanced" },
    ],
  },
  {
    id: "ccsr",
    endpoint: "fal-ai/ccsr",
    label: "CCSR Upscaler",
    vendor: "CCSR",
    tagline: "Upscale ổn định, ít hallucinate",
    capability: "image-to-image",
    promptKey: "prompt",
    promptLabel: "Prompt (optional)",
    promptPlaceholder: "Có thể để trống",
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [
      { key: "scale", label: "Scale", type: "number", default: 2, min: 1, max: 4, step: 1 },
    ],
  },
  {
    id: "bria-background-remove",
    endpoint: "fal-ai/bria/background/remove",
    label: "Bria · Remove BG",
    vendor: "Bria AI",
    tagline: "Tách nền sạch, không cần prompt",
    badge: "TOOL",
    capability: "image-to-image",
    promptKey: "image_url",
    promptLabel: "Ảnh nguồn (URL)",
    promptPlaceholder: "https://...",
    imageKey: "image_url",
    imageLabel: "Ảnh nguồn (URL)",
    outputKind: "image",
    params: [],
  },
];

// ============================================================================
// TEXT-TO-VIDEO
// ============================================================================
export const textToVideoModels: ReadonlyArray<FalModel> = [
  {
    id: "veo3",
    endpoint: "fal-ai/veo3",
    label: "Veo 3",
    vendor: "Google DeepMind",
    tagline: "Cinematic + audio sync",
    badge: "PRO",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "duration", label: "Độ dài", type: "select", default: "8s", options: [
        { value: "4s", label: "4 giây" }, { value: "6s", label: "6 giây" }, { value: "8s", label: "8 giây" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "1080p", options: [
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "generate_audio", label: "Có âm thanh", type: "boolean", default: true },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "veo3-fast",
    endpoint: "fal-ai/veo3/fast",
    label: "Veo 3 Fast",
    vendor: "Google DeepMind",
    tagline: "Veo 3 nhanh hơn, rẻ hơn",
    badge: "FAST",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "duration", label: "Độ dài", type: "select", default: "8s", options: [
        { value: "4s", label: "4 giây" }, { value: "6s", label: "6 giây" }, { value: "8s", label: "8 giây" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "generate_audio", label: "Có âm thanh", type: "boolean", default: true },
    ],
  },
  {
    id: "kling-2-1-master-t2v",
    endpoint: "fal-ai/kling-video/v2.1/master/text-to-video",
    label: "Kling 2.1 Master",
    vendor: "Kuaishou",
    tagline: "Chuyển động mượt, prompt adherence cao",
    badge: "MASTER",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "blur, distort, low quality", group: "advanced" },
      { key: "cfg_scale", label: "CFG scale", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "advanced" },
    ],
  },
  {
    id: "kling-2-pro-t2v",
    endpoint: "fal-ai/kling-video/v2/pro/text-to-video",
    label: "Kling 2.0 Pro",
    vendor: "Kuaishou",
    tagline: "Bản pro, vừa tốc độ vừa chất lượng",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "blur, distort, low quality", group: "advanced" },
      { key: "cfg_scale", label: "CFG scale", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "advanced" },
    ],
  },
  {
    id: "seedance-pro-t2v",
    endpoint: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
    label: "Seedance 1.0 Pro",
    vendor: "ByteDance",
    tagline: "1080p, motion stable",
    badge: "PRO",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        ...ASPECT_VIDEO, { value: "21:9", label: "21:9" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "1080p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "3", label: "3 giây" }, { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "camera_fixed", label: "Cố định máy quay", type: "boolean", default: false, group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "seedance-lite-t2v",
    endpoint: "fal-ai/bytedance/seedance/v1/lite/text-to-video",
    label: "Seedance 1.0 Lite",
    vendor: "ByteDance",
    tagline: "Bản lite — tốc độ ưu tiên",
    badge: "FAST",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "3", label: "3 giây" }, { value: "5", label: "5 giây" },
      ]},
    ],
  },
  {
    id: "hailuo-02-pro-t2v",
    endpoint: "fal-ai/minimax/hailuo-02/pro/text-to-video",
    label: "Hailuo 02 Pro",
    vendor: "MiniMax",
    tagline: "1080p cinematic của MiniMax",
    badge: "PRO",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "6", options: [
        { value: "6", label: "6 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "prompt_optimizer", label: "Tối ưu prompt", type: "boolean", default: true, group: "advanced" },
    ],
  },
  {
    id: "hailuo-02-standard-t2v",
    endpoint: "fal-ai/minimax/hailuo-02/standard/text-to-video",
    label: "Hailuo 02 Standard",
    vendor: "MiniMax",
    tagline: "Standard tier — cân bằng",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "6", options: [
        { value: "6", label: "6 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "prompt_optimizer", label: "Tối ưu prompt", type: "boolean", default: true, group: "advanced" },
    ],
  },
  {
    id: "wan-2-2-a14b-t2v",
    endpoint: "fal-ai/wan/v2.2-a14b/text-to-video",
    label: "Wan 2.2 A14B",
    vendor: "Alibaba",
    tagline: "Open-weights cao cấp",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "580p", label: "580p" }, { value: "720p", label: "720p" },
      ]},
      { key: "num_frames", label: "Số frame", type: "number", default: 81, min: 41, max: 121, step: 4, group: "advanced" },
      { key: "frames_per_second", label: "FPS", type: "number", default: 16, min: 8, max: 24, step: 1, group: "advanced" },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
    ],
  },
  {
    id: "luma-ray-2",
    endpoint: "fal-ai/luma-dream-machine/ray-2",
    label: "Luma Ray 2",
    vendor: "Luma Labs",
    tagline: "Vật lý chân thực, motion mượt",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "1:1", label: "1:1" },
        { value: "4:3", label: "4:3" }, { value: "3:4", label: "3:4" },
        { value: "21:9", label: "21:9" }, { value: "9:21", label: "9:21" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "540p", label: "540p" }, { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5s", options: [
        { value: "5s", label: "5 giây" }, { value: "9s", label: "9 giây" },
      ]},
      { key: "loop", label: "Loop video", type: "boolean", default: false, group: "advanced" },
    ],
  },
  {
    id: "pixverse-4-5-t2v",
    endpoint: "fal-ai/pixverse/v4.5/text-to-video",
    label: "Pixverse 4.5",
    vendor: "Pixverse",
    tagline: "Anime-friendly, motion cường điệu",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "360p", label: "360p" }, { value: "540p", label: "540p" },
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "8", label: "8 giây" },
      ]},
      { key: "style", label: "Style", type: "select", default: "None", options: [
        { value: "None", label: "None" }, { value: "anime", label: "Anime" },
        { value: "3d_animation", label: "3D animation" }, { value: "clay", label: "Clay" },
        { value: "comic", label: "Comic" }, { value: "cyberpunk", label: "Cyberpunk" },
      ]},
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
    ],
  },
  {
    id: "ltx-video-13b-distilled",
    endpoint: "fal-ai/ltx-video-13b-distilled",
    label: "LTX Video 13B",
    vendor: "Lightricks",
    tagline: "Open-source, real-time class",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" },
      ]},
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
    ],
  },
  {
    id: "mochi-1",
    endpoint: "fal-ai/mochi-v1",
    label: "Mochi 1",
    vendor: "Genmo",
    tagline: "Open-source motion diffusion",
    capability: "text-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt video",
    promptPlaceholder: PROMPT_PLACEHOLDER_VIDEO,
    outputKind: "video",
    params: [
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
];

// ============================================================================
// IMAGE-TO-VIDEO
// ============================================================================
export const imageToVideoModels: ReadonlyArray<FalModel> = [
  {
    id: "kling-2-1-master-i2v",
    endpoint: "fal-ai/kling-video/v2.1/master/image-to-video",
    label: "Kling 2.1 Master · I2V",
    vendor: "Kuaishou",
    tagline: "Biến ảnh tĩnh thành cảnh quay",
    badge: "MASTER",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "blur, distort, low quality", group: "advanced" },
      { key: "cfg_scale", label: "CFG scale", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "advanced" },
    ],
  },
  {
    id: "kling-2-pro-i2v",
    endpoint: "fal-ai/kling-video/v2/pro/image-to-video",
    label: "Kling 2.0 Pro · I2V",
    vendor: "Kuaishou",
    tagline: "I2V bản pro",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "blur, distort, low quality", group: "advanced" },
      { key: "cfg_scale", label: "CFG scale", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "advanced" },
    ],
  },
  {
    id: "veo3-i2v",
    endpoint: "fal-ai/veo3/image-to-video",
    label: "Veo 3 · I2V",
    vendor: "Google DeepMind",
    tagline: "I2V cinematic + audio",
    badge: "PRO",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "duration", label: "Độ dài", type: "select", default: "8s", options: [
        { value: "4s", label: "4 giây" }, { value: "6s", label: "6 giây" }, { value: "8s", label: "8 giây" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "1080p", options: [
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "generate_audio", label: "Có âm thanh", type: "boolean", default: true },
    ],
  },
  {
    id: "veo3-fast-i2v",
    endpoint: "fal-ai/veo3/fast/image-to-video",
    label: "Veo 3 Fast · I2V",
    vendor: "Google DeepMind",
    tagline: "I2V Veo 3 nhanh",
    badge: "FAST",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: ASPECT_VIDEO },
      { key: "duration", label: "Độ dài", type: "select", default: "8s", options: [
        { value: "4s", label: "4 giây" }, { value: "6s", label: "6 giây" }, { value: "8s", label: "8 giây" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "generate_audio", label: "Có âm thanh", type: "boolean", default: true },
    ],
  },
  {
    id: "seedance-pro-i2v",
    endpoint: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
    label: "Seedance 1.0 Pro · I2V",
    vendor: "ByteDance",
    tagline: "I2V 1080p, motion stable",
    badge: "PRO",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "resolution", label: "Độ phân giải", type: "select", default: "1080p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "3", label: "3 giây" }, { value: "5", label: "5 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "camera_fixed", label: "Cố định máy quay", type: "boolean", default: false, group: "advanced" },
      { key: "seed", label: "Seed", type: "number", default: "" as unknown as number, min: 0, group: "advanced" },
    ],
  },
  {
    id: "seedance-lite-i2v",
    endpoint: "fal-ai/bytedance/seedance/v1/lite/image-to-video",
    label: "Seedance 1.0 Lite · I2V",
    vendor: "ByteDance",
    tagline: "I2V tốc độ ưu tiên",
    badge: "FAST",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "3", label: "3 giây" }, { value: "5", label: "5 giây" },
      ]},
    ],
  },
  {
    id: "hailuo-02-pro-i2v",
    endpoint: "fal-ai/minimax/hailuo-02/pro/image-to-video",
    label: "Hailuo 02 Pro · I2V",
    vendor: "MiniMax",
    tagline: "I2V 1080p MiniMax",
    badge: "PRO",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "duration", label: "Độ dài", type: "select", default: "6", options: [
        { value: "6", label: "6 giây" }, { value: "10", label: "10 giây" },
      ]},
      { key: "prompt_optimizer", label: "Tối ưu prompt", type: "boolean", default: true, group: "advanced" },
    ],
  },
  {
    id: "wan-2-2-a14b-i2v",
    endpoint: "fal-ai/wan/v2.2-a14b/image-to-video",
    label: "Wan 2.2 A14B · I2V",
    vendor: "Alibaba",
    tagline: "I2V open-weights cao cấp",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "580p", label: "580p" }, { value: "720p", label: "720p" },
      ]},
      { key: "num_frames", label: "Số frame", type: "number", default: 81, min: 41, max: 121, step: 4, group: "advanced" },
      { key: "frames_per_second", label: "FPS", type: "number", default: 16, min: 8, max: 24, step: 1, group: "advanced" },
      { key: "negative_prompt", label: "Negative prompt", type: "textarea", default: "", group: "advanced" },
    ],
  },
  {
    id: "luma-ray-2-i2v",
    endpoint: "fal-ai/luma-dream-machine/ray-2/image-to-video",
    label: "Luma Ray 2 · I2V",
    vendor: "Luma Labs",
    tagline: "I2V vật lý chân thực",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "aspect_ratio", label: "Tỉ lệ", type: "select", default: "16:9", options: [
        { value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "1:1", label: "1:1" },
        { value: "4:3", label: "4:3" }, { value: "3:4", label: "3:4" },
        { value: "21:9", label: "21:9" }, { value: "9:21", label: "9:21" },
      ]},
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "540p", label: "540p" }, { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5s", options: [
        { value: "5s", label: "5 giây" }, { value: "9s", label: "9 giây" },
      ]},
      { key: "loop", label: "Loop video", type: "boolean", default: false, group: "advanced" },
    ],
  },
  {
    id: "pixverse-4-5-i2v",
    endpoint: "fal-ai/pixverse/v4.5/image-to-video",
    label: "Pixverse 4.5 · I2V",
    vendor: "Pixverse",
    tagline: "I2V anime-friendly",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "360p", label: "360p" }, { value: "540p", label: "540p" },
        { value: "720p", label: "720p" }, { value: "1080p", label: "1080p" },
      ]},
      { key: "duration", label: "Độ dài", type: "select", default: "5", options: [
        { value: "5", label: "5 giây" }, { value: "8", label: "8 giây" },
      ]},
      { key: "style", label: "Style", type: "select", default: "None", options: [
        { value: "None", label: "None" }, { value: "anime", label: "Anime" },
        { value: "3d_animation", label: "3D animation" }, { value: "clay", label: "Clay" },
        { value: "comic", label: "Comic" }, { value: "cyberpunk", label: "Cyberpunk" },
      ]},
    ],
  },
  {
    id: "ltx-video-13b-distilled-i2v",
    endpoint: "fal-ai/ltx-video-13b-distilled/image-to-video",
    label: "LTX Video 13B · I2V",
    vendor: "Lightricks",
    tagline: "I2V open-source",
    capability: "image-to-video",
    promptKey: "prompt",
    promptLabel: "Prompt chuyển động",
    promptPlaceholder: PROMPT_PLACEHOLDER_I2V,
    imageKey: "image_url",
    imageLabel: "Ảnh đầu vào (URL)",
    outputKind: "video",
    params: [
      { key: "resolution", label: "Độ phân giải", type: "select", default: "720p", options: [
        { value: "480p", label: "480p" }, { value: "720p", label: "720p" },
      ]},
    ],
  },
];

export const allModels: ReadonlyArray<FalModel> = [
  ...textToImageModels,
  ...imageToImageModels,
  ...textToVideoModels,
  ...imageToVideoModels,
];

export function getModelById(id: string): FalModel | undefined {
  return allModels.find((model) => model.id === id);
}

export function getModelsByCapability(capability: FalCapability): ReadonlyArray<FalModel> {
  switch (capability) {
    case "text-to-image":
      return textToImageModels;
    case "image-to-image":
      return imageToImageModels;
    case "text-to-video":
      return textToVideoModels;
    case "image-to-video":
      return imageToVideoModels;
  }
}
