import React from "react";
import { useOutletContext } from "react-router-dom";
import HelpContent from "@/components/help/HelpContent";

export default function HOAHelp() {
  const { community } = useOutletContext();
  return <HelpContent role="hoa" communityName={community?.name} />;
}