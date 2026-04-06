import { useCallback, useEffect, useState } from 'react';

/**
 * A reusable hook to provide a temporary highlight effect (e.g., breathing border)
 * that automatically turns off after a specified duration.
 *
 * @param durationMs - The duration in milliseconds before the highlight is removed. Default is 6000ms (6s).
 * @returns [isHighlighted, triggerHighlight]
 */
export function useHighlightEffect(durationMs = 6000) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  const triggerHighlight = useCallback(() => {
    setIsHighlighted(true);
  }, []);

  useEffect(() => {
    if (!isHighlighted) {
      return;
    }

    const timer = setTimeout(() => {
      setIsHighlighted(false);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isHighlighted, durationMs]);

  return [isHighlighted, triggerHighlight] as const;
}
