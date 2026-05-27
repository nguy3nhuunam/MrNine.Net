// JSON-LD helpers for structured data. Each function returns a JSON object
// to be embedded in <script type="application/ld+json"> via dangerouslySet.
//
// Goals (in order of payoff):
//  1. WebSite + sitelinks search box on Google for the brand "MrNine".
//  2. Organization rich card.
//  3. SoftwareApplication entries for major modules so they have a chance
//     to appear as "tools" in Google's search experience.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mrnine.net";

export type JsonLd = Record<string, unknown>;

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MrNine",
    url: SITE_URL,
    inLanguage: ["vi-VN", "en-US"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MrNine",
    url: SITE_URL,
    logo: `${SITE_URL}/api/og?title=MrNine&subtitle=Future%20AI%20Control%20Deck&accent=amber`,
    sameAs: [],
  };
}

export type ModuleAppOptions = {
  name: string;
  url: string;
  description: string;
  category?: string;
  inLanguage?: string;
  screenshot?: string;
};

export function softwareApplicationJsonLd(opts: ModuleAppOptions): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    url: opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`,
    applicationCategory: opts.category ?? "WebApplication",
    operatingSystem: "Web",
    description: opts.description,
    inLanguage: opts.inLanguage ?? "vi-VN",
    isPartOf: {
      "@type": "WebSite",
      name: "MrNine",
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "VND",
    },
    ...(opts.screenshot
      ? {
          screenshot: opts.screenshot.startsWith("http")
            ? opts.screenshot
            : `${SITE_URL}${opts.screenshot}`,
        }
      : {}),
  };
}

// Render multiple JSON-LD blocks at once. Pass to <script> tags via JSX.
export function jsonLdScriptProps(data: JsonLd | JsonLd[]) {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((value, index) => ({
    type: "application/ld+json" as const,
    key: `jsonld-${index}`,
    dangerouslySetInnerHTML: { __html: JSON.stringify(value) },
  }));
}
