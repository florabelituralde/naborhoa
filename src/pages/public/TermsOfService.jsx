import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, FileText } from "lucide-react";

const UPDATED = "July 6, 2026";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to="/login" className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-white font-semibold">Terms of Service</h1>
        </div>
        <div className="w-9" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Terms of Service</h2>
            <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <p>
            Welcome to Nabor HOA. The Nabor HOA mobile and web application (the "Service") is operated
            by Ituralde Digital Solutions LLC. By creating an account or using the Service, you agree to
            these Terms of Service ("Terms"). If you do not agree, do not use the Service.
          </p>

          <section>
            <h3 className="font-semibold text-lg mb-2">1. Your Account</h3>
            <p>
              You must provide accurate information when registering and keep your login credentials
              secure. You are responsible for all activity under your account. You can delete your
              account at any time from the Account page in the app.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">2. Acceptable Use</h3>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose or to harm others.</li>
              <li>Upload content that is abusive, harassing, defamatory, or infringes someone's rights.</li>
              <li>Attempt to access another user's data or disrupt the Service.</li>
              <li>Reverse-engineer, scrape, or misuse the Service or its data.</li>
              <li>Use the AI assistant to generate harmful, misleading, or prohibited content.</li>
            </ul>
            <p className="mt-2">HOA managers are responsible for the accuracy of community information they publish.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">3. Subscriptions & Billing</h3>
            <p className="mb-2">
              Nabor HOA offers paid subscription plans for HOA managers (Starter, Growth, and Pro) billed
              monthly, quarterly, or annually. By selecting a paid plan you agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your selected plan renews automatically at the end of each billing cycle unless canceled.</li>
              <li>Payment is charged securely through our payment provider (Base44 Payments) to your chosen payment method.</li>
              <li>You can cancel your subscription at any time from the Account page; cancellation stops future renewals but does not refund the current cycle.</li>
              <li>Prices may change with reasonable notice; existing subscriptions keep their price until the next renewal after a change.</li>
            </ul>
            <p className="mt-2">
              Homeowner HOA dues and bill payments are separate one-time or recurring transactions.
              They are processed securely through Base44 Payments, or, where your HOA has connected its
              own payment account, through Stripe with funds paid out directly to your HOA. A small
              platform service fee may be applied to payments processed through a connected account.
              Ituralde Digital Solutions LLC is not the merchant of record for resident dues and is not
              responsible for the goods, services, or obligations of your HOA.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">4. Free Trial</h3>
            <p>
              Nabor HOA may offer a 14-day free trial of paid features. The trial grants full access for the
              trial period at no charge. If you do not select a paid plan before the trial ends, your
              community reverts to the free Starter tier with limited features. No payment is collected
              during the trial.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">5. Account Security &amp; Biometric Sign-In</h3>
            <p>
              You may enable biometric sign-in (Face ID, Touch ID, or fingerprint) for convenience. Your
              biometric data stays on your device and is managed by your device's operating system;
              Nabor HOA never receives it. We may also verify new devices and maintain a list of trusted devices to
              protect your account. You are responsible for keeping your device and credentials secure.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">6. Your Content</h3>
            <p>
              You retain ownership of content you create (requests, announcements, documents). You grant
              Ituralde Digital Solutions LLC a license to host, display, and process that content within
              the Service for your community. You are responsible for ensuring you have the rights to
              upload documents.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">7. AI Assistant</h3>
            <p>
              The AI assistant answers questions based on your community's uploaded documents. It may
              not always be accurate. You should verify important information with your HOA board. We
              are not liable for decisions made based on AI responses.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">8. Service Availability</h3>
            <p>
              We strive to keep the Service available but do not guarantee uninterrupted access. We may
              update, suspend, or discontinue features with reasonable notice. Scheduled maintenance
              may cause temporary downtime.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">9. Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, Ituralde Digital Solutions LLC is not liable for
              indirect, incidental, or consequential damages arising from your use of the Service. Our
              total liability for any claim is limited to the amount you paid us in the past 12 months.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">10. Termination</h3>
            <p>
              You can stop using the Service and delete your account at any time. We may suspend or
              terminate your account if you violate these Terms or for any other reason with notice
              where appropriate.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">11. Changes to These Terms</h3>
            <p>
              We may update these Terms from time to time. We will notify you of significant changes in
              the app and update the "Last updated" date. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">12. Governing Law</h3>
            <p>
              These Terms are governed by the laws of the jurisdiction in which Ituralde Digital Solutions
              LLC is established, without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">13. Contact</h3>
            <p>
              Questions about these Terms can be sent to Ituralde Digital Solutions LLC through the
              Help section in the app, or to your community's HOA board.
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