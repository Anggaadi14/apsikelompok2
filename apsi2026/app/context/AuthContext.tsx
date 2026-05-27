"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { findUser, UserRole } from "@/app/lib/userSeeder";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  nim?: string;
  angkatan?: number;
  semester?: number;
  ipk?: number;
  prodi?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load from storage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 500));

      const foundUser = findUser(email, password);

      if (!foundUser) {
        throw new Error("Email atau password salah");
      }

      const userData: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,

        nim: foundUser.nim,
        angkatan: foundUser.angkatan,
        semester: foundUser.semester,
        ipk: foundUser.ipk,
        prodi: foundUser.prodi,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Login gagal";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}