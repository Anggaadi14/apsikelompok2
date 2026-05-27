"use client";

interface CPLTabProps {
  cplSubTab: "grafik" | "detail";
  onSubTabChange: (tab: "grafik" | "detail") => void;
  expandedCPL: number | null;
  onExpandCPL: (id: number | null) => void;
}

const dummyCPL = [
  { id: 1, title: "CPL-01", desc: "Kemampuan analisis sistem" },
  { id: 2, title: "CPL-02", desc: "Kemampuan pemrograman" },
];

export function CPLTab({
  cplSubTab,
  onSubTabChange,
  expandedCPL,
  onExpandCPL,
}: CPLTabProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">CPL</h1>

      {/* Sub tab */}
      <div className="flex gap-4">
        <button
          onClick={() => onSubTabChange("grafik")}
          className={cplSubTab === "grafik" ? "font-bold" : ""}
        >
          Grafik
        </button>
        <button
          onClick={() => onSubTabChange("detail")}
          className={cplSubTab === "detail" ? "font-bold" : ""}
        >
          Detail
        </button>
      </div>

      {/* Content */}
      {cplSubTab === "grafik" && (
        <div className="p-4 bg-white rounded-xl shadow">
          <p>Grafik CPL (placeholder)</p>
        </div>
      )}

      {cplSubTab === "detail" && (
        <div className="space-y-3">
          {dummyCPL.map((cpl) => (
            <div key={cpl.id} className="bg-white rounded-xl shadow p-4">
              <div
                className="cursor-pointer font-semibold"
                onClick={() =>
                  onExpandCPL(expandedCPL === cpl.id ? null : cpl.id)
                }
              >
                {cpl.title}
              </div>

              {expandedCPL === cpl.id && (
                <p className="mt-2 text-gray-600">{cpl.desc}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}