/** Must match `touches.touch_type` CHECK in phase3_touch_tracking_foundation migration. */
export const TOUCH_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "handwritten_card", label: "Handwritten card" },
  { value: "break_bread", label: "Break bread" },
  { value: "pop_by", label: "Pop-by" },
  { value: "housing_update_video", label: "Housing update video" },
  { value: "weekly_email", label: "Weekly email" },
  { value: "monthly_mailer", label: "Monthly mailer" },
  { value: "birthday_card", label: "Birthday card" },
  { value: "annual_review", label: "Annual review" },
  { value: "community_event", label: "Community event" },
  { value: "social_media", label: "Social media" },
  { value: "other", label: "Other" },
];
