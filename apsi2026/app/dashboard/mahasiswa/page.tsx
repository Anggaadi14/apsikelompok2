// app/mahasiswa/dashboard/page.tsx
"use client";

import React from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { useMahasiswaDashboard } from "@/app/components/mahasiswa/hoks";
import { Navbar }      from "@/app/components/mahasiswa/navbar";
import { Sidebar }     from "@/app/components/mahasiswa/sidebar";
import { ProfileCard } from "@/app/components/mahasiswa/profilecard";
import { DashboardTab } from "@/app/components/mahasiswa/dashboardtab";
import { CPLTab }       from "@/app/components/mahasiswa/cpltab";
import { RiwayatTab }   from "@/app/components/mahasiswa/riwayattab";

export default function MahasiswaDashboard() {
  const state = useMahasiswaDashboard();

  return (
    <ProtectedRoute allowedRoles={["mahasiswa"]}>
      <div className="size-full flex flex-col bg-gray-50">

        <Navbar
          selectedSemester={state.selectedSemester}
          onSemesterChange={state.setSelectedSemester}
          onLogout={state.handleLogout}
        />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            activeTab={state.activeTab}
            onTabChange={state.setActiveTab}
          />

          <main className="flex-1 overflow-y-auto p-6">
            <ProfileCard />

            {state.activeTab === 'dashboard' && (
              <DashboardTab onNavigateToCpl={() => state.setActiveTab('cpl')} />
            )}
            {state.activeTab === 'cpl' && (
              <CPLTab
                cplSubTab={state.cplSubTab}
                onSubTabChange={state.setCplSubTab}
                expandedCPL={state.expandedCPL}
                onExpandCPL={state.setExpandedCPL}
              />
            )}
            {state.activeTab === 'riwayat' && (
              <RiwayatTab
                filteredData={state.filteredData}
                totalData={19}
                searchMK={state.searchMK}
                onSearchChange={state.setSearchMK}
                filterSemester={state.filterSemester}
                onFilterChange={state.setFilterSemester}
                sortBy={state.sortBy}
                sortOrder={state.sortOrder}
                onSortChange={(col, order) => { state.setSortBy(col); state.setSortOrder(order); }}
                onReset={state.resetFilter}
              />
            )}
          </main>
        </div>

      </div>
    </ProtectedRoute>
  );
}