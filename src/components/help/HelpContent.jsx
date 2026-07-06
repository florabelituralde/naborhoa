import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import {
  HelpCircle, ChevronDown, Home, ClipboardList, Receipt, Wallet, Megaphone,
  Vote, Trophy, Calendar, FileText, Contact, MessageCircle, ListChecks, Users, Sparkles, ArrowRight,
} from "lucide-react";

// Role-aware Help & FAQ content. `role` is "homeowner" or "hoa".
export default function HelpContent({ role = "homeowner", communityName }) {
  const isHoa = role === "hoa";

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Help & FAQ"
        subtitle={`Everything you need to know about using ${communityName || "Nabor"}`}
      />

      {/* Intro */}
      <div className="bg-card rounded-2xl warm-shadow p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg mb-2">What is Nabor?</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nabor is your community's all-in-one HOA portal. It's where {isHoa ? "you manage" : "you handle"} everything
              related to your neighborhood — submitting and tracking maintenance requests, paying dues, reading announcements,
              voting in polls and board elections, viewing community finances, and accessing important documents. Everything
              your HOA does lives in one place, so you always know what's happening.
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {(isHoa ? HOA_SECTIONS : HOMEOWNER_SECTIONS).map((section, i) => (
          <FAQSection key={i} {...section} defaultOpen={i === 0} />
        ))}
      </div>

      {/* AI assistant callout */}
      <div className="bg-accent/50 rounded-2xl p-6 mt-6 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Still have questions?</h3>
          <p className="text-sm text-muted-foreground">
            Use the AI assistant (the chat bubble in the corner) to ask anything about your community's rules,
            documents, or policies. It answers using your HOA's official documents.
          </p>
        </div>
      </div>
    </div>
  );
}

function FAQSection({ icon: Icon, title, steps, link, linkLabel, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl warm-shadow overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="font-semibold flex-1">{title}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <ol className="space-y-2.5 ml-1">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
              </li>
            ))}
          </ol>
          {link && (
            <Link
              to={link}
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
            >
              {linkLabel || "Go to this page"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const HOMEOWNER_SECTIONS = [
  {
    icon: ClipboardList,
    title: "Submitting & tracking requests",
    link: "/home/requests/new",
    linkLabel: "Submit a new request",
    steps: [
      "Open <strong>My Requests</strong> from the sidebar and tap <strong>New Request</strong>.",
      "Choose the type of request (maintenance, fence modification, landscaping, etc.).",
      "Fill in the details, answer any required questions, and attach photos or documents if requested.",
      "Submit — your request appears in <strong>My Requests</strong> with its current status.",
      "Open any request to see its <strong>Activity Timeline</strong>, showing exactly when it was reviewed, assigned, and completed.",
      "You can cancel a request yourself while it's still in the <em>Submitted</em> stage.",
    ],
  },
  {
    icon: Receipt,
    title: "Paying your bills & dues",
    link: "/home/invoices",
    linkLabel: "Go to My Bills",
    steps: [
      "Go to <strong>My Bills</strong> to see all invoices, their amounts, and due dates.",
      "Tap a pending invoice and choose <strong>Pay</strong> to complete payment securely online.",
      "Once paid, the status updates and your HOA confirms receipt.",
      "Upcoming and overdue due dates also appear on your <strong>Dashboard</strong> calendar.",
    ],
  },
  {
    icon: Wallet,
    title: "Viewing community finances",
    link: "/home/expenses",
    linkLabel: "View Community Finances",
    steps: [
      "Open <strong>Community Finances</strong> to see how dues are spent across categories.",
      "The <strong>Dashboard</strong> shows a yearly overview so you always have full transparency.",
    ],
  },
  {
    icon: Megaphone,
    title: "Announcements & staying informed",
    link: "/home/announcements",
    linkLabel: "Go to Announcements",
    steps: [
      "Read the latest updates under <strong>Announcements</strong> — pinned items appear first.",
      "The bell icon at the top shows notifications for new activity affecting you.",
    ],
  },
  {
    icon: Vote,
    title: "Voting in polls & elections",
    link: "/home/polls",
    linkLabel: "Go to Polls",
    steps: [
      "Open <strong>Polls</strong> to weigh in on community decisions before the deadline.",
      "Open <strong>Elections</strong> to review candidates and cast your vote for the board.",
      "Each resident gets one vote per poll or election.",
    ],
  },
  {
    icon: Calendar,
    title: "Events, documents & board",
    link: "/home/events",
    linkLabel: "Go to Events",
    steps: [
      "Check <strong>Events</strong> for meetings and community gatherings.",
      "Find bylaws, rules, meeting minutes, and forms under <strong>Documents</strong>.",
      "See who represents you under <strong>Board</strong>.",
    ],
  },
  {
    icon: Users,
    title: "Board Hub (for board members)",
    link: "/home/board-hub",
    linkLabel: "Go to Board Hub",
    steps: [
      "If you're an approved board member, a <strong>Board Hub</strong> appears in your menu.",
      "From there you can review resident requests, post announcements and events, see poll results, manage the photo gallery, and approve new members joining the community.",
      "You can also grab shareable <strong>guest links</strong> so neighbors can pay dues or ask the AI assistant questions without signing in.",
      "Not a board member yet? Ask your HOA to grant you board access.",
    ],
  },
  {
    icon: MessageCircle,
    title: "Asking the AI assistant",
    steps: [
      "Tap the <strong>chat bubble</strong> in the bottom corner on any screen.",
      "Ask about community rules, dues, pet policies, architectural guidelines, or anything in your HOA's documents.",
      "The assistant answers using your community's official uploaded documents — if it can't find an answer, it points you to contact the HOA directly.",
    ],
  },
  {
    icon: Contact,
    title: "Your account & moving out",
    link: "/home/account",
    linkLabel: "Go to My Account",
    steps: [
      "Update your profile and preferences under <strong>My Account</strong>.",
      "For faster, secure sign-in you can enable <strong>biometric / device login</strong> where your device supports it.",
      "Selling or relocating? Use <strong>Moving Out / Selling</strong> in your account to notify the HOA — this removes your membership and access, so only do it when you're actually leaving.",
    ],
  },
];

const HOA_SECTIONS = [
  {
    icon: ClipboardList,
    title: "Managing resident requests",
    link: "/hoa/requests",
    linkLabel: "Go to Requests",
    steps: [
      "Open <strong>Requests</strong> to see everything residents have submitted, filterable by status.",
      "Open a request to assign it to a staff member, start work, and mark it resolved.",
      "Every action you take is automatically recorded on the resident's timeline.",
      "Add <strong>Resolution Notes</strong> so residents understand how their issue was handled.",
    ],
  },
  {
    icon: ListChecks,
    title: "Setting up request types & templates",
    link: "/hoa/request-types",
    linkLabel: "Go to Request Types",
    steps: [
      "Open <strong>Request Types</strong> to control what residents can submit.",
      "Use <strong>Add common HOA request types</strong> to start from a ready-made catalog, or create your own.",
      "Add custom fields and mark whether attachments are required.",
      "Save any type as a <strong>template</strong> (bookmark icon), then deploy it later from the <strong>Templates</strong> button.",
    ],
  },
  {
    icon: Receipt,
    title: "Invoicing & collecting dues",
    link: "/hoa/invoices",
    linkLabel: "Go to Invoices",
    steps: [
      "Open <strong>Invoices</strong> and tap <strong>New Invoice</strong> to bill a single homeowner.",
      "Use <strong>Bulk Invoice</strong> to send recurring monthly dues to every homeowner at once.",
      "Residents are notified automatically, and reminders go out for upcoming and overdue bills.",
      "Confirm payments once received to keep records accurate.",
    ],
  },
  {
    icon: Wallet,
    title: "Tracking expenses & transparency",
    link: "/hoa/expenses",
    linkLabel: "Go to Expenses",
    steps: [
      "Record community spending under <strong>Expenses</strong>, categorized for clarity.",
      "The <strong>Dashboard</strong> shows a yearly income vs. expenses chart residents can also see.",
    ],
  },
  {
    icon: Megaphone,
    title: "Announcements, polls & elections",
    link: "/hoa/announcements",
    linkLabel: "Go to Announcements",
    steps: [
      "Post updates under <strong>Announcements</strong> — pin important ones to the top.",
      "Create <strong>Polls</strong> to gather resident input with a deadline.",
      "Run board <strong>Elections</strong> by adding candidates and setting an end date.",
    ],
  },
  {
    icon: Calendar,
    title: "Events, documents & board",
    link: "/hoa/events",
    linkLabel: "Go to Events",
    steps: [
      "Schedule meetings and gatherings under <strong>Events</strong>.",
      "Upload bylaws, rules, minutes, and forms under <strong>Documents</strong>.",
      "Manage board members and community settings (admins only).",
    ],
  },
  {
    icon: Receipt,
    title: "Online payments & shareable guest links",
    link: "/hoa/payment-settings",
    linkLabel: "Go to Payment Settings",
    steps: [
      "Connect your payout account under <strong>Payment Settings</strong> so residents can pay dues and invoices online.",
      "Choose accepted payment methods and configure late fees for overdue invoices.",
      "Share your community's <strong>guest links</strong> so homeowners can pay a bill or ask the AI assistant questions without needing to sign in.",
    ],
  },
  {
    icon: Users,
    title: "Members, join requests & moving out",
    link: "/hoa/community",
    linkLabel: "Go to Community",
    steps: [
      "Invite homeowners and staff, and view everyone in your community under <strong>Community</strong>.",
      "Approve or reject <strong>join requests</strong> from residents requesting access.",
      "When a resident submits a <strong>Moving Out / Selling</strong> notice, their membership is removed automatically and you're notified of the change.",
    ],
  },
  {
    icon: MessageCircle,
    title: "The AI assistant",
    steps: [
      "Residents (and guests via a shared link) can ask the <strong>AI assistant</strong> questions answered from your uploaded documents.",
      "Keep your <strong>Documents</strong> (bylaws, rules, policies) up to date so the assistant gives accurate answers.",
      "When the assistant can't answer, it directs residents to contact the HOA directly.",
    ],
  },
];