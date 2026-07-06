import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Clock, XCircle, MapPin, RefreshCw } from "lucide-react";

export default function PendingApproval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      if (u.community_id) {
        navigate("/home/dashboard");
        return;
      }
      const requests = await base44.entities.JoinRequest.filter({ homeowner_id: u.id }, "-created_date", 1);
      const latest = requests[0];
      if (!latest) {
        navigate("/join");
        return;
      }
      if (latest.status === "approved") {
        navigate("/home/dashboard");
        return;
      }
      setRequest(latest);
      setLoading(false);
    } catch {
      navigate("/login");
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rejected = request?.status === "rejected";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-20 bg-primary flex items-center px-8">
        <div className="flex items-center gap-2">
          <Home className="w-7 h-7 text-white" />
          <span className="text-white font-bold text-xl">Nabor</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-card rounded-2xl warm-shadow-md p-8 text-center">
          {rejected ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-xl font-bold">Request not approved</h2>
              <p className="text-muted-foreground mt-2">
                Your request to join <span className="font-medium text-foreground">{request.community_name}</span> was declined.
              </p>
              {request.review_note && (
                <p className="text-sm text-muted-foreground mt-3 p-3 rounded-lg bg-muted/50">{request.review_note}</p>
              )}
              <Button onClick={() => navigate("/join")} className="w-full h-12 mt-6">
                Search for another community
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Waiting for approval</h2>
              <p className="text-muted-foreground mt-2">
                Your request to join <span className="font-medium text-foreground">{request.community_name}</span> is being reviewed by the HOA admin or a board member.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-4">
                <MapPin className="w-4 h-4" />
                {request.address}
              </div>
              <Button onClick={load} variant="outline" className="w-full h-12 mt-6">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check status
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}