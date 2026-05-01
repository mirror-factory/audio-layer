import { cn } from "@/lib/utils";

const PRODUCTS = {
  chatgpt: {
    label: "ChatGPT",
    src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
  },
  claude: {
    label: "Claude",
    src: "https://cdn.simpleicons.org/anthropic/172033",
  },
  gemini: {
    label: "Gemini",
    src: "https://cdn.simpleicons.org/googlegemini/172033",
  },
} as const;

export type ProductLogoId = keyof typeof PRODUCTS;

export function ProductLogo({
  id,
  className,
  showName = true,
}: {
  id: ProductLogoId;
  className?: string;
  showName?: boolean;
}) {
  const product = PRODUCTS[id];

  return (
    <span className={cn("product-logo", `is-${id}`, className)}>
      <span className="product-logo-mark" aria-hidden="true">
        <img src={product.src} alt="" loading="eager" decoding="sync" referrerPolicy="no-referrer" />
      </span>
      {showName ? <span>{product.label}</span> : null}
    </span>
  );
}
