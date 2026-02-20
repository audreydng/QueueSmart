"use client"

export default function HistoryScreen() {
  const history = [
    { id: 1, service: "Houston Clinic", date: "Feb 10, 2026", outcome: "Served" },
    { id: 2, service: "Pasadena Clinic", date: "Feb 5, 2026", outcome: "Left queue" },
  ]

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Queue History</h1>

      <div className="bg-white rounded-lg shadow divide-y">
        {history.map((item) => (
          <div key={item.id} className="p-4 flex justify-between">
            <div>
              <p className="font-medium">{item.service}</p>
              <p className="text-sm text-gray-500">{item.date}</p>
            </div>
            <span className="text-sm">{item.outcome}</span>
          </div>
        ))}
      </div>
    </div>
  )
}