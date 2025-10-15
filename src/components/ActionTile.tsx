import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Palette = 'primary' | 'secondary' | 'accent' | 'success';

const palette: Record<Palette, { bg: string; icon: string }> = {
  primary: { bg: 'bg-primary/10', icon: 'text-primary' },
  secondary: { bg: 'bg-secondary/10', icon: 'text-secondary' },
  accent: { bg: 'bg-accent/10', icon: 'text-accent' },
  success: { bg: 'bg-success/10', icon: 'text-success' },
};

type ActionTileProps = {
  title: string;
  description: string;
  Icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  disabledMsg?: string;
  color?: Palette;
  className?: string;
};

export const ActionTile = ({ title, description, Icon, onClick, disabled, disabledMsg, color = 'primary', className }: ActionTileProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className={cn(
            'p-8 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background',
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer',
            className,
          )}
          onClick={() => (disabled ? null : onClick())}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
        >
          <div className="text-center space-y-4">
            <div className={cn('w-20 h-20 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform', palette[color].bg)}>
              <Icon className={cn('w-10 h-10', palette[color].icon)} />
            </div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </Card>
      </TooltipTrigger>
      {disabled && <TooltipContent>{disabledMsg ?? 'Faça login para acessar'}</TooltipContent>}
    </Tooltip>
  );
};

export default ActionTile;