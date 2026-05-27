// User Database Seeder
// This file contains predefined user credentials for testing

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "kaprodi" | "admin" | "dosen" | "mahasiswa";
}

// Seeded user data
export const seededUsers: User[] = [
  {
    id: "user-001",
    name: "Dr. Budi Santoso",
    email: "kaprodi@university.ac.id",
    password: "kaprodi123",
    role: "kaprodi",
  },
  {
    id: "user-002",
    name: "Administrator System",
    email: "admin@university.ac.id",
    password: "admin123",
    role: "admin",
  },
  {
    id: "user-003",
    name: "Prof. Siti Nurhaliza",
    email: "dosen@university.ac.id",
    password: "dosen123",
    role: "dosen",
  },
  {
    id: "1",
    name: "Ahmad Fadli",
    email: "fadli@mail.com",
    password: "123",
    role: "mahasiswa",
    nim: "I0320025",
    angkatan: 2020,
    semester: 5,
    ipk: 3.75,
    prodi: "Teknik Industri"
  },
  {
    id: "2",
    name: "Michael Jamie",
    email: "mekel@mail.com",
    password: "12345",
    role: "mahasiswa",
    nim: "V3423051",
    angkatan: 2023,
    semester: 6,
    ipk: 3.8,
    prodi: "Teknik Informatika"
  },
  {
    id: "user-005",
    name: "Dr. Eka Prasetya",
    email: "eka.prasetya@university.ac.id",
    password: "dosen456",
    role: "dosen",
  },
  {
    id: "user-006",
    name: "Rini Wijaya",
    email: "rini.wijaya@student.university.ac.id",
    password: "mahasiswa456",
    role: "mahasiswa",
  },
];

// Function to find user by email and password
export function findUser(
  email: string,
  password: string
): Omit<User, "password"> | null {
  const user = seededUsers.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return null;
  }

  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Function to get all users (admin only - for reference)
export function getAllUsers(): Omit<User, "password">[] {
  return seededUsers.map(({ password: _, ...user }) => user);
}
