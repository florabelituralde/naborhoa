import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck, Check, X } from "lucide-react";

const ROLE_LABELS = {
  president: "President",
  vice_president: "Vice President",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member_at_large: "Member at Large",
};

export default function BoardRequestsApprovalSection({ community, pendingMembers, onChange }) {
  const { toast } = useToast();
  const [roleChoices, setRoleChoices] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [hiddenIds, setHiddenIds] = useState([]);

  const approve = async (member) => {
    setBusyId(member.id);
    const role = roleChoices[member.id] || member.requested_board_role || "member_at_large";
    try {
      const { data } = await base44.functions.invoke("review-board-access", {
        member_id: member.id,
        action: "approve",
        role,
      });
      if (data?.error) throw new Error(data.error);
      setHiddenIds(prev => [...prev, member.id]);
      toast({ title: "Board access approved" });
      onChange();
    } catch (err) {
      toast({ title: "Couldn't approve request", description: err.message, variant: "destructive" });
    }
    setBusyId(null);
  };

  const reject = async (member) => {
    setBusyId(member.id);
    try {
      const { data } = await base44.functions.invoke("review-board-access", {
        member_id: member.id,
        action: "reject",
      });
      if (data?.error) throw new Error(data.error);
      setHiddenIds(prev => [...prev, member.id]);
      toast({ title: "Request declined" });
      onChange();
    } catch (err) {
      toast({ title: "Couldn't decline request", description: err.message, variant: "destructive" });
    }
    setBusyId(null);
  };

  const visibleMembers = pendingMembers.filter(m => !hiddenIds.includes(m.id));

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" /> Board Access Requests
      </h2>
      {visibleMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
      ) : (
        <div className="space-y-3">
          {visibleMembers.map(member => (
            <div key={member.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                  {member.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={roleChoices[member.id] || member.requested_board_role || "member_at_large"}
                  onValueChange={v => setRoleChoices({ ...roleChoices, [member.id]: v })}
                >
                  <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(member)} disabled={busyId === member.id} className="flex-1">
                    {busyId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(member)} disabled={busyId === member.id}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}