"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/app/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    if (
      allowedRoles &&
      allowedRoles.length > 0 &&
      user &&
      !allowedRoles.includes(user.role)
    ) {
      const dashboardMap: Record<UserRole, string> = {
        kaprodi: "/dashboard/kaprodi",
        admin: "/dashboard/admin",
        dosen: "/dashboard/dosen",
        mahasiswa: "/dashboard/mahasiswa",
      };

      router.replace(dashboardMap[user.role]);
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Prevent render sebelum redirect selesai
  if (
    !isAuthenticated ||
    (allowedRoles &&
      allowedRoles.length > 0 &&
      user &&
      !allowedRoles.includes(user.role))
  ) {
    return null;
  }

  return <>{children}</>;
}