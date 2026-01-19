// Simple authentication utilities using localStorage

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface AuthUser extends User {
  password: string
}

const USERS_KEY = "privatebread_users"
const CURRENT_USER_KEY = "privatebread_current_user"

export function getUsers(): AuthUser[] {
  if (typeof window === "undefined") return []
  const users = localStorage.getItem(USERS_KEY)
  return users ? JSON.parse(users) : []
}

function saveUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function register(
  name: string,
  email: string,
  password: string,
): { success: boolean; error?: string; user?: User } {
  const users = getUsers()

  if (users.find((u) => u.email === email)) {
    return { success: false, error: "E-Mail bereits registriert" }
  }

  const newUser: AuthUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  saveUsers(users)

  const { password: _, ...userWithoutPassword } = newUser
  setCurrentUser(userWithoutPassword)

  return { success: true, user: userWithoutPassword }
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers()
  const user = users.find((u) => u.email === email && u.password === password)

  if (!user) {
    return { success: false, error: "Ungültige E-Mail oder Passwort" }
  }

  const { password: _, ...userWithoutPassword } = user
  setCurrentUser(userWithoutPassword)

  return { success: true, user: userWithoutPassword }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem(CURRENT_USER_KEY)
  return user ? JSON.parse(user) : null
}

function setCurrentUser(user: User) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}
