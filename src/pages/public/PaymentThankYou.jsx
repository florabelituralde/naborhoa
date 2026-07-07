import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

export default function PaymentThankYou() {
  const [params] = useSearchParams();
  const joinCode = params.get("c");
  const isPlan = params.get("plan") === "1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {isPlan ? "Subscription Active!" : "Payment Successful!"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isPlan
            ? "Your Nabor HOA plan is now active. You're all set to manage your community — welcome aboard!"
            : "Thank you for your payment. Your HOA dues have been processed successfully. You'll receive a confirmation email shortly."}
        </p>
        <div className="flex flex-col gap-3">
          {isPlan ? (
            <Link to="/hoa/dashboard"><Button className="w-full h-12">Go to Dashboard</Button></Link>
          ) : (
            <>
              {joinCode && <Link to={`/c/${joinCode}`}><Button className="w-full h-12">Back to Community</Button></Link>}
              <Link to="/login"><Button variant="outline" className="w-full h-12"><Home className="w-4 h-4 mr-2" /> Go to Nabor HOA</Button></Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}