import jsPDF from "jspdf";
import { formatCurrency, formatDate } from "@/lib/format";

// Generates and downloads a PDF payment history statement for a homeowner.
export function exportPaymentStatement({ community, user, invoices }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(community?.name || "Community", marginX, y);
  y += 22;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text("Payment History Statement", marginX, y);
  y += 16;
  doc.setFontSize(9);
  doc.text(`Homeowner: ${user?.full_name || ""}  •  ${user?.email || ""}`, marginX, y);
  y += 12;
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, marginX, y);
  doc.setTextColor(0);
  y += 24;

  // Table header
  const cols = { desc: marginX, due: 300, paid: 400, status: 470, amount: pageWidth - marginX };
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", cols.desc, y);
  doc.text("Due", cols.due, y);
  doc.text("Paid", cols.paid, y);
  doc.text("Status", cols.status, y);
  doc.text("Amount", cols.amount, y, { align: "right" });
  y += 6;
  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  // Rows
  doc.setFont("helvetica", "normal");
  let total = 0;
  let paidTotal = 0;
  invoices.forEach((inv) => {
    if (y > 720) {
      doc.addPage();
      y = 56;
    }
    const label = `${(inv.type || "").charAt(0).toUpperCase() + (inv.type || "").slice(1)} — ${inv.description || ""}`;
    doc.text(doc.splitTextToSize(label, 240)[0] || label, cols.desc, y);
    doc.text(inv.due_date ? formatDate(inv.due_date) : "-", cols.due, y);
    doc.text(inv.paid_date ? formatDate(inv.paid_date) : "-", cols.paid, y);
    doc.text((inv.status || "").charAt(0).toUpperCase() + (inv.status || "").slice(1), cols.status, y);
    doc.text(formatCurrency(inv.amount), cols.amount, y, { align: "right" });
    total += Number(inv.amount) || 0;
    if (inv.status === "paid" || inv.status === "confirmed") paidTotal += Number(inv.amount) || 0;
    y += 18;
  });

  // Totals
  y += 6;
  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid", cols.status, y);
  doc.text(formatCurrency(paidTotal), cols.amount, y, { align: "right" });
  y += 18;
  doc.text("Total Billed", cols.status, y);
  doc.text(formatCurrency(total), cols.amount, y, { align: "right" });

  const safeName = (community?.name || "community").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-payment-statement.pdf`);
}