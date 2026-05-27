"use client";

interface RiwayatTabProps {
  filteredData: any[];
  totalData: number;
  searchMK: string;
  onSearchChange: (val: string) => void;
  filterSemester: string;
  onFilterChange: (val: string) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (col: any, order: any) => void;
  onReset: () => void;
}

export function RiwayatTab({
  filteredData,
  totalData,
  searchMK,
  onSearchChange,
  filterSemester,
  onFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onReset,
}: RiwayatTabProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat Nilai</h1>

      {/* Filter */}
      <div className="flex gap-4">
        <input
          value={searchMK}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari matkul..."
          className="border px-3 py-2 rounded"
        />

        <select
          value={filterSemester}
          onChange={(e) => onFilterChange(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">Semua</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>

        <button onClick={onReset} className="bg-gray-200 px-3 py-2 rounded">
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Semester</th>
              <th className="p-3">Nilai</th>
              <th className="p-3">Huruf</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{item.kode}</td>
                <td className="p-3">{item.nama}</td>
                <td className="p-3">{item.semester}</td>
                <td className="p-3">{item.nilaiAkhir}</td>
                <td className="p-3">{item.huruf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">
        Menampilkan {filteredData.length} dari {totalData} data
      </p>
    </div>
  );
}