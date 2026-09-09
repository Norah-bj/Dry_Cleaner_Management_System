import type { LaundryStage } from '../../types/order';

interface OrderTimelineProps {
  currentStage: LaundryStage;
}

const STAGES: Array<{ key: LaundryStage; label: string }> = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'SORTING', label: 'Sorting' },
  { key: 'WASHING', label: 'Washing' },
  { key: 'DRYING', label: 'Drying' },
  { key: 'IRONING', label: 'Ironing' },
  { key: 'QUALITY_CHECK', label: 'QC' },
  { key: 'PACKING', label: 'Packing' },
  { key: 'READY', label: 'Ready' },
];

export function OrderTimeline({ currentStage }: OrderTimelineProps) {
  const activeIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="w-full py-3">
      <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-medium">
        <span>Garment Journey</span>
        <span>
          Stage {activeIndex + 1} of {STAGES.length}:{' '}
          <strong className="text-primary font-semibold">
            {STAGES[activeIndex]?.label || currentStage}
          </strong>
        </span>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -z-0 h-1 w-full -translate-y-1/2 bg-border" />

        {/* Progress track line */}
        <div
          className="absolute left-0 top-1/2 -z-0 h-1 -translate-y-1/2 bg-primary transition-all duration-300"
          style={{
            width: `${(activeIndex / (STAGES.length - 1)) * 100}%`,
          }}
        />

        {STAGES.map((s, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center group">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  isActive
                    ? 'bg-primary text-white ring-4 ring-primary-light ring-offset-1'
                    : isCompleted
                    ? 'bg-primary text-white'
                    : 'bg-surface border-2 border-border text-text-muted'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium hidden sm:block ${
                  isActive
                    ? 'text-primary font-bold'
                    : isCompleted
                    ? 'text-text'
                    : 'text-text-muted'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
