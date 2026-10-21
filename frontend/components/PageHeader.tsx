interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-nowrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
