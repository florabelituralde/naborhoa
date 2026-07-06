import React from "react";
import { useOutletContext } from "react-router-dom";
import HelpContent from "@/components/help/HelpContent";

export default function HomeHelp() {
  const { community } = useOutletContext();
  return <HelpContent role="homeowner" communityName={community?.name} />;
}