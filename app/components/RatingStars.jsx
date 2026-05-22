const DEFAULT_STEPS = [1, 2, 3, 4, 5];

function toNormalizedRating(value = 0, max = 5) {
  const parsed = Math.round(Number(value) || 0);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > max) return max;
  return parsed;
}

function toStepValues(stepValues, max = 5) {
  const list = Array.isArray(stepValues) && stepValues.length
    ? stepValues
    : DEFAULT_STEPS;
  return list
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value > 0 && value <= max)
    .sort((a, b) => a - b);
}

export default function RatingStars({
  value = 0,
  onChange = null,
  disabled = false,
  max = 5,
  idPrefix = 'rating',
  className = 'uu-rating',
  buttonClassName = 'uu-rating-btn',
  stepValues = DEFAULT_STEPS,
}) {
  const normalized = toNormalizedRating(value, max);
  const steps = toStepValues(stepValues, max);

  return (
    <div className={className}>
      {steps.map((step) => (
        <button
          key={`${idPrefix}-${step}`}
          type="button"
          className={`${buttonClassName} ${normalized >= step ? 'active' : ''}`}
          onClick={() => {
            if (typeof onChange !== 'function' || disabled) return;
            onChange(normalized === step ? 0 : step);
          }}
          aria-pressed={normalized >= step ? 'true' : 'false'}
          disabled={disabled}
        >
          ★
        </button>
      ))}
    </div>
  );
}
