import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Link2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CopyLinkButton({ url, label = "Copy link", size = "sm", variant = "outline", icon: Icon = Link2 }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: url });
    }
  };

  return (
    <Button size={size} variant={variant} onClick={copy} className="gap-1.5">
      {copied ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}