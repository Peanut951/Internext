import { getPublicPricePresentation, type PricedProduct } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type ProductPriceProps = {
  product: PricedProduct;
  role?: string | null;
  className?: string;
  currentClassName?: string;
  originalClassName?: string;
  layout?: "inline" | "stacked";
};

const ProductPrice = ({
  product,
  role,
  className,
  currentClassName,
  originalClassName,
  layout = "stacked",
}: ProductPriceProps) => {
  const presentation = getPublicPricePresentation(product, role);

  return (
    <span
      className={cn(
        "flex min-w-0",
        layout === "inline" ? "flex-wrap items-baseline gap-x-2 gap-y-1" : "flex-col gap-1",
        className,
      )}
    >
      {presentation.originalPrice ? (
        <span
          className={cn("text-sm font-medium text-muted-foreground line-through", originalClassName)}
          aria-label={`Previous price ${presentation.originalPrice}`}
        >
          {presentation.originalPrice}
        </span>
      ) : null}
      <span className={currentClassName}>{presentation.currentPrice}</span>
    </span>
  );
};

export default ProductPrice;

