import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, CheckCircle2 } from "lucide-react";

// Enroll-only biometric setup: registers a WebAuthn credential on this device
// and stores the credential id + public key for future biometric login. It does
// NOT log the user in (the platform owns auth); it only stores the credential.
export default function BiometricEnrollment({ email, name }) {
  const supported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  const [status, setStatus] = useState("idle"); // idle | enrolling | done | error
  const [error, setError] = useState("");

  if (!supported) return null;

  const enroll = async () => {
    setError("");
    setStatus("enrolling");
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const uid = new Uint8Array(16);
      crypto.getRandomValues(uid);

      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Nabor" },
          user: {
            id: uid,
            name: email || "user",
            displayName: name || "User",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            userVerification: "preferred",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      });

      const rawId = btoa(
        String.fromCharCode(...new Uint8Array(cred.rawId))
      );
      let publicKey = "";
      if (cred.response && cred.response.getPublicKey) {
        const buf = cred.response.getPublicKey();
        if (buf) {
          publicKey = btoa(String.fromCharCode(...new Uint8Array(buf)));
        }
      }

      await base44.entities.BiometricCredential.create({
        credential_id: rawId,
        public_key: publicKey,
        device_label:
          (navigator.userAgentData && navigator.userAgentData.platform) ||
          navigator.platform ||
          "Device",
      });

      setStatus("done");
    } catch (e) {
      setError(
        e?.message || "Biometric setup was canceled or failed. You can skip and try later."
      );
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-2 mb-2">
        <CheckCircle2 className="w-9 h-9 text-primary" />
        <p className="text-sm font-medium">Biometric login is set up</p>
        <p className="text-xs text-muted-foreground">
          This device's biometric credential is saved for future access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-3 py-2 mb-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Fingerprint className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">Set up biometric login</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use Face ID or Touch ID for faster access on this device. You can skip
          and set it up later.
        </p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        className="w-full h-11 font-medium"
        onClick={enroll}
        disabled={status === "enrolling"}
      >
        {status === "enrolling" ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Setting up...
          </>
        ) : (
          "Enable biometric"
        )}
      </Button>
    </div>
  );
}