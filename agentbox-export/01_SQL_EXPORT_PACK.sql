-- ============================================================================
-- DataDungeon  ->  AgentBox (Reapit Sales)  |  CSV EXPORT PACK
-- ============================================================================
-- HOW TO USE
--   1. Open Supabase Studio  ->  project sujyalrzbubvhpkntwja  ->  SQL Editor.
--   2. Paste ONE query block below (between the === markers), Run it.
--   3. In the results panel click the "Download CSV" button (top-right of the grid).
--   4. Save each file with the suggested name (shown in each block's header).
--   5. Repeat for each block. These are READ-ONLY SELECTs - they change nothing.
--
-- NOTES
--   * Column aliases are written to be AgentBox-friendly so the import wizard's
--     field-mapping step is mostly auto-matched.
--   * "Notes" columns roll up the contact's real history (calls/emails/SMS/
--     meetings + manual notes). Internal automation churn (nurture steps, task
--     status changes, pipeline moves) is filtered OUT - it is noise in AgentBox.
--   * A "suspected_test_record" flag is included on contacts so you can sort and
--     delete obvious seed/test rows (e.g. *@example.com) BEFORE importing.
--   * AgentBox contact import limit = 1,000 rows/file (you are well under that).
-- ============================================================================


-- ============================================================================
-- BLOCK 1  ->  save as:  agentbox_contacts.csv      (MAIN self-serve import)
-- ============================================================================
WITH notes_rollup AS (
  SELECT i.contact_id,
         string_agg(
           '[' || to_char(i.timestamp,'YYYY-MM-DD') || '] ' || coalesce(i.type,'note')
           || coalesce(': ' || i.subject,'') || coalesce(' - ' || i.body,''),
           E'\n' ORDER BY i.timestamp) AS history
  FROM interactions i
  WHERE i.type IN ('call','email','sms','meeting')
     OR ( coalesce(i.type,'note') = 'note'
          AND coalesce(i.subject,'') NOT ILIKE 'Nurture%'
          AND coalesce(i.subject,'') NOT ILIKE 'Task %'
          AND coalesce(i.subject,'') NOT ILIKE 'Pipeline%'
          AND coalesce(i.subject,'') NOT ILIKE 'Contact updated%'
          AND coalesce(i.subject,'') NOT ILIKE 'Property %link%'
          AND coalesce(i.subject,'') NOT ILIKE 'Document uploaded%'
          AND coalesce(i.subject,'') NOT ILIKE 'Deal %'
          AND coalesce(i.subject,'') NOT ILIKE 'Task completed%' )
  GROUP BY i.contact_id
),
extra_email AS (
  SELECT contact_id, string_agg(value,' | ') AS v
  FROM contact_channels WHERE channel_type='email' GROUP BY contact_id
),
extra_phone AS (
  SELECT contact_id, string_agg(value,' | ') AS v
  FROM contact_channels WHERE channel_type IN ('mobile','phone') GROUP BY contact_id
),
tag_rollup AS (
  SELECT ct.contact_id, string_agg(t.name,' | ' ORDER BY t.name) AS tags
  FROM contact_tags ct JOIN tags t ON t.id=ct.tag_id GROUP BY ct.contact_id
)
SELECT
  -- ----- name (AgentBox requires Last Name; couples/dual names need a manual check) -----
  coalesce(c.first_name, CASE WHEN c.name ~ ' ' THEN split_part(c.name,' ',1) ELSE c.name END)                         AS "First Name",
  coalesce(c.last_name,  CASE WHEN c.name ~ ' ' THEN trim(substr(c.name, position(' ' in c.name)+1)) ELSE NULL END)     AS "Last Name",
  c.title                                          AS "Title",
  c.salutation                                     AS "Salutation",
  c.company_name                                   AS "Company",
  c.job_title                                      AS "Job Title",
  -- ----- contact methods -----
  c.email                                          AS "Email",
  ee.v                                             AS "Email 2",
  c.mobile                                         AS "Mobile",
  c.phone                                          AS "Phone",
  c.home_phone                                     AS "Home Phone",
  c.work_phone                                     AS "Work Phone",
  ep.v                                             AS "Other Phones",
  -- ----- address -----
  coalesce(c.address, c.address_line1)             AS "Street Address",
  c.suburb                                         AS "Suburb",
  coalesce(c.city, c.suburb)                       AS "City",
  c.state                                          AS "State",
  c.postcode                                       AS "Postcode",
  coalesce(c.country,'Australia')                  AS "Country",
  c.date_of_birth                                  AS "Date of Birth",
  -- ----- classification (map to AgentBox Contact Class in the wizard) -----
  CASE
    WHEN coalesce(tr.tags,'') ILIKE '%Vendor%' OR coalesce(tr.tags,'') ILIKE '%Seller%'
      OR coalesce(tr.tags,'') ILIKE '%Owner%'  OR c.relationship_category ILIKE '%SELLER%'
      OR c.lifecycle_stage ILIKE '%vendor%'                                  THEN 'Vendor'
    WHEN coalesce(tr.tags,'') ILIKE '%Buyer%'  OR c.contact_category ILIKE '%buyer%'
      OR c.relationship_category ILIKE '%BUYER%'                             THEN 'Buyer'
    WHEN coalesce(tr.tags,'') ILIKE '%Landlord%'                            THEN 'Landlord'
    WHEN coalesce(tr.tags,'') ILIKE '%Tenant%'                              THEN 'Tenant'
    ELSE 'Prospect'
  END                                              AS "Suggested Contact Class",
  tr.tags                                          AS "Source Tags (raw)",
  c.contact_type                                   AS "Contact Type (raw)",
  c.lead_status                                    AS "Lead Status (raw)",
  c.lead_temperature                               AS "Lead Temperature (raw)",
  c.rating                                         AS "Rating (raw)",
  c.source                                         AS "Source",
  -- ----- consent / DNC (AgentBox subscription & do-not flags) -----
  CASE WHEN c.email_opt_out OR c.dnc_email THEN 'Yes' ELSE 'No' END         AS "Do Not Email",
  CASE WHEN c.sms_opt_out  OR c.dnc_sms   THEN 'Yes' ELSE 'No' END          AS "Do Not SMS",
  CASE WHEN c.do_not_contact OR c.dnc_phone THEN 'Yes' ELSE 'No' END        AS "Do Not Call",
  c.client_ref                                     AS "Client Ref",
  -- ----- notes: profile narrative + cleaned activity history -----
  concat_ws(E'\n\n',
    nullif(c.notes,''),
    nullif(concat_ws(E'\n', nullif(c.story,''), nullif(c.selling_intentions,''),
                     nullif(c.current_situation_notes,''), nullif(c.pain_points,''),
                     nullif(c.pleasure_points,'')),''),
    nullif(nr.history,'')
  )                                                AS "Notes",
  -- ----- housekeeping -----
  c.id                                             AS "DataDungeon ID (do not import)",
  c.agentbox_id                                    AS "Existing AgentBox ID",
  to_char(c.created_at,'YYYY-MM-DD')               AS "Created",
  ( c.email ILIKE '%@example.com%'
    OR c.name IN ('Jo Blogs','Sarah Mitchell','David Chen','Emma Thompson') ) AS "suspected_test_record"
FROM contacts c
LEFT JOIN notes_rollup nr ON nr.contact_id=c.id
LEFT JOIN extra_email  ee ON ee.contact_id=c.id
LEFT JOIN extra_phone  ep ON ep.contact_id=c.id
LEFT JOIN tag_rollup   tr ON tr.contact_id=c.id
ORDER BY "Last Name" NULLS LAST, "First Name";
-- TIP: before importing, sort by suspected_test_record and delete the TRUE rows,
--      and split couples (e.g. "Michael & Rhonda Watts") into two cards if needed.


-- ============================================================================
-- BLOCK 2  ->  save as:  properties.csv
-- (AgentBox loads properties/listings via Support or API - this is the source feed)
-- ============================================================================
SELECT
  p.id                                   AS "DataDungeon Property ID",
  coalesce(p.street_address, p.address)  AS "Street Address",
  p.suburb                               AS "Suburb",
  p.state                                AS "State",
  p.postcode                             AS "Postcode",
  coalesce(p.country,'Australia')        AS "Country",
  p.property_type                        AS "Property Type",
  p.bedrooms                             AS "Bedrooms",
  p.bathrooms                            AS "Bathrooms",
  p.car_spaces                           AS "Car Spaces",
  p.land_area_sqm                        AS "Land Area (sqm)",
  p.floor_area_sqm                       AS "Floor Area (sqm)",
  p.year_built                           AS "Year Built",
  p.listing_status                       AS "Status",
  coalesce(p.list_price, p.price)        AS "List Price",
  p.sale_price                           AS "Sale Price",
  p.estimated_value                      AS "Estimated Value",
  to_char(p.appraisal_date,'YYYY-MM-DD') AS "Appraisal Date",
  to_char(p.listed_at,'YYYY-MM-DD')      AS "Listed Date",
  to_char(p.contract_date,'YYYY-MM-DD')  AS "Contract Date",
  to_char(p.settlement_date,'YYYY-MM-DD')AS "Settlement Date",
  to_char(p.sold_at,'YYYY-MM-DD')        AS "Sold Date",
  owner.name                             AS "Owner Contact",
  owner.id                               AS "Owner Contact ID",
  p.property_description                  AS "Description",
  p.notes                                AS "Notes"
FROM properties p
LEFT JOIN contacts owner ON owner.id = p.owner_contact_id
ORDER BY "Suburb", "Street Address";


-- ============================================================================
-- BLOCK 3  ->  save as:  listings_appraisals_sales.csv
-- ============================================================================
SELECT
  l.id                                      AS "DataDungeon Listing ID",
  l.address                                 AS "Address",
  l.property_type                           AS "Property Type",
  l.for_sale_or_lease                       AS "Sale or Lease",
  l.status                                  AS "Status",
  l.pipeline_stage                          AS "Pipeline Stage",
  l.sale_method                             AS "Sale Method",
  l.authority_type                          AS "Authority Type",
  CASE WHEN l.listed_as_auction THEN 'Yes' ELSE 'No' END AS "Auction",
  CASE WHEN l.off_market THEN 'Yes' ELSE 'No' END        AS "Off Market",
  coalesce(l.search_price, l.price)         AS "Price",
  l.display_price                           AS "Display Price",
  l.commission_gross_pct                    AS "Commission %",
  to_char(l.key_date_appraisal,'YYYY-MM-DD')    AS "Appraisal Date",
  to_char(l.key_date_listed,'YYYY-MM-DD')       AS "Listed Date",
  to_char(l.key_date_agency_expiry,'YYYY-MM-DD')AS "Authority Expiry",
  to_char(l.key_date_contract,'YYYY-MM-DD')     AS "Contract Date",
  to_char(l.key_date_settlement,'YYYY-MM-DD')   AS "Settlement Date",
  vendor.name                               AS "Primary Vendor",
  vendor.id                                 AS "Primary Vendor ID",
  l.property_id                             AS "Linked Property ID",
  l.marketing_headline                      AS "Marketing Headline",
  l.marketing_description                   AS "Marketing Description",
  l.notes                                   AS "Notes",
  l.agentbox_id                             AS "Existing AgentBox ID"
FROM listings l
LEFT JOIN contacts vendor ON vendor.id = l.contact_id
ORDER BY l.created_at;


-- ============================================================================
-- BLOCK 4  ->  save as:  listing_contacts.csv   (vendors / buyers / solicitors per listing)
-- ============================================================================
SELECT
  lcl.listing_id        AS "Listing ID",
  l.address             AS "Listing Address",
  k.name                AS "Contact",
  k.id                  AS "Contact ID",
  lcl.role              AS "Role",
  lcl.offer_status      AS "Offer Status",
  lcl.firm_name         AS "Firm"
FROM listing_contact_links lcl
LEFT JOIN listings l ON l.id = lcl.listing_id
LEFT JOIN contacts k ON k.id = lcl.contact_id
ORDER BY lcl.listing_id;


-- ============================================================================
-- BLOCK 5  ->  save as:  offers_sales.csv
-- ============================================================================
SELECT
  o.id                                   AS "Offer ID",
  l.address                              AS "Listing Address",
  o.ref_code                             AS "Ref",
  to_char(o.offer_date,'YYYY-MM-DD')     AS "Offer Date",
  o.offer_price                          AS "Offer Price",
  buyer.name                             AS "Buyer",
  o.status                               AS "Status",
  to_char(o.exchange_date,'YYYY-MM-DD')  AS "Exchange Date",
  to_char(o.settlement_date,'YYYY-MM-DD')AS "Settlement Date",
  o.deposit_amount                       AS "Deposit",
  o.gross_comm_incgst                    AS "Gross Commission (inc GST)",
  o.inclusions                           AS "Inclusions",
  o.special_conditions                   AS "Special Conditions",
  o.notes                                AS "Notes"
FROM listing_offers o
LEFT JOIN listings l ON l.id=o.listing_id
LEFT JOIN contacts buyer ON buyer.id=o.buyer_contact_id
ORDER BY o.offer_date;


-- ============================================================================
-- BLOCK 6  ->  save as:  contact_property_links.csv  (ownership / buyer-property history)
-- ============================================================================
SELECT
  k.name                                    AS "Contact",
  k.id                                      AS "Contact ID",
  coalesce(p.street_address,p.address)      AS "Property",
  p.id                                      AS "Property ID",
  cpl.role                                  AS "Role",
  cpl.ownership_percentage                  AS "Ownership %",
  to_char(cpl.acquisition_date,'YYYY-MM-DD')AS "Acquired",
  cpl.purchase_price                        AS "Purchase Price",
  cpl.sale_price                            AS "Sale Price",
  cpl.notes                                 AS "Notes"
FROM contact_property_links cpl
LEFT JOIN contacts k ON k.id=cpl.contact_id
LEFT JOIN properties p ON p.id=cpl.property_id
ORDER BY k.name;


-- ============================================================================
-- BLOCK 7  ->  save as:  tasks_appointments.csv
-- ============================================================================
SELECT 'task' AS "Kind", k.name AS "Contact", ct.title AS "Title", ct.notes AS "Details",
       to_char(ct.due_at,'YYYY-MM-DD HH24:MI') AS "Due",
       to_char(ct.completed_at,'YYYY-MM-DD HH24:MI') AS "Completed"
FROM contact_tasks ct LEFT JOIN contacts k ON k.id=ct.contact_id
UNION ALL
SELECT 'appointment', k.name, a.title, concat_ws(' | ',a.location,a.notes),
       to_char(a.date,'YYYY-MM-DD HH24:MI'), NULL
FROM appointments a LEFT JOIN contacts k ON k.id=a.contact_id
ORDER BY "Due" NULLS LAST;


-- ============================================================================
-- BLOCK 8  ->  save as:  invoices.csv
-- ============================================================================
SELECT
  i.invoice_number AS "Invoice #", i.direction AS "Direction", i.status AS "Status",
  i.counterparty_name AS "Counterparty", i.property_address AS "Property",
  to_char(i.issue_date,'YYYY-MM-DD') AS "Issued", to_char(i.due_date,'YYYY-MM-DD') AS "Due",
  i.subtotal AS "Subtotal", i.gst_amount AS "GST", i.total AS "Total",
  to_char(i.paid_date,'YYYY-MM-DD') AS "Paid Date", i.paid_amount AS "Paid Amount", i.notes AS "Notes"
FROM invoices i
ORDER BY i.issue_date;


-- ============================================================================
-- BLOCK 9  ->  save as:  buyer_requirements.csv
-- ============================================================================
SELECT
  k.name AS "Contact", br.action AS "Looking To", br.property_type AS "Property Type",
  br.category AS "Category", br.state AS "State", array_to_string(br.suburbs,', ') AS "Suburbs",
  br.price_min AS "Price Min", br.price_max AS "Price Max",
  br.beds_min AS "Beds Min", br.baths_min AS "Baths Min", br.parking_min AS "Parking Min",
  br.notes AS "Notes"
FROM buyer_requirements br LEFT JOIN contacts k ON k.id=br.contact_id;


-- ============================================================================
-- BLOCK 10 ->  OPTIONAL full raw archive (one JSON column per table).
-- Run only if you want a complete untouched backup. Download as CSV; each cell
-- holds the full JSON for that table. Useful as a "nothing-left-behind" archive.
-- ============================================================================
SELECT
 (SELECT count(*) FROM contacts)      AS contacts,
 (SELECT count(*) FROM properties)    AS properties,
 (SELECT count(*) FROM listings)      AS listings,
 (SELECT count(*) FROM interactions)  AS interactions,
 (SELECT count(*) FROM touches)       AS touches,
 (SELECT count(*) FROM contact_property_links) AS contact_property_links,
 (SELECT count(*) FROM listing_offers) AS offers,
 (SELECT count(*) FROM invoices)      AS invoices;
-- (Counts let you reconcile row totals after each CSV download.)
