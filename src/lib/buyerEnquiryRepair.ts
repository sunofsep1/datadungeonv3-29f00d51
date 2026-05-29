/**
 * Repair mis-imported buyer enquiries linked as property owners.
 */

export type PropertyOwnerLink = {
  id: string;
  contact_id: string;
  property_id: string;
  role: string | null;
};

export type RepairExclusion = {
  contactIds: Set<string>;
  contactNames: Set<string>;
};

export function normalizeRepairName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildRepairExclusions(input: {
  keyBuyerContactIds?: string[];
  primaryBuyerContactId?: string | null;
  extraNames?: string[];
}): RepairExclusion {
  const contactIds = new Set<string>();
  for (const id of input.keyBuyerContactIds ?? []) contactIds.add(id);
  if (input.primaryBuyerContactId) contactIds.add(input.primaryBuyerContactId);

  const contactNames = new Set<string>();
  for (const n of input.extraNames ?? []) {
    const norm = normalizeRepairName(n);
    if (norm) contactNames.add(norm);
  }
  return { contactIds, contactNames };
}

export function isRepairExcluded(
  link: PropertyOwnerLink,
  contactName: string | null | undefined,
  exclusions: RepairExclusion,
): boolean {
  if (exclusions.contactIds.has(link.contact_id)) return true;
  const norm = contactName ? normalizeRepairName(contactName) : "";
  if (norm && exclusions.contactNames.has(norm)) return true;
  return false;
}

export function linksEligibleForOwnerRepair(
  links: PropertyOwnerLink[],
  contactNameById: Map<string, string>,
  exclusions: RepairExclusion,
): PropertyOwnerLink[] {
  return links.filter((l) => {
    const role = (l.role ?? "owner").toLowerCase();
    if (role !== "owner") return false;
    const name = contactNameById.get(l.contact_id);
    return !isRepairExcluded(l, name, exclusions);
  });
}
