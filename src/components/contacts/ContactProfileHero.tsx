import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Printer,
  Tag,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Badge } from "@/components/ui/badge";
import { useContactOwnsInvestment } from "@/hooks/useContactInvestment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ContactWithMeta } from "@/hooks/useContacts";
import {
  getAllEmails,
  getAllPhones,
  getPrimaryEmail,
  getTagNames,
} from "@/hooks/useContacts";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import {
  facebookProfileUrl,
  instagramProfileUrl,
  linkedinProfileUrl,
  normalizeWebsiteUrl,
  socialLinkLabel,
  twitterProfileUrl,
} from "@/lib/contactSocialLinks";
import { cn, getInitials } from "@/lib/utils";
import { ContactCardChannelRows } from "@/components/contacts/ContactCardChannelRows";

type ContactExt = ContactWithMeta & {
  title?: string | null;
  salutation?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  home_phone?: string | null;
  work_phone?: string | null;
  facsimile?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  twitter_handle?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  client_ref?: string | null;
  agentbox_id?: number | null;
  reapit_id?: string | null;
  preferred_contact_method?: string | null;
  status?: string | null;
  do_not_contact?: boolean | null;
  dnc_phone?: boolean | null;
  dnc_email?: boolean | null;
  dnc_sms?: boolean | null;
  aml_id_verified?: boolean | null;
  aml_pep_clear?: boolean | null;
  anniversary_date?: string | null;
  date_of_birth?: string | null;
  last_touch_date?: string | null;
  next_touch_date?: string | null;
  created_at?: string | null;
};

type Props = {
  contactId: string;
  contact: ContactWithMeta;
  displayName: string;
  displayInitials?: string;
  heroSubtitle?: string;
  urgencyBadge: React.ReactNode;
  birthdayChip?: string | null;
};

function DetailSlot({
  code,
  label,
  value,
  href,
  icon: Icon,
  className,
}: {
  code: string;
  label: string;
  value?: string | null;
  href?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const hasValue = Boolean(value?.trim());
  const content = hasValue ? value!.trim() : "—";

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-background/60 p-3 min-h-[4.25rem] flex flex-col gap-1",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-foreground/80">
          {code}
        </span>
        <span>{label}</span>
      </div>
      {hasValue && href ? (
        <a
          href={href}
          className="text-sm font-medium text-primary hover:underline truncate"
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {content}
        </a>
      ) : (
        <p className={cn("text-sm truncate", hasValue ? "font-medium text-foreground" : "text-muted-foreground/70")}>
          {hasValue ? content : content}
        </p>
      )}
      <Icon className="hidden" aria-hidden />
    </div>
  );
}

function SocialButton({
  href,
  label,
  mark,
  tone,
}: {
  href: string;
  label: string;
  mark: string;
  tone: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9 shrink-0 font-semibold text-[10px]", tone)}
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
        {mark}
      </a>
    </Button>
  );
}

function resolveMobile(contact: ContactExt): string | null {
  const phones = getAllPhones(contact);
  const mobile =
    phones.find((p) => p.channelType === "mobile" || p.legacyField === "mobile") ??
    phones.find((p) => p.label?.toLowerCase().includes("mobile"));
  return mobile?.value?.trim() || contact.mobile?.trim() || contact.phone?.trim() || null;
}

function preferredMethodLabel(method: string | null | undefined): string | null {
  if (!method?.trim()) return null;
  const map: Record<string, string> = {
    phone: "Phone",
    email: "Email",
    sms: "SMS",
    mail: "Mail",
    any: "Any",
  };
  return map[method.toLowerCase()] ?? method;
}

export function ContactProfileHero({
  contactId,
  contact,
  displayName,
  displayInitials,
  heroSubtitle,
  urgencyBadge,
  birthdayChip,
}: Props) {
  const ext = contact as ContactExt;
  const [extraOpen, setExtraOpen] = useState(false);

  const mobile = resolveMobile(ext);
  const email = getPrimaryEmail(contact) ?? ext.email?.trim() ?? null;
  const tags = getTagNames(contact);

  const socialLinks = useMemo(() => {
    const items: { platform: string; href: string; label: string; mark: string; tone: string }[] = [];
    const linkedin = linkedinProfileUrl(ext.linkedin_url);
    if (linkedin) {
      items.push({
        platform: "linkedin",
        href: linkedin,
        label: socialLinkLabel("linkedin", ext.linkedin_url) ?? "LinkedIn",
        mark: "in",
        tone: "border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10",
      });
    }
    const twitter = twitterProfileUrl(ext.twitter_handle);
    if (twitter) {
      items.push({
        platform: "twitter",
        href: twitter,
        label: socialLinkLabel("twitter", ext.twitter_handle) ?? "X",
        mark: "X",
        tone: "border-foreground/20 hover:bg-muted",
      });
    }
    const instagram = instagramProfileUrl(ext.instagram_url);
    if (instagram) {
      items.push({
        platform: "instagram",
        href: instagram,
        label: socialLinkLabel("instagram", ext.instagram_url) ?? "Instagram",
        mark: "Ig",
        tone: "border-pink-500/30 text-pink-500 hover:bg-pink-500/10",
      });
    }
    const facebook = facebookProfileUrl(ext.facebook_url);
    if (facebook) {
      items.push({
        platform: "facebook",
        href: facebook,
        label: socialLinkLabel("facebook", ext.facebook_url) ?? "Facebook",
        mark: "f",
        tone: "border-blue-600/30 text-blue-600 hover:bg-blue-600/10",
      });
    }
    const website = normalizeWebsiteUrl(ext.website);
    if (website) {
      items.push({
        platform: "website",
        href: website,
        label: socialLinkLabel("website", ext.website) ?? "Website",
        mark: "↗",
        tone: "border-primary/30 text-primary hover:bg-primary/10",
      });
    }
    return items;
  }, [ext]);

  const extraEmailCount = Math.max(0, getAllEmails(contact).length - (email ? 1 : 0));
  const extraPhoneCount = Math.max(0, getAllPhones(contact).length - (mobile ? 1 : 0));
  const hasExtraChannels = extraEmailCount + extraPhoneCount > 0;

  const statusActive = (ext.status ?? "active").toLowerCase() === "active";
  const ownsInvestment = useContactOwnsInvestment(contact?.id).data === true;
  const pref = preferredMethodLabel(ext.preferred_contact_method);

  const anniversary = ext.anniversary_date?.trim();
  const anniversaryLabel =
    anniversary && isValid(parseISO(`${anniversary.slice(0, 10)}T12:00:00`))
      ? format(parseISO(`${anniversary.slice(0, 10)}T12:00:00`), "d MMM yyyy")
      : null;

  const dob = ext.date_of_birth?.trim();
  const dobLabel =
    dob && isValid(parseISO(`${dob.slice(0, 10)}T12:00:00`))
      ? format(parseISO(`${dob.slice(0, 10)}T12:00:00`), "d MMM yyyy")
      : null;

  return (
    <Card className="zoho-card overflow-hidden border-border print:border print:border-gray-300 print-section">
      <div className="border-b border-border/70 bg-gradient-to-br from-muted/30 via-background to-background px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              {ext.title?.trim() ? (
                <span className="text-sm font-medium text-muted-foreground">{ext.title.trim()}</span>
              ) : null}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{displayName}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium translate-y-[-2px]",
                  statusActive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", statusActive ? "bg-emerald-500" : "bg-muted-foreground")}
                />
                {statusActive ? "Active" : ext.status ?? "Inactive"}
              </span>
            </div>

              {(ext.company_name?.trim() || ext.job_title?.trim()) && (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {ext.company_name?.trim() ? (
                    <span className="font-medium text-foreground/90">{ext.company_name.trim()}</span>
                  ) : null}
                  {ext.company_name?.trim() && ext.job_title?.trim() ? <span>·</span> : null}
                  {ext.job_title?.trim() ? <span>{ext.job_title.trim()}</span> : null}
                </p>
              )}

              {heroSubtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{heroSubtitle}</p> : null}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {urgencyBadge}
                {ownsInvestment ? (
                  <Badge className="gap-1 border border-violet-500/40 bg-violet-500/15 text-violet-300 text-[10px]">
                    Investment owner
                  </Badge>
                ) : null}
                {contact.lead_score != null ? (
                  <Badge variant="secondary" className="tabular-nums text-xs">
                    Lead score {contact.lead_score}
                  </Badge>
                ) : null}
                {birthdayChip ? (
                  <Badge className="border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px]">
                    {birthdayChip}
                  </Badge>
                ) : null}
                {ext.do_not_contact ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Do not contact
                  </Badge>
                ) : null}
                {(ext.dnc_phone || ext.dnc_email || ext.dnc_sms) ? (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                    DNC
                  </Badge>
                ) : null}
              </div>

              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}

            {(pref || ext.client_ref?.trim() || ext.agentbox_id != null || ext.reapit_id?.trim()) ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {pref ? (
                  <span>
                    Preferred <span className="font-medium text-foreground">{pref}</span>
                  </span>
                ) : null}
                {ext.client_ref?.trim() ? (
                  <span>
                    Client ref <span className="font-mono text-foreground">{ext.client_ref.trim()}</span>
                  </span>
                ) : null}
                {ext.agentbox_id != null ? (
                  <span>
                    AgentBox <span className="tabular-nums text-foreground">#{ext.agentbox_id}</span>
                  </span>
                ) : null}
                {ext.reapit_id?.trim() ? (
                  <span>
                    Reapit <span className="font-mono text-foreground">{ext.reapit_id.trim()}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-4 xl:flex-col xl:items-end xl:pt-1">
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {socialLinks.map((s) => (
                  <SocialButton key={s.platform} href={s.href} label={s.label} mark={s.mark} tone={s.tone} />
                ))}
              </div>
            ) : null}
            <AvatarCircle
              name={displayName === "—" ? undefined : displayName}
              size="lg"
              initials={displayInitials}
              className="ring-2 ring-primary/15 shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Contact details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <DetailSlot
              code="M"
              label="Mobile"
              value={mobile ? formatPhoneDisplay(mobile) : null}
              href={mobile ? `tel:${mobile.replace(/\s+/g, "")}` : null}
              icon={Phone}
            />
            <DetailSlot
              code="H"
              label="Home phone"
              value={ext.home_phone ? formatPhoneDisplay(ext.home_phone) : null}
              href={ext.home_phone ? `tel:${ext.home_phone.replace(/\s+/g, "")}` : null}
              icon={Phone}
            />
            <DetailSlot
              code="W"
              label="Work phone"
              value={ext.work_phone ? formatPhoneDisplay(ext.work_phone) : null}
              href={ext.work_phone ? `tel:${ext.work_phone.replace(/\s+/g, "")}` : null}
              icon={Phone}
            />
            <DetailSlot
              code="F"
              label="Facsimile"
              value={ext.facsimile?.trim() ?? null}
              icon={Printer}
            />
          </div>
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DetailSlot
              code="E"
              label="Email"
              value={email}
              href={email ? `mailto:${email}` : null}
              icon={Mail}
            />
            <DetailSlot
              code="↗"
              label="Website"
              value={socialLinkLabel("website", ext.website)}
              href={normalizeWebsiteUrl(ext.website)}
              icon={Globe}
            />
          </div>
        </div>

        {(socialLinks.length > 0 || ext.salutation?.trim()) && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Social & correspondence
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {ext.salutation?.trim() ? (
                <span className="text-muted-foreground">
                  Salutation · <span className="text-foreground">{ext.salutation.trim()}</span>
                </span>
              ) : null}
              {socialLinks.map((s) => (
                <a
                  key={s.platform}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          {dobLabel ? (
            <span>
              DOB <span className="text-foreground font-medium">{dobLabel}</span>
            </span>
          ) : null}
          {anniversaryLabel ? (
            <span>
              Anniversary <span className="text-foreground font-medium">{anniversaryLabel}</span>
            </span>
          ) : null}
          {ext.last_touch_date?.trim() ? (
            <span>
              Last contact{" "}
              <span className="text-foreground font-medium">
                {format(parseISO(`${ext.last_touch_date.slice(0, 10)}T12:00:00`), "d MMM yyyy")}
              </span>
            </span>
          ) : null}
          {ext.next_touch_date?.trim() && isValid(parseISO(`${ext.next_touch_date.slice(0, 10)}T12:00:00`)) ? (
            <span>
              Next touch{" "}
              <span className="text-foreground font-medium">
                {format(parseISO(`${ext.next_touch_date.slice(0, 10)}T12:00:00`), "d MMM yyyy")}
              </span>
            </span>
          ) : null}
          {ext.created_at ? (
            <span>
              Created{" "}
              <span className="text-foreground font-medium">
                {format(new Date(ext.created_at), "d MMM yyyy")}
              </span>
            </span>
          ) : null}
        </div>

        <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              onClick={() => setExtraOpen((o) => !o)}
            >
              <span>
                Additional emails & phones
                {hasExtraChannels ? (
                  <span className="ml-2 normal-case font-normal tracking-normal">
                    (+{extraEmailCount + extraPhoneCount} extra)
                  </span>
                ) : null}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", extraOpen && "rotate-180")} />
            </button>
            {extraOpen ? (
              <ContactCardChannelRows contactId={contactId} contact={contact} />
            ) : null}
          </div>
      </div>
    </Card>
  );
}
