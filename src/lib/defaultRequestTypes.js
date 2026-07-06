// Default catalog of common HOA request types, seeded for a community the first
// time an admin opens the request-type manager. Admins can edit/remove/add types.
export const DEFAULT_REQUEST_TYPES = [
  {
    name: "General Maintenance",
    description: "Report a maintenance issue in a common area (broken gate, leaky pipe, etc.)",
    icon: "Wrench",
    category: "maintenance",
    requires_attachment: false,
    attachment_label: "Photos of the issue (optional)",
    custom_fields: [
      { label: "Location / Area", type: "text", required: true, options: [] },
    ],
  },
  {
    name: "Street Light Outage",
    description: "Report a street light that is out or flickering.",
    icon: "Lightbulb",
    category: "maintenance",
    requires_attachment: false,
    attachment_label: "Photo of the light (optional)",
    custom_fields: [
      { label: "Pole number or nearest address", type: "text", required: true, options: [] },
    ],
  },
  {
    name: "Pool / Amenity Issue",
    description: "Report a problem with the pool, gym, clubhouse, or other amenity.",
    icon: "Waves",
    category: "maintenance",
    requires_attachment: false,
    attachment_label: "Photos (optional)",
    custom_fields: [
      { label: "Which amenity?", type: "select", required: true, options: ["Pool", "Gym", "Clubhouse", "Tennis Court", "Playground", "Other"] },
    ],
  },
  {
    name: "Fence Installation / Modification",
    description: "Request architectural approval to install or modify a fence.",
    icon: "Fence",
    category: "plan_review",
    requires_attachment: true,
    attachment_label: "Plans, property survey & material specs (required)",
    custom_fields: [
      { label: "Fence material", type: "select", required: true, options: ["Wood", "Vinyl", "Aluminum", "Chain-link", "Composite", "Other"] },
      { label: "Height (ft)", type: "number", required: true, options: [] },
      { label: "Color / finish", type: "text", required: false, options: [] },
      { label: "Estimated start date", type: "text", required: false, options: [] },
    ],
  },
  {
    name: "Shed / Outbuilding",
    description: "Request approval to install a shed or outbuilding.",
    icon: "Home",
    category: "plan_review",
    requires_attachment: true,
    attachment_label: "Plans, dimensions & placement drawing (required)",
    custom_fields: [
      { label: "Dimensions (L x W x H)", type: "text", required: true, options: [] },
      { label: "Material", type: "text", required: true, options: [] },
      { label: "Placement on lot", type: "textarea", required: false, options: [] },
    ],
  },
  {
    name: "Pool / Spa Installation",
    description: "Request architectural approval to install a pool or spa.",
    icon: "Waves",
    category: "plan_review",
    requires_attachment: true,
    attachment_label: "Site plan, survey & contractor details (required)",
    custom_fields: [
      { label: "Pool type", type: "select", required: true, options: ["In-ground", "Above-ground", "Spa / Hot tub"] },
      { label: "Contractor name", type: "text", required: false, options: [] },
    ],
  },
  {
    name: "Exterior Paint / Color Change",
    description: "Request approval to repaint or change exterior colors.",
    icon: "Paintbrush",
    category: "plan_review",
    requires_attachment: false,
    attachment_label: "Color samples / swatches",
    custom_fields: [
      { label: "Proposed color(s)", type: "text", required: true, options: [] },
      { label: "Surfaces to be painted", type: "text", required: false, options: [] },
    ],
  },
  {
    name: "Landscaping / Tree Work",
    description: "Request approval for landscaping changes or tree removal.",
    icon: "Trees",
    category: "plan_review",
    requires_attachment: false,
    attachment_label: "Photos / plans (optional)",
    custom_fields: [
      { label: "Describe the work", type: "textarea", required: true, options: [] },
    ],
  },
  {
    name: "Noise / Nuisance Complaint",
    description: "Report a noise or nuisance concern.",
    icon: "Volume2",
    category: "other",
    requires_attachment: false,
    attachment_label: "Supporting photos / video (optional)",
    custom_fields: [
      { label: "When did it occur?", type: "text", required: false, options: [] },
    ],
  },
  {
    name: "Other Request",
    description: "Submit any other request to the HOA.",
    icon: "MessageSquare",
    category: "other",
    requires_attachment: false,
    attachment_label: "Attachments (optional)",
    custom_fields: [],
  },
];

// Icons available for the admin to pick from when creating a request type.
export const REQUEST_TYPE_ICONS = [
  "Wrench", "Lightbulb", "Waves", "Fence", "Home", "Paintbrush",
  "Trees", "Volume2", "MessageSquare", "FileText", "Hammer", "Car",
  "Dog", "Trash2", "Droplets", "Zap",
];