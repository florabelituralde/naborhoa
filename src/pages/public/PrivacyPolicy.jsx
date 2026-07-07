import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Shield } from "lucide-react";

const UPDATED = "July 6, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to="/login" className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-white font-semibold">Privacy Policy</h1>
        </div>
        <div className="w-9" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Privacy Policy</h2>
            <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <p>
            Ituralde Digital Solutions LLC ("we," "us," or "our") operates the Nabor HOA mobile and web
            application (the "Service") that helps homeowners associations and residential communities
            manage requests, dues, announcements, events, polls, elections, and documents. This Privacy
            Policy describes how we collect, use, and protect your information when you use the Service.
          </p>

          <section>
            <h3 className="font-semibold text-lg mb-2">1. Information We Collect</h3>
            <p className="mb-2"><strong>Account information:</strong> Your name, email address, and password (stored securely and hashed). When you sign in with Google or Apple, we receive the name and email associated with that account.</p>
            <p className="mb-2"><strong>Profile & community data:</strong> Your role (homeowner or HOA manager), community membership, property address, and join codes you use.</p>
            <p className="mb-2"><strong>Content you create:</strong> Maintenance and repair requests, messages to the AI assistant, announcements, poll votes, election votes, event RSVPs, and documents you upload.</p>
            <p className="mb-2"><strong>Payment information:</strong> Dues and subscription payments are processed securely by our payment providers. Platform subscriptions are handled by Base44 Payments. When your HOA connects its own account, resident dues and bill payments are processed by Stripe and paid out directly to your HOA's bank account. We never store your full card or bank account number on our servers; our providers retain the payment credentials, and we keep only transaction records (amount, date, status, and the last four digits) for your history.</p>
            <p className="mb-2"><strong>Biometric &amp; device security data:</strong> If you enable biometric sign-in (Face ID, Touch ID, or fingerprint), the biometric data itself never leaves your device and is never sent to us — we store only a public credential identifier used to verify future logins. To protect your account, we may also store a hashed device-verification code and a record of trusted devices.</p>
            <p className="mb-2"><strong>Usage data:</strong> Device type, app version, and interaction logs used to improve the Service and troubleshoot issues.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">2. How We Use Your Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and manage your account and community membership.</li>
              <li>To process dues payments and subscription billing, and to route payments directly to your HOA's connected account where applicable.</li>
              <li>To verify your identity, enable biometric sign-in, and recognize trusted devices for account security.</li>
              <li>To route maintenance requests to your HOA board and notify you of status updates.</li>
              <li>To send announcements, reminders, and notifications about your community.</li>
              <li>To provide an AI assistant that answers questions based on your community's documents.</li>
              <li>To provide customer support and improve the Service.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">3. How We Share Your Information</h3>
            <p className="mb-2">We do not sell your personal information. We share data only:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>With your community's HOA board members, so they can manage requests, dues, and membership.</li>
              <li>With our payment processors (Base44 Payments and Stripe) to complete transactions and, for connected HOA accounts, to pay funds directly to your HOA.</li>
              <li>With service providers who help us operate the platform (hosting, email delivery, analytics), under contracts that protect your data.</li>
              <li>When required by law or to protect our rights and the safety of others.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">4. Data Retention & Account Deletion</h3>
            <p>
              We retain your data for as long as your account is active. You can delete your account at
              any time from the Account page in the app. When you request deletion, your account and
              associated data are permanently removed within 30 days. If you are an HOA manager, deleting
              your account also removes your community's data unless another board member assumes
              ownership.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">5. Data Security</h3>
            <p>
              We use industry-standard safeguards including encrypted data transmission (TLS),
              hashed passwords, and access controls. No method of transmission or storage is fully
              secure, but we work to protect your information using reasonable measures.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">6. Children's Privacy</h3>
            <p>
              The Service is not intended for children under 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us information, contact us
              and we will delete it.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">7. Your Privacy Rights</h3>
            <p>
              Depending on where you live, you may have the right to access, correct, export, or delete
              your personal data. You can exercise most of these rights directly in the app, or by
              contacting us. Residents of California (CCPA) and the EU/UK (GDPR) have additional rights
              regarding their data.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">8. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy in the app and updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">9. Contact Us</h3>
            <p>
              If you have questions about this Privacy Policy or your data, please contact Ituralde
              Digital Solutions LLC through the Help section in the app, or contact your community's
              HOA board.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-primary font-medium hover:underline text-sm">
            Back to Nabor HOA
          </Link>
        </div>
      </div>
    </div>
  );
}