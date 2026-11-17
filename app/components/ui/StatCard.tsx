export function StatCard({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card">
      <span className="muted">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
