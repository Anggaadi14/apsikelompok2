"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { riwayatNilaiData } from './types';
import type { TabType, CplSubTab, SortBy, SortOrder } from './types';

export function useMahasiswaDashboard() {
  const router = useRouter();
  const { logout } = useAuth();

  const [selectedSemester, setSelectedSemester] = useState('Ganjil 2024/2025');
  const [activeTab, setActiveTab]               = useState<TabType>('dashboard');
  const [expandedCPL, setExpandedCPL]           = useState<number | null>(null);
  const [cplSubTab, setCplSubTab]               = useState<CplSubTab>('grafik');
  const [sortBy, setSortBy]                     = useState<SortBy>('semester');
  const [sortOrder, setSortOrder]               = useState<SortOrder>('asc');
  const [filterSemester, setFilterSemester]     = useState<string>('all');
  const [searchMK, setSearchMK]                 = useState('');

  const handleLogout = () => {
    logout();               // hapus user dari context + localStorage
    router.replace('/');    // redirect ke login
  };

  const resetFilter = () => {
    setSearchMK('');
    setFilterSemester('all');
    setSortBy('semester');
    setSortOrder('asc');
  };

  const getFilteredAndSortedData = () => {
    let filtered = [...riwayatNilaiData];

    if (filterSemester !== 'all')
      filtered = filtered.filter(item => item.semester === parseInt(filterSemester));

    if (searchMK)
      filtered = filtered.filter(item =>
        item.nama.toLowerCase().includes(searchMK.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchMK.toLowerCase())
      );

    filtered.sort((a, b) => {
      let cmp = 0;
      if      (sortBy === 'semester') cmp = a.semester - b.semester;
      else if (sortBy === 'nama')     cmp = a.nama.localeCompare(b.nama);
      else if (sortBy === 'nilai')    cmp = a.nilaiAkhir - b.nilaiAkhir;
      else if (sortBy === 'huruf')    cmp = a.huruf.localeCompare(b.huruf);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  };

  return {
    selectedSemester, setSelectedSemester,
    activeTab, setActiveTab,
    expandedCPL, setExpandedCPL,
    cplSubTab, setCplSubTab,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    filterSemester, setFilterSemester,
    searchMK, setSearchMK,
    handleLogout,
    resetFilter,
    filteredData: getFilteredAndSortedData(),
  };
}