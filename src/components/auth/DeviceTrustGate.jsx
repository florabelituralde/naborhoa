import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { readTrust, writeTrust } from "@/lib/deviceTrust";

export default function DeviceTrustGate() {
  const [status, setStatus] = useState("checking"); // checking | trusted | untrusted
  const [user, setUser] = useState(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (readTrust(u.id)) {
          setStatus("trusted");
        } else {
          setStatus("untrusted");
          sendCode(u);
        }
      } catch {
        // Auth is enforced by ProtectedRoute; fall through to render the app.
        setStatus("trusted");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async (u) => {
    setSending(true);
    setError("");
    try {
      await base44.functions.invoke("device-verification", { action: "send" });
    } catch {
      setError("We couldn't send a code. Tap resend to try again.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    setError("");
    setVerifying(true);
    try {
      const res = await base44.functions.invoke("device-verification", {
        action: "verify",
        code,
      });
      if (res?.data?.verified) {
        writeTrust(user.id);
        setStatus("trusted");
      } else {
        throw new Error("Verification failed");
      }
    } catch (e) {
      setError(
        e?.response?.data?.error || e?.message || "Invalid or expired code"
      );
      setVerifying(false);
    }
  };

  const signOut = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "trusted") {
    return <Outlet />;
  }

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Verify it's you"
      subtitle={
        sending
          ? "Sending a verification code..."
          : `We sent a code to ${user?.email || "your email"} to confirm this device.`
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-center mb-6">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          autoFocus
          autoComplete="one-time-code"
        >
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
      <Button
        className="w-full h-12 font-medium"
        onClick={verify}
        disabled={verifying || code.length < 6}
      >
        {verifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify"
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Didn't receive it?{" "}
        <button
          onClick={() => sendCode(user)}
          className="text-primary font-medium hover:underline"
          disabled={sending}
        >
          {sending ? "Sending..." : "Resend"}
        </button>
      </p>
      <button
        onClick={signOut}
        className="mt-6 w-full text-sm text-muted-foreground hover:underline"
      >
        Sign out
      </button>
    </AuthLayout>
  );
}