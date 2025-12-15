import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "default";
  className?: string;
}

export const FavoriteButton = ({
  isFavorite,
  onClick,
  size = "default",
  className,
}: FavoriteButtonProps) => {
  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "default"}
      className={cn(
        size === "sm" ? "h-8 w-8" : "h-7 px-2",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Star
        className={cn(
          size === "sm" ? "h-4 w-4" : "h-3 w-3",
          isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
        )}
      />
    </Button>
  );
};
