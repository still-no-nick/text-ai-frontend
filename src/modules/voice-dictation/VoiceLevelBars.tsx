import { cn } from "../../shared/lib/cn";

type Props = {
  level: number;
};

export const VoiceLevelBars = ({ level }: Props) => {
  const bars = [0.4, 0.6, 0.8, 0.6, 0.4];

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {bars.map((multiplier, i) => {
        const height = Math.max(20, level * 100 * multiplier);
        return (
          <div
            key={i}
            className={cn("w-1 bg-primary rounded-full transition-all duration-100")}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
};
