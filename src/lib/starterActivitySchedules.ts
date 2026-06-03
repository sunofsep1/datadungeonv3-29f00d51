import type { ActivityScheduleAppliesTo, ActivityScheduleStepType } from "@/lib/activitySchedule";

export type StarterActivityScheduleStep = {
  offset_days: number;
  step_type: ActivityScheduleStepType;
  title: string;
  body?: string;
};

export type StarterActivitySchedule = {
  name: string;
  description: string;
  applies_to: ActivityScheduleAppliesTo;
  steps: StarterActivityScheduleStep[];
};

/** Default Reapit-style schedules — seeded per user when none exist. */
export const STARTER_ACTIVITY_SCHEDULES: StarterActivitySchedule[] = [
  {
    name: "New listing — vendor onboarding",
    description: "Day 1 welcome through first OFI and vendor report (listing).",
    applies_to: "listing",
    steps: [
      {
        offset_days: 0,
        step_type: "call",
        title: "Call vendor — campaign kick-off",
        body: "Confirm marketing plan, photography date, and first open time.",
      },
      {
        offset_days: 1,
        step_type: "task",
        title: "Book photography / video",
        body: "Confirm supplier and upload assets when received.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "Set first open inspection",
        body: "Schedule OFI and print QR check-in brochure.",
      },
      {
        offset_days: 7,
        step_type: "email",
        title: "Email vendor — week-one activity report",
        body: "Portal hits, enquiries, and inspection feedback summary.",
      },
      {
        offset_days: 14,
        step_type: "call",
        title: "Call vendor — fortnightly review",
        body: "Discuss price feedback, buyer interest, and next campaign steps.",
      },
    ],
  },
  {
    name: "Buyer — post-inspection follow-up",
    description: "Warm buyer after an OFI or private inspection (contact).",
    applies_to: "contact",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "Call — thank you for inspecting",
        body: "Capture interest level, objections, and finance position.",
      },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email — property recap + next steps",
        body: "Send listing link, comparable sales, and offer process outline.",
      },
      {
        offset_days: 3,
        step_type: "call",
        title: "Call — check-in on decision timing",
        body: "Offer second inspection or connect with their solicitor if hot.",
      },
    ],
  },
];
