export default function KpiCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-gray-100 dark:border-white/10">
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-400 mt-1">{sub}</div> : null}
    </div>
  );
}
