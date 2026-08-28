type StatCardProps = {
    label: string
    value: number
  }
  
  export function StatCard({ label, value }: StatCardProps) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600">{label}</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      </div>
    )
  }