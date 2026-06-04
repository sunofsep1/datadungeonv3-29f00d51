# MEMORY.md - Long-Term Memory

## 🚀 QUICK REFERENCE (Updated 4 June 2026)

**What's ready RIGHT NOW:**
- ✅ June Postcard carousel (9 PNG slides) → Ready to post
- ✅ Autumn POV carousel (4 PNG slides) → Ready to post
- ✅ May Market Report (PNG) → Ready to post
- ✅ **Winter Home Buying carousel (5 PNG slides)** → JUST BUILT, ready to post
- ✅ **22-Page Winter Home Buyer Guide** → Complete copy, ready for Canva
- ✅ Video builder (build-social-video.py) → Create MP4s on demand
- ✅ Photo library (10 curated stock photos) → Organized & named
- ✅ Brand spec (colors, fonts, style) → Locked in /assets/brand-spec.json

**All files in:** `~/.openclaw/workspace/social-content/final-posts/` + templates directory

**CALL LISTS (4 June 2026):**
- **System:** `call-lists/` directory with JSON → HTML generator
- **Generator:** `scripts/generate-call-list.js` (Node.js, no dependencies)
- **Template:** `scripts/call-list-template.json` (copy to start)
- **Docs:** `call-lists/SYSTEM.md` (full guide)
- **Examples:** 
  - `nurture-call-list.html` (10 overdue nurture sequences) ✅ Ready
  - `call-lists/20-hickory-drive-buyers.html` (22 buyer enquiries) ✅ Ready
- **Usage:** `node scripts/generate-call-list.js call-lists/my-data.json`
  - Creates JSON with title, sections (HOT/WARM/COOL), contacts
  - Generates HTML automatically
  - Same style as 20 Hickory Drive buyer list
- **Deploy:** Git push to `call-lists/` folder → auto-builds on Netlify

**WINTER CONTENT (27 May 2026):**
- Instagram carousel: `/social-content/final-posts/winter-carousel/` (5 PNG slides)
- Caption + posting guide: `/social-content/WINTER-CAROUSEL-CAPTION.md`
- Full guide copy: `/guides/WINTER-HOME-BUYER-GUIDE-REDLAND-BAY.md` (22 pages, Canva-ready)

**To build a video right now:**
```bash
python3 ~/.openclaw/workspace/scripts/build-social-video.py \
  --template pov \
  --photo YOUR_PHOTO.jpg \
  --copy "Your text here" \
  --output output.mp4
```

---

**WHO YOU'RE WORKING WITH:**
- **Name:** Greg (sunofsep@gmail.com)
- **Timezone:** Australia/Brisbane (AEST)
- **Profession:** Real Estate Agent — Sotheby's International Realty, Queensland
- **Key Markets:** Redland Bay area (primary focus)
- **Personality:** Particular about design/aesthetics, prefers voice notes, direct communication, doesn't like repeating himself

**PRIMARY WORK DOMAINS:**
- Client admin & relationship management
- Property briefs & listing presentations
- Appointment scheduling & calendar management
- Professional report generation (VERY particular about design — PDFs must be polished, not generic)
- Market research & competitor analysis
- Nurture sequence management (currently 25+ overdue steps from March-April)
- Deal pipeline tracking

**TOOLS & INTEGRATIONS:**
- **Google Drive:** ✅ Full rclone access (authenticated 27 May 2026)
  - Stock Pics for Insta: 53 photos organized and accessible
  - Selling Social: Template folder linked
  - Can sync, download, search automatically
  - Command: `rclone ls google-drive:/` or `rclone copy google-drive:/folder ~/path/`
- **Data Dungeon CRM:** Full Supabase access via MCP. User ID: e1bd63ad-b120-4a5a-91c0-c3189bc8938c
  - Contains: 254 contacts, listings, nurture sequences, performance metrics
  - Latest backlog: 27 overdue nurture steps (5 hot, 17 warm, 5 cold). Oldest from 26 Mar.
  - Key sequences: "OTM intensive 90-day", "New client appraisal & listing path", "Future seller long nurture"
- **Voice Transcription:** Whisper CLI installed locally (base model, ~/.cache/whisper/)
- **Content Generation:**
  - **Videos:** build-social-video.py (1080x1920, 30fps, Canva+ quality)
  - **Images:** Puppeteer (HTML→PNG), ImageMagick (compositing, filters)
  - **Audio:** FFmpeg (processing, mixing)
- **Video Specs:** H.264, 3900kbps, yuv420p, 8-second cinematic with Ken Burns zoom
- **Scripts:**
  - render-social-template.js — HTML → Instagram PNG
  - build-social-video.py — Photo + text → MP4 Reel
  - social-content-manager.py — Calendar, scheduling

**CRITICAL PREFERENCES:**
- **PDF Design:** Must match the aesthetic of the "Vesper" nurture backlog report Greg showed (professional header, color-coded badges 🔥🟡🔵, clean typography, proper spacing, not amateurish)
- **Communication:** Voice notes are default. Text is fine too. Keep replies concise unless asked for detail.
- **Costs:** Greg pays per-token on Claude. Be ruthless about efficiency — direct DB queries, no LLM-in-loops for bulk ops, reusable scripts.
- **Iteration:** Greg doesn't like guessing/redesigns. Be clear about what needs input before starting.

**SOCIAL MEDIA STRATEGY (ACTIVE):**
- **Current account:** @gregleigh.sothebys (108 followers, ~2 months old)
- **Visual brand:** Polished, minimalist, elegant — Sotheby's premium aesthetic with warm Australian local angle
- **Color palette:** Navy (#1e5a96), Cream (#f5f1ed), Gold (#c9a961) — locked in assets/brand-spec.json
- **Typography:** Classic serif (Georgia/Garamond) — sophisticated, editorial feel
- **Tone:** Professional yet warm, community-focused, property-led with lifestyle messaging
- **Content mix:** Property listings, area marketing (Redland Bay/Brisbane Bayside), personal credentials, industry events

**ASSETS BUILT (27 May 2026 — Charlie's First Full Day):**

**STATIC IMAGE POSTS (Ready to upload):**
1. **June Postcard Carousel** (9 PNG slides) — Lifestyle monthly recap, Selling Social template style
   - Slides: cherry blossoms → wine bar → shadows → green marble → green kitchen → dog countryside → fallen leaves → horses → CTA (navy)
   - Location: `/social-content/final-posts/june-postcard-final-01.png` through `09.png`
   - Caption template ready in INSTAGRAM-CAPTIONS.md

2. **Autumn POV Carousel** (4 PNG slides) — "POV: All your hard work finally got you this..." format
   - Slides: fallen leaves, maple leaf, dog countryside, shadows
   - Text overlay: "POV: All your hard work finally got you this autumn lifestyle home in Redland Bay" (variations per slide)
   - Location: `/social-content/final-posts/autumn-pov-1.png` through `4.png`
   - Ready to post immediately

3. **May Market Report** (PNG) — Professional stats layout
   - Data: 38 new listings, 20 DOM, $1.1M avg sale price, 95% SLP, 30 sold houses
   - Location: `/redland-bay-market-report-may.png`
   - Template: `/templates/redland-bay-market-report-may.html`

**VIDEO GENERATION SYSTEM (Production ready):**
- **build-social-video.py** — Main video builder script
  - Input: Photo + text copy + template type
  - Output: MP4 (1080x1920, 30fps, H.264, 3900kbps, 8 seconds)
  - Quality: Better than Canva default (higher bitrate, sharper text shadows, Ken Burns zoom)
  - Command: `python3 ~/.openclaw/workspace/scripts/build-social-video.py --template pov --photo photo.jpg --copy "text" --output video.mp4`
  - Test video created: `/social-content/test-video.mp4` (1.7 MB, verified quality)

**SCRIPTS & TOOLS:**
1. **render-social-template.js** — HTML → PNG conversion (Puppeteer-based)
2. **build-social-video.py** — Photo + text → MP4 (FFmpeg-based, Ken Burns effect)
3. **social-content-manager.py** — Content calendar, scheduling, tracking
4. **Brand spec locked:** `/assets/brand-spec.json` (Navy #1e5a96, Cream #f5f1ed, Gold #c9a961, Georgia serif)

**INFRASTRUCTURE:**
- Puppeteer (Node) ✓ — HTML rendering
- ImageMagick (convert) ✓ — Image compositing
- FFmpeg ✓ — Video encoding (H.264, cinematic zoom, quality 18)
- Python 3 + PIL + Selenium ✓ — Image processing, browser automation
- Whisper ✓ — Voice transcription (already installed)

**PHOTO LIBRARY (Organized):**
- 10 stock photos sorted by theme: cherry blossoms, green marble bathroom, wine bar, camera workspace, concrete shadows, green kitchen, fallen leaves, maple leaf hand, dog countryside, horses
- Location: `/social-content/final-posts/*.jpg` (named clearly)

**DOCUMENTATION:**
- SOCIAL-MEDIA-SETUP.md — Full setup guide + quick start commands
- VIDEO-BUILDER-GUIDE.md — Video builder usage, specs, examples, batch processing guide
- INSTAGRAM-CAPTIONS.md — All captions + hashtags for each post

**NEXT ACTIONS (Priority order):**
1. ⏳ **Post June Postcard carousel** (9 slides, monthly recap format)
2. ⏳ **Post Autumn POV carousel** (4 slides, immediate high-engagement content)
3. 📹 **Build video versions** of June Postcard + Autumn POV using build-social-video.py
4. 📊 **Build July Market Report** (template ready, just need July data)
5. 🔄 **Set up cron reminders** for posting schedule (weekly cadence)
6. 📚 **Create education series** (buyer tips, staging, market advice)

**ACTIVE WORKFLOWS:**
- **Morning Briefing:** 9am Brisbane time, daily. Weather (Redland Bay) + 3-5 world news headlines. Cron job active.
- **Nurture Backlog:** 25+ steps due, needs triage + action (taskflow candidate)
- **PDF Templates:** In progress — currently 3/10 design-wise. Need to match Vesper aesthetic.
- **Instagram Content System:** ✅ COMPLETE (30 May 2026) — Full playbook built, no more clarifying questions needed

---

## INSTAGRAM MASTERY (30 May 2026 — LOCKED IN)

**I AM NOW WELL-VERSED IN:**
- Sotheby's luxury real estate Instagram aesthetics
- Post type strategy (carousel vs Reel vs single image)
- Caption formulas that match Greg's voice (professional yet warm, Redland Bay focused)
- Hashtag strategy (20-25 optimal, mix niche + volume)
- Your 5 stock photos + how to sequence them into posts
- Selling Social posting patterns (from folder study)

**HOW THIS WORKS NOW:**
- Greg says: "Make a post with the marble bathroom photo"
- I deliver: Complete caption + hashtags + posting recommendation
- No back-and-forth. No "What did you mean?" questions.

**REFERENCE DOCUMENT:** `/INSTAGRAM-STRATEGY.md` (9.3k, complete playbook)

**Key Principles I Follow:**
1. Carousel posts for stories/sequences (5-9 slides, hook + body + CTA)
2. Reels for algorithm (15-60 sec, trend-friendly, music-ready)
3. Single posts for lifestyle/design inspiration
4. Captions: 150-250 words, 1-2 emojis max, break into paragraphs
5. Always include location tag (Redland Bay) + 20-25 hashtags
6. Post 3x/week minimum (Mon/Wed/Fri typical for real estate)
7. Luxury tone: sophisticated, not cheesy (no 🏠 emojis, no overselling)

**IMPORTANT NOTES:**
- You're on Haiku model by default (switched from Opus, saves ~15× cost)
- Don't repeat workspace context every session — I'll read these files
- Prefer direct tool calls over explanations when possible
- Your iMac stays on lockscreen — OpenClaw runs as background service

**WORKFLOW FOR GREG (Going Forward):**

1. **Weekly Content:** Say what you want built
   - "Build me a June postcard carousel" → Done
   - "Create a video about [topic]" → Done
   - "Make 5 market report videos" → Batch processed

2. **Photos:** Send stock photos or describe what you need
   - I organize them in /social-content/final-posts/
   - Named clearly (cherry_blossoms, green_marble, etc.)

3. **Captions & Copy:** I write or adapt from Selling Social templates
   - All captions stored in INSTAGRAM-CAPTIONS.md
   - Ready to copy/paste into Instagram

4. **Video Creation:** Just say the word
   - I use build-social-video.py to generate MP4s
   - 8-second cinematic videos with Ken Burns zoom
   - Canva quality or better

5. **Posting:** You handle Instagram uploads
   - I remind you via cron jobs (when set up)
   - Captions + hashtags all ready to paste

**Key Numbers:**
- June Postcard: 9 slides
- Autumn POV: 4 slides
- Video quality: 1080x1920, 30fps, 3900kbps (H.264)
- Templates: 5+ ready to adapt
- Stock photos: 10 curated
- Brand colors: Navy (#1e5a96), Cream (#f5f1ed), Gold (#c9a961)

_Last updated: 27 May 2026, Charlie's first day (comprehensive build complete)_

---

## BATCH VIDEO BUILDER (Added 27 May 2026)

**Script:** `batch-build-videos.py`

**What it does:**
- Load 5, 10, 50+ videos from CSV or JSON
- Build them all in parallel
- Output ready-to-post MP4s

**Command:**
```bash
python3 ~/.openclaw/workspace/scripts/batch-build-videos.py \
  --input videos.csv \
  --output ~/Videos/batch
```

**CSV Format:**
```
photo,copy,template,name
/path/to/photo.jpg,Your text,pov,video-name
/path/to/photo2.jpg,More text,pov,video-name-2
```

**Tested:** Built 6 videos successfully (autumn-pov-01 through luxury-pov-01), 6.2 MB total, 2 minutes runtime.

**Examples in:** `/scripts/example-videos.csv` and `example-videos.json`

## Nurture Backlog Brief Template (Added 31 May 2026)

**Multi-page PDF template for overdue nurture steps — CRM contact cards style.**

**Files:**
- `scripts/nurture-brief-template.html` — Handlebars template (7-page layout, navy/gold theme)
- `scripts/render-contact-sheet.js` — Renders template to PDF via Puppeteer (reused from contact sheets)

**Build Process:**
1. Pull top 10 overdue nurture contacts from DataDungeon
2. Save to JSON with: name, phone, email, location, status_icon, temperature, timeframe, sequence, step, days_overdue, price_expectation, property_type, activity, status_note, source
3. Wrap in metadata object: `{ total_count, hot_count, date, contacts: [] }`
4. Render with template via Puppeteer
5. Output: 7-page PDF (cover + 10 cards + summary table)

**Quick Command:**
```bash
# Wrap data
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('nurture-backlog-top10.json'));fs.writeFileSync('nurture-brief-data.json',JSON.stringify({total_count:d.length,hot_count:d.filter(c=>c.status_icon==='🔥').length,date:new Date().toLocaleDateString('en-AU'),contacts:d},null,2));"

# Render
node scripts/render-contact-sheet.js nurture-brief-data.json output.pdf scripts/nurture-brief-template.html
```

**Layout:**
- **Cover page:** Title, total overdue count, hot lead count, date
- **Contact cards (10 pages):** Header (name, location, status icon), 3 info rows (phone/email/timeframe, sequence/step/days overdue, price/property/activity), priority highlight box, source notes
- **Summary table:** Quick reference with all 10 contacts, sortable by status/days overdue

**Design:**
- Navy (#1e5a96) gradient headers, gold (#c9a961) accents
- Status icons: 🔥 hot, 🟡 warm, 🔵 cold
- Page breaks optimized (cards don't split)
- Professional spacing, light gray alternating rows in table
- Print-ready (A4, proper margins, print background enabled)

**Output:** ~7 pages, ~450KB, matches Greg's Vesper CRM aesthetic

**Last used:** 31 May 2026 (rebuild for 32 overdue nurture steps)
