# 🧘 InboxZen

**A self-hosted Gmail organizer that lives entirely inside your own Google account.**

InboxZen is a Google Apps Script that automatically categorizes, silences, archives, and summarizes your Gmail — with a web-based settings dashboard, custom label builder, and advanced per-category flags. No third-party servers. No subscriptions. Your email never leaves Google.

---

## Why InboxZen

Most inbox tools are SaaS products that proxy your email through their own servers. InboxZen runs as a script attached directly to your Google account, fired by a time-based trigger once an hour. Nothing is ever deleted. Everything stays searchable in All Mail.

**Compared to tools like SaneBox or Clean Email:**

| | InboxZen | SaaS alternatives |
|---|---|---|
| Cost | Free | $7–36/month |
| Email privacy | Stays in your Google account | Passes through third-party servers |
| Customization | Full — edit the code | Limited to product features |
| Custom labels | Unlimited, with your own rules | Not supported |
| Setup | ~5 minutes | Account connection required |

---

## What It Does

### Auto-categorization
Sorts incoming mail into labeled buckets using sender domains and subject patterns across 7 built-in categories: Finance, Receipts & Orders, Travel, Social, Newsletters, Notifications, and Promotions.

### Smart archiving
Read non-starred emails leave your inbox after 14 days. Unread social and notification threads are swept after 7. Starred and important emails are never touched.

### Focus inbox
Real human conversations get an ⭐ Focus label so they never drown in automated mail.

### Advanced flags
Each category has toggleable flags for finer control — things like sub-labeling GitHub notifications separately from CI/CD alerts, keeping refunds visible while silencing shipping updates, or starring all finance emails regardless of other settings.

### Custom labels
Build your own labels with sender and subject rules, behavior settings, and colors — no code required.

### Unsubscribe detector
Flags any email containing unsubscribe signals. Run `listUnsubscribeCandidates()` to get a sorted list of the noisiest senders.

### Morning digest
A daily HTML email summarizing your Focus items, finance alerts, travel updates, and custom label contents — sent to yourself at a configured hour.

### Settings UI
A web-based dashboard (served by Apps Script's built-in web app hosting) for managing everything without touching code.

---

## Labels Created

| Label | Behavior |
|---|---|
| ⭐ Focus | Real conversations — stays in inbox |
| 💳 Finance | Bank alerts, statements, invoices — starred |
| ✈️ Travel | Flights, hotels, confirmations — stays in inbox |
| 🧾 Receipts & Orders | Order confirmations, shipping — auto-archived |
| 📰 Newsletters | Mailing lists — skip inbox |
| 💬 Social | LinkedIn, Twitter, Discord — silenced |
| 🔔 Notifications | GitHub, Jira, CI/CD — silenced |
| 🏷️ Promotions | Sales, deals, coupons — silenced |
| 🚫 Unsubscribe Me | Flagged for unsubscribing |

Sub-labels (optional, enabled via flags): ✈️ Flights, 🏨 Hotels, 📦 Deliveries, 🔄 Refunds, 💼 LinkedIn, 🎮 Discord, ▶️ YouTube, 📝 Substack, 🐙 GitHub, ⚙️ CI/CD, 📡 Monitoring

---

## Setup

### Prerequisites
- A Google account
- Access to [Google Apps Script](https://script.google.com)

### Installation

**1. Create a new Apps Script project**

Go to [script.google.com](https://script.google.com) → **New project**

**2. Add the files**

In the project editor, create two files:
- Rename the default `Code.gs` to `InboxZen.gs` and paste the contents of [`InboxZen.gs`](InboxZen.gs)
- Click **+** → **HTML** → name it `InboxZen-UI` and paste the contents of [`InboxZen-UI.html`](InboxZen-UI.html)

**3. Enable the Gmail Advanced Service** *(required for filter deletion)*

Click **+** next to **Services** in the left sidebar → find **Gmail API** → toggle **ON** → Save

**4. Run setup**

In the function dropdown, select **`setupInboxZen`** → click **▶ Run** → accept the Gmail permissions popup.

This will:
- Wipe all existing labels and filters (see [Before You Run](#before-you-run))
- Create all InboxZen labels
- Install an hourly processing trigger
- Install a daily digest trigger
- Run an immediate first pass on your inbox

**5. Open the Settings UI** *(optional)*

Deploy → **New deployment** → **Web App** → Execute as: *Me* → Who has access: *Only myself* → **Deploy** → open the URL.

---

## Before You Run

`setupInboxZen()` calls `resetInboxToScratch()` as its first step, which **deletes all your existing Gmail labels and filters**. Your emails are never deleted — labels are just removed from them.

To preview exactly what will be wiped before committing, run `previewReset()` first. It prints a full manifest to the execution log without changing anything.

---

## Settings UI

The web app dashboard has six sections:

**Overview** — status bar, per-category summary, quick enable/disable toggles

**Categories** — behavior chips (auto-read, skip inbox, star) and expandable Advanced Flags drawers for each category

**Custom Labels** — create labels with your own sender/subject rules, color picker, and behavior settings

**Archiving** — sliders for archive timing and max threads per run

**Daily Digest** — toggle, delivery hour, weekday-only option

**Protected Senders** — tag-based input for senders that are never touched

Changes take effect immediately on save (labels are synced) and apply to new mail on the next processing run.

---

## Manual Functions

Run any of these from the Apps Script editor by selecting the function name in the dropdown and clicking ▶ Run.

| Function | What it does |
|---|---|
| `setupInboxZen()` | Full install: reset → labels → triggers → first pass |
| `runInboxZen()` | Trigger a processing run immediately |
| `sendDailyDigest()` | Send the digest right now (useful for testing) |
| `listUnsubscribeCandidates()` | Print sorted list of unsubscribe-flagged senders |
| `previewReset()` | Dry-run: show all labels and filters that would be deleted |
| `resetInboxToScratch()` | Wipe all labels and filters |
| `resetProcessedFlag()` | Re-queue all mail for re-processing |
| `teardownInboxZen()` | Fully remove InboxZen: labels, triggers, saved settings |

---

## Configuration

Edit the `DEFAULTS` object at the top of `InboxZen.gs` to change the out-of-the-box values. All settings can also be changed at runtime via the Settings UI without touching code.

```javascript
config: {
  archiveReadAfterDays:              14,   // Archive read non-starred mail after N days
  archiveUnreadLowPriorityAfterDays: 7,    // Sweep unread social/notifications after N days
  sendDailyDigest:                   true,
  digestHour:                        7,    // 0–23, your account timezone
  digestOnlyOnWeekdays:              true,
  enableFocusInbox:                  true,
  autoReadNotifications:             true,
  archiveStaleThreads:               false, // Archive threads with no reply after staleThreadDays
  staleThreadDays:                   60,
  maxThreadsPerRun:                  200,   // Increase for large backlogs; watch execution time
  neverTouchSenders: [
    "payroll@", "hr@", "irs.gov"           // Substring matches — add your own
  ],
}
```

### Adding sender or subject rules

Extend the `BASE_MATCHERS` object in `InboxZen.gs` to add patterns to any built-in category, or use the Custom Labels UI for ad-hoc rules.

```javascript
finance: {
  fromContains: [
    "mybank.com",        // ← add your bank here
    ...
  ],
  subjectContains: [
    "your statement",    // ← add subject fragments here
    ...
  ],
},
```

---

## How It Stays Running

InboxZen uses Apps Script's time-based triggers — no server required. The hourly processing trigger and daily digest trigger both appear under **Triggers** in the Apps Script editor (clock icon in the sidebar), where you can see the last run time, next scheduled run, and any error history.

**Things that can interrupt it:**
- OAuth reauthorization (~every 6 months) — Google emails you a notice; fix takes 30 seconds
- Repeated unhandled errors — Google pauses triggers after consecutive failures; check the trigger dashboard
- Daily quota limits — generous for personal use; only relevant during large backfills

**Things that won't interrupt it:**
- Closing your browser or computer
- Google account inactivity

---

## Limitations

- Apps Script has a **6-minute execution limit** per run. `maxThreadsPerRun: 200` keeps runs well within this for normal use.
- Gmail API quota allows ~250 operations per second per user. Large backfills may occasionally hit this; the script picks up on the next hourly run.
- The Settings UI requires deploying as a Web App. If you only want the automation, `setupInboxZen()` works entirely without it.
- Filter deletion requires the Gmail Advanced Service (Gmail API) to be enabled. Labels work without it.

---

## Privacy

InboxZen runs entirely within your Google account under your own OAuth credentials. No data is sent anywhere. No external APIs are called. The only network requests are standard Gmail API calls made by Apps Script on your behalf.

---

## Contributing

Pull requests welcome. A few areas that would make good contributions:

- Additional sender/subject patterns for built-in categories
- New advanced flag ideas
- Localization of the digest email
- A `CHANGELOG.md` as the project evolves

Please test changes against a real Gmail account before submitting. The `previewReset()` function is your friend.

---

## License

MIT — do whatever you want with it.

---

*Built with Google Apps Script. Inspired by the universal desire to never think about email again.*
