import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import * as authApi from '../api/auth'
import { clearToken, getToken, setToken } from '../api/client'
import type { User } from '../api/types'

interface JwtPayload {
  sub: string
  role: string
  exp: number
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isTokenValid(token: string): boolean {
  try {
    const payload = jwtDecode<JwtPayload>(token)
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function loadUser() {
    const token = getToken()
    if (!token || !isTokenValid(token)) {
      clearToken()
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const me = await authApi.getMe()
      setUser(me)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const { access_token } = await authApi.login(email, password)
    setToken(access_token)
    const me = await authApi.getMe()
    setUser(me)
    return me
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
