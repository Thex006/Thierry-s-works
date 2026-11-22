// Business facts come from the Classic site (Handyman Services in Columbus LLC).
// Nothing here is invented: no prices, stats or reviews beyond what the Classic site states.

export const business = {
  name: "Handyman Services in Columbus",
  legal: "Handyman Services in Columbus LLC",
  short: "Handyman in Columbus",
  street: "North High Street, Clintonville",
  city: "Columbus, Ohio",
  directions: "https://www.openstreetmap.org/search?query=North%20High%20Street%20Clintonville%20Columbus",
};

export type Service = {
  id: string;
  no: string;
  group: "Inside" | "Outside" | "Commercial";
  title: string;
  short: string;
  body: string;
  tool: string; // which scanned tool the camera picks up
  toolName: string;
};

export const services: Service[] = [
  {
    id: "plumbing",
    no: "01",
    group: "Inside",
    title: "Plumbing and electrical",
    short: "Leaks, fixtures, outlets, appliances",
    body: "Leaks, fixtures, outlets and switches, plus appliance installation.",
    tool: "pipe_wrench",
    toolName: "Pipe wrench",
  },
  {
    id: "walls",
    no: "02",
    group: "Inside",
    title: "Walls, ceilings and floors",
    short: "Drywall, textured ceilings, tile",
    body: "Drywall holes, textured ceilings, tile and flooring, then paint to match.",
    tool: "trowel_01",
    toolName: "Steel trowel",
  },
  {
    id: "wood",
    no: "03",
    group: "Outside",
    title: "Wood, siding and windows",
    short: "Rot and glazing before winter",
    body: "Rotten wood, siding panels and window glazing before winter.",
    tool: "hand_plane_no4",
    toolName: "No. 4 hand plane",
  },
  {
    id: "gutters",
    no: "04",
    group: "Outside",
    title: "Gutters, fences and gates",
    short: "Vents and concrete repairs too",
    body: "Gutter cleaning, dryer vents and concrete repairs.",
    tool: "wooden_hammer_01",
    toolName: "Claw hammer",
  },
  {
    id: "commercial",
    no: "05",
    group: "Commercial",
    title: "Maintenance for commercial properties",
    short: "Offices, sites and HUD properties",
    body: "Facilities maintenance for offices and commercial sites, plus repairs on HUD (federal housing) properties.",
    tool: "Drill_01",
    toolName: "Cordless drill, 18V",
  },
];

export const proof = [
  { label: "Service Channel", value: "Partner for over 15 years" },
  { label: "Insurance", value: "Certificate for corporate clients on request" },
  { label: "Emergencies", value: "24 hours, every day" },
];

export const tagline =
  "Tell us what broke and where. We price the bigger jobs before we start, bring the tools for the whole list, and a pipe that bursts on a Sunday night still gets an answer";

export const areas = [
  { county: "Franklin", note: "Columbus and suburbs" },
  { county: "Delaware and Union", note: "North of the city" },
  { county: "Licking and Madison", note: "East and west" },
  { county: "Fairfield and Pickaway", note: "South of the city" },
];

export const neighbourhoods = ["German Village", "the Short North", "the University District"];

export const prices = [
  { label: "Detailed estimate", value: "$50", unit: "service call", note: "For larger projects, priced before we start." },
  { label: "Jobs over $400", value: "50%", unit: "down, at most", note: "Residential jobs over $400 take up to half up front." },
  { label: "Emergencies", value: "24", unit: "hours a day", note: "A burst pipe on a Sunday night still gets an answer." },
];

export const faqs = [
  { q: "Do you take emergency repairs?", a: "Yes, emergency service runs 24 hours a day. Office hours are 9 AM to 5 PM on weekdays." },
  { q: "What does a home repair estimate cost?", a: "A detailed estimate on a larger project is a $50 service call." },
  { q: "Do I pay anything up front for repairs?", a: "Residential jobs over $400 take up to 50% down before work starts." },
  { q: "Which areas do you cover?", a: "Franklin, Delaware, Union, Licking, Madison, Fairfield and Pickaway counties around Columbus." },
  { q: "Is the handyman crew insured?", a: "Yes. Corporate clients can ask for a certificate of insurance." },
  { q: "Can you do repairs on a weekend?", a: "Weekend work is by appointment. Say so in the quote form." },
];

export const hours = [
  { day: "Mon to Fri", time: "9 AM to 5 PM" },
  { day: "Sat and Sun", time: "By appointment" },
  { day: "Emergencies", time: "24 hours" },
];
