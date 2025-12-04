"use client"
import { useState } from "react"
import { useLoginMutation } from "../redux/api/authApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
export default function LoginPage({ onLogin }) {
  const [login, { isLoading }] = useLoginMutation()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      const result = await login({ email, password }).unwrap() 
      console.log("Login successful:", result)
      // result ichida token bor deb hisoblaymiz (backendingizga qarab o'zgartiring)
      localStorage.setItem("token", result.access_token.access)
        
      // agar onLogin funksiyasi mavjud bo‘lsa, chaqiramiz
      onLogin?.()
      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      setError(err?.data?.message || "Email or password is incorrect")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>

            {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Demo credentials: <br />
                Email: any@email.com <br />
                Password: 123456
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
