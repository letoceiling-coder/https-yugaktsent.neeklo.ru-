import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl font-semibold text-foreground">Страница не найдена</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Возможно, адрес набран с ошибкой или объект больше не опубликован.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/catalog"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            В каталог
          </a>
          <a
            href="/"
            className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium hover:bg-muted/50"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
