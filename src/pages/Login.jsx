import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import IntroPreview from "@/components/auth/IntroPreview";
import LegalLinks from "@/components/LegalLinks";
import { toast } from "@/components/ui/use-toast";
import useRedirectIfAuthed from "@/hooks/useRedirectIfAuthed";
import GuestAccess from "@/components/auth/GuestAccess";
import { friendlyAuthError, isUnverifiedError } from "@/lib/authErrors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem("naborIntroSeenLogin") !== "1"
  );

  // Skip the login screen for anyone already signed in.
  useRedirectIfAuthed();

  const dismissIntro = () => {
    sessionStorage.setItem("naborIntroSeenLogin", "1");
    setShowIntro(false);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerifyOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (!result?.access_token) {
        throw new Error("Verification failed. Please try again.");
      }
      base44.auth.setToken(result.access_token);
      window.location.href = "/";
    } catch (err) {
      setError(friendlyAuthError(err, "Verification failed. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await base44.auth.resendOtp(email.trim());
      setResendCooldown(30);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(friendlyAuthError(err, "Failed to resend code"));
    }
  };

  // Auto-submit the OTP the moment all six digits are entered.
  useEffect(() => {
    if (showOtp && !otpPending && !otpLoading && otpCode.length === 6) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, otpPending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      window.location.href = "/";
    } catch (err) {
      // If the account exists but the email was never verified, jump to the
      // OTP screen so the user can verify and get in without leaving login.
      if (isUnverifiedError(err)) {
        setError("");
        setShowOtp(true);
        setOtpPending(true);
        try {
          await base44.auth.resendOtp(email.trim());
          setResendCooldown(30);
        } catch (resendErr) {
          toast({ title: "Couldn't send code", description: friendlyAuthError(resendErr), variant: "destructive" });
        }
        setOtpPending(false);
      } else {
        setError(friendlyAuthError(err, "Incorrect email or password. Please try again."));
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

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={otpPending ? `Sending a code to ${email.trim()}…` : `We sent a code to ${email.trim()}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerifyOtp} disabled={otpLoading || otpPending || otpCode.length < 6}>
          {otpLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>) : otpPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code…</>) : ("Verify")}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResendOtp} disabled={otpPending || resendCooldown > 0} className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline">
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </button>
        </p>
        <button
          type="button"
          onClick={() => { setShowOtp(false); setOtpCode(""); setError(""); }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to login
        </button>
      </AuthLayout>
    );
  }

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
          {error}
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