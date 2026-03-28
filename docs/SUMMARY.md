# Link Saver AI — Application Summary

## What Is It?

Link Saver AI is a bookmark manager that automatically reads and summarizes any URL you save using Claude AI. Paste a link, and the app fetches the article content, streams an AI-generated summary to you in real time, and caches it so repeat views are instant. You can organize your links with color-coded tags and search across everything you've saved.

---

## What It Does

- **Saves links** with automatic title and domain extraction
- **Streams AI summaries** token by token in real time as Claude generates them
- **Caches summaries** in Redis so the same URL never hits the AI twice unnecessarily
- **Organizes links** with a tag system — create tags, assign colors, and filter your library by tag
- **Searches** across link titles, domains, URLs, and tag names
- **Lets you re-summarize** any link to get a fresh AI take

---

## User Flows

### 1. Creating an Account

1. Open the app — you'll see a login/register form
2. Choose **Register**, enter your email and a password, and click **Register**
3. You're logged in immediately and taken to your (empty) dashboard

### 2. Logging In

1. Open the app
2. Enter your email and password and click **Log In**
3. Your session is remembered for 30 days — you won't need to log in again on the same device

### 3. Saving a Link

1. Paste any URL into the input at the top of the dashboard
2. Click **Save Link**
3. The link appears in your sidebar with a **Pending** badge while the server fetches the page content in the background
4. Click on the link in the sidebar to open it

### 4. Generating a Summary

1. Select a saved link from the sidebar
2. In the detail panel on the right, click **Generate Summary**
3. Watch the summary stream in word by word in real time
4. When complete, the badge on the link in the sidebar changes to **Complete** and a snippet of the summary appears

> If you've viewed the same URL before, the summary loads instantly from cache — no AI call needed.

### 5. Re-Summarizing a Link

1. Select a link that already has a summary
2. Click **Re-summarize** in the detail panel
3. The existing summary is cleared and a fresh one streams in

### 6. Managing Tags

Tags let you organize and filter your links.

**Creating a tag:**
1. In the Tags section, pick a color with the color picker
2. Type a name in the text input
3. Click **Add**

**Assigning a tag to a link:**
1. Select a link from the sidebar
2. In the Tags section, click the **+** button next to any tag to assign it
3. The tag chip appears on the link in the sidebar
4. Click **−** to remove it

**Filtering by tag:**
1. Click any tag chip in the Tags section to filter the sidebar to only links with that tag
2. Click **All** to clear the filter

**Deleting a tag:**
1. Click the **×** button next to any tag
2. The tag is removed from all links it was assigned to

### 7. Searching

1. Type in the search box above the link list
2. Results filter in real time across link titles, domains, URLs, and tag names

### 8. Deleting a Link

1. Select a link from the sidebar
2. Click **Delete** in the top right of the detail panel
3. The link and its cached summary are removed

### 9. Signing Out

Click **Sign Out** in the top right corner of the dashboard.

---

## Key Behaviors to Know

- **Summaries are cached.** If two users save the same URL, the second one gets the summary instantly from cache. Cache entries expire after 7 days.
- **Streaming is cancellable.** If you navigate away mid-stream, the server stops generating and doesn't waste tokens.
- **Tags are per-user.** Your tags are private to your account.
- **Search is live.** Results update as you type — no need to press Enter.
- **The session lasts 30 days.** You stay logged in across browser sessions until you sign out or the session expires.
