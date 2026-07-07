import React, { useState, useEffect, useRef } from "react";
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
import GuestAccess from "@/components/auth/GuestAccess";
import { friendlyAuthError } from "@/lib/authErrors";

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
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const profileSaveRef = useRef(null);
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem("naborIntroSeenRegister") !== "1"
  );

  // Skip the registration screen for anyone already signed in.
  useRedirectIfAuthed();

  const dismissIntro = () => {
    sessionStorage.setItem("naborIntroSeenRegister", "1");
    setShowIntro(false);
  };

  // Resend-button cooldown countdown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-submit the OTP the moment all six digits are entered, so verification
  // feels instant — no need to hunt for the Verify button.
  useEffect(() => {
    if (showOtp && !otpPending && !loading && !verified && otpCode.length === 6) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, otpPending]);

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
    // Transition to the email-code screen immediately so the user sees
    // progress instead of a frozen form while the register request runs.
    setShowOtp(true);
    setOtpPending(true);
    setLoading(true);
    try {
      await base44.auth.register({ email: email.trim(), password });
      setOtpPending(false);
      setResendCooldown(30);
    } catch (err) {
      setShowOtp(false);
      setOtpPending(false);
      setError(friendlyAuthError(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (!result?.access_token) {
        throw new Error("Verification failed. Please try again.");
      }
      base44.auth.setToken(result.access_token);
      // Reveal the success screen the instant the token is set. Persisting the
      // role and registering device trust run in the background; the Continue
      // button awaits that work before navigating, so nothing is lost even if
      // the user clicks through quickly.
      setVerified(true);
      setLoading(false);
      profileSaveRef.current = (async () => {
        try {
          const me = await base44.auth.me();
          writeTrust(me.id);
        } catch {}
        try {
          await base44.functions.invoke("set-user-role", {
            role,
            ...(role === "hoa_admin" ? { pending_org_name: orgName } : {}),
            ...(role === "homeowner" && isBoardMember ? { board_member_status: "pending" } : {}),
          });
        } catch {
          toast({
            title: "Profile save failed",
            description: "Your account is ready, but we couldn't save your role. Please set it from Account settings.",
            variant: "destructive",
          });
        }
      })();
    } catch (err) {
      setError(friendlyAuthError(err, "Something went wrong. Please try again."));
      setLoading(false);
    }
  };

  const handleResend = async () => {
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

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/choose-role");
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", "/choose-role");
  };

  if (verified) {
    const isManager = role === "hoa_admin";
    const redirect = async () => {
      setRedirecting(true);
      try {
        // Cap the background role-save wait so a stalled call can never trap the
        // user on "Finishing up…". The save is fast and best-effort.
        await Promise.race([
          profileSaveRef.current,
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch {}
      window.location.href = isManager ? "/onboarding" : "/join";
    };
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="You're all set!"
        subtitle={isManager ? "Let's set up your community" : "Let's get you into your community"}
      >
        <BiometricEnrollment email={email} name={fullName} />
        <Button className="w-full h-12 font-medium" onClick={redirect} disabled={redirecting}>
          {redirecting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finishing up…</>) : "Continue"}
        </Button>
      </AuthLayout>
    );
  }

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
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpPending || otpCode.length < 6}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>) : otpPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code…</>) : ("Verify")}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} disabled={otpPending || resendCooldown > 0} className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline">
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </button>
        </p>
        {otpPending && (
          <button
            type="button"
            onClick={() => { setShowOtp(false); setOtpPending(false); setError(""); }}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Cancel and go back
          </button>
        )}
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

      <GuestAccess />
      <LegalLinks className="mt-6" />
    </AuthLayout>
    </>
  );
}