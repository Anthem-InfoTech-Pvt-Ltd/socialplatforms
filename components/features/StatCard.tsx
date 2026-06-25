interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      {trend && (
        <div
          className={`text-sm font-medium ${
            trend.isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {trend.isPositive ? '+' : '-'}{trend.value}% from last month
        </div>
      )}
    </div>
  );
}
