// This file documents the authentication and role-based access control (RBAC) system

/**
 * SICPL Portal - Authentication & RBAC System
 * 
 * USER ROLES:
 * 1. mahasiswa (Student)
 *    - View: Personal CPL progress, grades, course history
 *    - Redirect: /dashboard/mahasiswa
 * 
 * 2. dosen (Lecturer)
 *    - View: Classes, student list, grades, course materials
 *    - Redirect: /dashboard/dosen
 * 
 * 3. kaprodi (Program Head)
 *    - View: Program statistics, student list, academic performance
 *    - Redirect: /dashboard/kaprodi
 * 
 * 4. admin (Administrator)
 *    - View: System logs, user management, database operations
 *    - Redirect: /dashboard/admin
 * 
 * AUTHENTICATION FLOW:
 * 1. User logs in at /page.tsx (login page)
 * 2. Credentials are validated against usersSeeder data
 * 3. Session data is stored in sessionStorage
 * 4. User is redirected to their respective dashboard: /dashboard/{role}
 * 
 * PROTECTED ROUTES:
 * - /dashboard/mahasiswa - Only accessible by mahasiswa role
 * - /dashboard/dosen - Only accessible by dosen role
 * - /dashboard/kaprodi - Only accessible by kaprodi role
 * - /dashboard/admin - Only accessible by admin role
 * 
 * AUTH GUARD IMPLEMENTATION:
 * - Each dashboard page includes useEffect hook to verify user session
 * - If no valid session found, user is redirected to login page
 * - If user tries to access dashboard they don't have permission for, they are redirected to their own dashboard
 * 
 * USER SEEDER DATA LOCATION:
 * - File: app/data/users.ts
 * - Contains 4 default users (one per role)
 * - Credentials format: { username, password: 'password123' }
 * 
 * SESSION DATA STRUCTURE:
 * {
 *   id: string;
 *   username: string;
 *   name: string;
 *   role: UserRole; // 'mahasiswa' | 'kaprodi' | 'dosen' | 'admin'
 *   identifier: string; // NIM for mahasiswa, NIP for dosen/kaprodi, ADM-xxx for admin
 *   initials: string;
 *   prodi: string;
 * }
 */

export const AUTH_SYSTEM_READY = true;
