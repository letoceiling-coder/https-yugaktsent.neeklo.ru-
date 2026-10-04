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
  /**
   * Подпись под ручкой. Если задана — значения видно сразу при перетаскивании,
   * не дожидаясь, пока отработает дебаунс и обновятся поля «от» и «до».
   */
  formatValue?: (value: number) => string;
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
  formatValue,
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

  const thumbClass =
    'relative block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:shadow-[0_2px_8px_rgba(0,0,0,0.25)]';

  /** Подпись живёт под ручкой и едет вместе с ней, поэтому значение видно всегда. */
  const caption = (text: string) => (
    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">
      {text}
    </span>
  );

  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center py-2',
        formatValue && 'mb-5',
        className,
      )}
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
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label="Значение от" className={thumbClass}>
        {formatValue ? caption(formatValue(local[0])) : null}
      </SliderPrimitive.Thumb>
      <SliderPrimitive.Thumb aria-label="Значение до" className={thumbClass}>
        {formatValue ? caption(formatValue(local[1])) : null}
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
};

export default RangeSlider;
