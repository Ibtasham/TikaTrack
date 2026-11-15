import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

/**
 * Count up to `end` when the component mounts.
 *
 * Two details that are easy to get wrong:
 *   - the animation frame is cancelled on unmount, so navigating away mid-count
 *     cannot setState on a dead component;
 *   - the *final* value is what screen readers see. Announcing every
 *     intermediate frame makes a statistics bar unusable with a screen reader,
 *     so the animated text is `aria-hidden` and a stable copy is provided.
 */
export function AnimatedCounter({
  end,
  duration = 2000,
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // Respect the user's motion preference instead of animating regardless.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || duration <= 0) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out so the number settles instead of stopping abruptly.
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };

    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [end, duration]);

  const display = `${count.toLocaleString()}${suffix}`;

  return (
    <span className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{`${end.toLocaleString()}${suffix}`}</span>
    </span>
  );
}

export default AnimatedCounter;
