import { useEffect, useRef, useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

type Props = {
  min: number;
  max: number;
  step?: number;
  /** null — граница не задана: слева берём min, справа max */
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
  /** Задержка перед onChange, мс */
  debounceMs?: number;
  ariaLabel?: string;
  className?: string;
};

/**
 * Двухручечный слайдер диапазона. Внутреннее состояние ведёт ручки,
 * наружу значение уходит с дебаунсом, чтобы не дёргать фильтры на каждый пиксель.
 */
const RangeSlider = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  debounceMs = 300,
  ariaLabel = 'Диапазон',
  className,
}: Props) => {
  const [local, setLocal] = useState<[number, number]>([value[0] ?? min, value[1] ?? max]);
  const dragging = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Внешние изменения (сброс фильтров, ввод в поля) подхватываем, пока ручку не тянут
  useEffect(() => {
    if (dragging.current) return;
    setLocal([value[0] ?? min, value[1] ?? max]);
  }, [value, min, max]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const emit = (next: [number, number]) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange([next[0] <= min ? null : next[0], next[1] >= max ? null : next[1]]);
    }, debounceMs);
  };

  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center py-2', className)}
      min={min}
      max={max}
      step={step}
      value={local}
      minStepsBetweenThumbs={1}
      aria-label={ariaLabel}
      onPointerDown={() => {
        dragging.current = true;
      }}
      onValueChange={(next) => {
        const pair: [number, number] = [next[0] ?? min, next[1] ?? max];
        setLocal(pair);
        emit(pair);
      }}
      onValueCommit={(next) => {
        dragging.current = false;
        const pair: [number, number] = [next[0] ?? min, next[1] ?? max];
        clearTimeout(timer.current);
        onChange([pair[0] <= min ? null : pair[0], pair[1] >= max ? null : pair[1]]);
      }}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Цена от"
        className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <SliderPrimitive.Thumb
        aria-label="Цена до"
        className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </SliderPrimitive.Root>
  );
};

export default RangeSlider;
