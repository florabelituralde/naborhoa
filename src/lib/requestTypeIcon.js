import {
  Wrench, Lightbulb, Waves, Fence, Home, Paintbrush, Trees, Volume2,
  MessageSquare, FileText, Hammer, Car, Dog, Trash2, Droplets, Zap,
} from "lucide-react";

const ICONS = {
  Wrench, Lightbulb, Waves, Fence, Home, Paintbrush, Trees, Volume2,
  MessageSquare, FileText, Hammer, Car, Dog, Trash2, Droplets, Zap,
};

export function getRequestTypeIcon(name) {
  return ICONS[name] || Wrench;
}