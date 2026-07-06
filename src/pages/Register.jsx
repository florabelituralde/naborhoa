import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Building2, Home, User, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import IntroPreview from "@/components/auth/IntroPreview";
import LegalLinks from "@/components/LegalLinks";
import { toast } from "@/components/ui/use-toast";
import { validatePassword, PASSWORD_RULES } from "@/lib/passwordPolicy";
import { writeTrust } from "@/lib/deviceTrust";
import BiometricEnrollment from "@/components/auth/BiometricEnrollment";
import useRedirectIfAuthed from "@/hooks/useRedirectIfAuthed";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("homeowner");
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem("naborIntroSeenRegister") !== "1"
  );

  // Skip the registration screen for anyone already signed in.
  useRedirectIfAuthed();

  const dismissIntro = () => {
    sessionStorage.setItem("naborIntroSeenRegister", "1");
    setShowIntro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (role === "hoa_admin" && !orgName.trim()) {
      setError("Please enter your company or neighborhood name");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!validatePassword(password)) {
      setError("Please choose a stronger password (see the requirements below).");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (!result?.access_token) {
        throw new Error("Verification failed. Please try again.");
      }
      base44.auth.setToken(result.access_token);
      // The device just completed email verification, so trust it for future
      // logins (the device-trust gate won't ask for a separate code here).
      try {
        const me = await base44.auth.me();
        writeTrust(me.id);
      } catch {}
      // Persist the role and setup context. This MUST succeed — routing after
      // login depends entirely on role/community_id, so a failure here would
      // strand the user. Let it throw so the error surfaces instead of
      // advancing to the confirmation screen with an unsaved role.
      await base44.auth.updateMe({
        role,
        ...(role === "hoa_admin" ? { pending_org_name: orgName } : {}),
        ...(role === "homeowner" && isBoardMember ? { board_member_status: "pending" } : {}),
      });
      // Logged in — show a brief confirmation, then route directly to the next
      // setup step based on the role we just saved (HOA managers set up their
      // community; homeowners join one). Using an explicit destination avoids a
      // race where a fresh profile read hasn't picked up the just-saved role yet.
      setVerified(true);
      setTimeout(() => {
        window.location.href = role === "hoa_admin" ? "/onboarding" : "/join";
      }, 1200);
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/choose-role");
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", "/choose-role");
  };

  if (verified) {
    const isManager = role === "hoa_admin";
    const redirect = () => {
      window.location.href = isManager ? "/onboarding" : "/join";
    };
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="You're all set!"
        subtitle={isManager ? "Let's set up your community" : "Let's get you into your community"}
      >
        <BiometricEnrollment email={email} name={fullName} />
        <Button className="w-full h-12 font-medium" onClick={redirect}>
          Continue
        </Button>
      </AuthLayout>
    );
  }

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
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
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>) : ("Verify")}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">Resend</button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <>
    <AnimatePresence>
      {showIntro && <IntroPreview onDismiss={dismissIntro} />}
    </AnimatePresence>
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Join your neighborhood community"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </>
      }
    >
      <div className="space-y-3 mb-6">
        <Button variant="outline" className="w-full h-12 text-sm font-medium" onClick={handleGoogle}>
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full h-12 text-sm font-medium" onClick={handleApple}>
          <AppleIcon className="w-5 h-5 mr-2" />
          Continue with Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>I am a...</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("homeowner")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${role === "homeowner" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Home className={`w-6 h-6 ${role === "homeowner" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Homeowner</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("hoa_admin")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${role === "hoa_admin" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Building2 className={`w-6 h-6 ${role === "hoa_admin" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">HOA Manager</span>
            </button>
          </div>
        </div>
        {role === "homeowner" && (
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
            <input
              type="checkbox"
              checked={isBoardMember}
              onChange={(e) => setIsBoardMember(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary shrink-0"
            />
            <span className="text-sm">
              <span className="font-medium">I'm a board member</span>
              <span className="block text-xs text-muted-foreground">Request access to the board portal. Your HOA manager will review and approve it.</span>
            </span>
          </label>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">{role === "hoa_admin" ? "Your Name" : "Full Name"}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="name" type="text" placeholder="Jane Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        {role === "hoa_admin" && (
          <div className="space-y-2">
            <Label htmlFor="orgName">Company / Neighborhood Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="orgName" type="text" placeholder="Maple Street HOA" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="pl-10 h-12" required />
            </div>
            <p className="text-xs text-muted-foreground">You'll set up your community details next.</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
          {password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}>
                    <span>{ok ? "✓" : "•"}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>) : ("Create account")}
        </Button>
      </form>

      <LegalLinks className="mt-6" />
    </AuthLayout>
    </>
  );
}