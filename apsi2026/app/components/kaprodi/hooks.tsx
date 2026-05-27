"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export function useKaprodiDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "mahasiswa" | "dosen" | "laporan"
  >("dashboard");

  const [search, setSearch] = useState("");
  const [filterProdi, setFilterProdi] = useState<string>("all");

  // logout kaprodi
  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  // dummy data (nanti bisa connect API)
  const stats = {
    totalMahasiswa: 120,
    totalDosen: 15,
    totalProdi: 3,
    aktifMahasiswa: 98,
  };

  // reset filter
  const resetFilter = () => {
    setSearch("");
    setFilterProdi("all");
  };

  return {
    // user info
    user,

    // navigation state
    activeTab,
    setActiveTab,

    // filter state
    search,
    setSearch,
    filterProdi,
    setFilterProdi,
    resetFilter,

    // actions
    handleLogout,

    // dashboard data
    stats,
  };
}