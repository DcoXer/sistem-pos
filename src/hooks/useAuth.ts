import { useState, useEffect } from "react"
import { onAuthStateChanged, signInAnonymously } from "firebase/auth"
import type { User } from "firebase/auth"
import { auth } from "../firebase"

export function useAuth() {

  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {

    const initAuth = async () => {
      try {
        await signInAnonymously(auth)
      } catch (error) {
        console.error("Auth error:", error)
      }
    }

    initAuth()

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsInitializing(false)
    })

    return () => unsubscribe()

  }, [])

  return { user, isInitializing }

}