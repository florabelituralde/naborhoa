import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import IntroPreview from "@/components/auth/IntroPreview";
import LegalLinks from "@/components/LegalLinks";
import useRedirectIfAuthed from "@/hooks/useRedirectIfAuthed";
import GuestAccess from "@/components/auth/GuestAccess";
import { isUnverifiedError } from "@/lib/authErrors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState(false);
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem("naborIntroSeenLogin") !== "1"
  );

  // Skip the login screen for anyone already signed in.
  useRedirectIfAuthed();

  const dismissIntro = () => {
    sessionStorage.setItem("naborIntroSeenLogin", "1");
    setShowIntro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCredentialsError(false);
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      window.location.href = "/";
    } catch (err) {
      if (isUnverifiedError(err)) {
        setCredentialsError(false);
        setError("Your email isn't verified yet. Please complete your registration to verify your email, then log in.");
      } else {
        // The platform returns a generic "Invalid email or password" for both a
        // wrong password and an email that was never registered (it intentionally
        // doesn't reveal which). Surface the error, and offer a direct path to
        // registration so users without an account can go set one up.
        setCredentialsError(true);
        setError("Incorrect email or password. If you don't have an account yet, you'll need to register first.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", "/");
  };

  return (
    <>
    <AnimatePresence>
      {showIntro && <IntroPreview onDismiss={dismissIntro} />}
    </AnimatePresence>
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-3 mb-6">
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleGoogle}
        >
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleApple}
        >
          <AppleIcon className="w-5 h-5 mr-2" />
          Continue with Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <p>{error}</p>
          {credentialsError && (
            <Link
              to="/register"
              className="inline-flex items-center gap-1 mt-2 font-semibold underline hover:opacity-80"
            >
              Create an account →
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <GuestAccess />
      <LegalLinks className="mt-6" />
    </AuthLayout>
    </>
  );
}