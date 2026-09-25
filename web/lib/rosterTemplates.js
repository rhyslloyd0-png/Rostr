// Starting points for a new department's roster — picked once at setup so
// an owner isn't staring at a totally blank structure. Purely a seed: every
// section/group/rank is just as editable afterward as if they'd built it
// by hand. IDs are stable strings (not generated) since a template is only
// ever instantiated once per department.
function ranks(names) {
  return names.map((name, i) => ({ id: `t-rank-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, rank: name, certifications: [], roleIds: [] }));
}

export const ROSTER_TEMPLATES = [
  {
    key: "blank",
    label: "Blank",
    description: "Start with an empty roster and build it yourself.",
    certCatalog: [],
    driverLevels: ["1", "2", "3", "4", "5"],
    sections: [],
  },
  {
    key: "ems",
    label: "EMS / Medical",
    description: "Command staff, field paramedics, and common EMS certifications.",
    certCatalog: ["BLS", "ALS", "CCT", "FTO"],
    driverLevels: ["1", "2", "3", "4", "5"],
    sections: [
      {
        id: "t-ems-command", name: "Command", color: "#eab308",
        groups: [{ id: "t-ems-command-g", name: "", ranks: ranks(["Chief Medical Officer", "Deputy Chief Medical Officer", "Director of Operations"]) }],
      },
      {
        id: "t-ems-field", name: "Field Staff", color: "#5fb4ff",
        groups: [{ id: "t-ems-field-g", name: "", ranks: ranks(["Supervisor", "Senior Paramedic", "Paramedic", "EMT", "Cadet"]) }],
      },
    ],
  },
  {
    key: "police",
    label: "Police / Law Enforcement",
    description: "Command, supervisors, and patrol ranks with SWAT/K9/detective certifications.",
    certCatalog: ["SWAT", "K9", "FTO", "Detective", "Motor"],
    driverLevels: ["1", "2", "3", "4", "5"],
    sections: [
      {
        id: "t-pd-command", name: "Command Staff", color: "#14b8a6",
        groups: [{ id: "t-pd-command-g", name: "", ranks: ranks(["Chief of Police", "Deputy Chief", "Captain"]) }],
      },
      {
        id: "t-pd-supervisors", name: "Supervisors", color: "#5fb4ff",
        groups: [{ id: "t-pd-supervisors-g", name: "", ranks: ranks(["Lieutenant", "Sergeant", "Corporal"]) }],
      },
      {
        id: "t-pd-officers", name: "Officers", color: "#c4c8d4",
        groups: [{ id: "t-pd-officers-g", name: "", ranks: ranks(["Officer III", "Officer II", "Officer I", "Cadet"]) }],
      },
    ],
  },
  {
    key: "fire",
    label: "Fire Department",
    description: "Command, company officers, and firefighter ranks with rescue/HAZMAT certifications.",
    certCatalog: ["HAZMAT", "Technical Rescue", "EMT", "FTO"],
    driverLevels: ["1", "2", "3", "4", "5"],
    sections: [
      {
        id: "t-fd-command", name: "Command", color: "#e0524a",
        groups: [{ id: "t-fd-command-g", name: "", ranks: ranks(["Fire Chief", "Assistant Chief", "Battalion Chief"]) }],
      },
      {
        id: "t-fd-firefighters", name: "Firefighters", color: "#eab308",
        groups: [{ id: "t-fd-firefighters-g", name: "", ranks: ranks(["Captain", "Lieutenant", "Engineer", "Firefighter", "Probationary Firefighter"]) }],
      },
    ],
  },
  {
    key: "gang",
    label: "Gang / Crew",
    description: "Leadership and general membership ranks for a crew or gang roster.",
    certCatalog: [],
    driverLevels: ["1", "2", "3", "4", "5"],
    sections: [
      {
        id: "t-gang-leadership", name: "Leadership", color: "#a855f7",
        groups: [{ id: "t-gang-leadership-g", name: "", ranks: ranks(["Boss", "Underboss", "Consigliere"]) }],
      },
      {
        id: "t-gang-members", name: "Members", color: "#6b7180",
        groups: [{ id: "t-gang-members-g", name: "", ranks: ranks(["Enforcer", "Soldier", "Associate", "Prospect"]) }],
      },
    ],
  },
  {
    key: "staff",
    label: "Server Staff",
    description: "General community/server management roles — not an in-character department.",
    certCatalog: [],
    driverLevels: [],
    sections: [
      {
        id: "t-staff-team", name: "Staff Team", color: "#5fb4ff",
        groups: [{ id: "t-staff-team-g", name: "", ranks: ranks(["Owner", "Co-Owner", "Head Admin", "Admin", "Moderator"]) }],
      },
    ],
  },
];
