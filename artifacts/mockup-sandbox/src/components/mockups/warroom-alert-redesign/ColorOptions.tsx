const colors = [
  { name: "Dark Navy", value: "#0f172a", light: false },
  { name: "Slate Dark", value: "#1e293b", light: false },
  { name: "Charcoal", value: "#18181b", light: false },
  { name: "Deep Blue", value: "#0a1628", light: false },
  { name: "Stone", value: "#f5f5f4", light: true },
  { name: "Cool Gray", value: "#f1f5f9", light: true },
];

export default function ColorOptions() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-xl font-semibold text-gray-800 mb-6 text-center">Background Color Options</h1>
        <div className="grid grid-cols-3 gap-4">
          {colors.map((color) => (
            <div key={color.name} className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <div
                className="h-40 flex items-center justify-center"
                style={{ backgroundColor: color.value }}
              >
                <div
                  className="text-center px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: color.light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: color.light ? "#374151" : "#e2e8f0" }}
                  >
                    Component Preview Server
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: color.light ? "#9ca3af" : "#94a3b8" }}
                  >
                    Sample page text
                  </p>
                </div>
              </div>
              <div className="bg-white px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{color.name}</span>
                <span className="text-xs text-gray-400 font-mono">{color.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
