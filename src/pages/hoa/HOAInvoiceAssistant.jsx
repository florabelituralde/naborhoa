import HomeInvoiceAssistant from "@/pages/home/HomeInvoiceAssistant";

// The HOA layout provides the same { user, community } outlet context as the
// homeowner layout, so the assistant page is reused verbatim on the HOA side.
export default function HOAInvoiceAssistant() {
  return <HomeInvoiceAssistant />;
}