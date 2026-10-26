# MADE FOR YOU 💗

A digital gifting website for birthdays, anniversaries, and confessions. Build a letter, decorate photo memories, add captions, voice notes, music, a video, and share a gift link.

## Stack

- React + Vite
- Supabase Postgres + Storage
- Vercel hosting

## Important launch notes

- Gifts are public to anyone who has the link.
- The optional password in this starter is a convenience feature only. It is stored as a normal database field and is **not secure password protection**. Do not use it for sensitive messages. Before advertising password-protected gifts as private, implement server-side password hashing and verification (for example with a Supabase Edge Function).
- Uploaded media in this starter is public, so anyone with a file URL can access it.
- The starter does not implement accounts, payment, moderation, abuse reporting, or rate limiting.
- Supabase's anon/publishable key is intended for browser use; never put a Supabase service-role key in `.env` or frontend code.
- For a real public launch, add anti-abuse limits, content reporting, retention/deletion controls, and review your Supabase policies/storage limits.

## 1. Install the project

Install Node.js LTS from https://nodejs.org if you don't already have Node installed.

Open **Windows Command Prompt (CMD)** and run:

```bat
cd %USERPROFILE%\Downloads
```

Extract the `made-for-you.zip` file first, then enter the extracted project folder. If you extracted it to Downloads:

```bat
cd made-for-you
npm.cmd install
```

## 2. Create Supabase project

1. Go to https://supabase.com and create a new project.
2. Open **SQL Editor** in your project.
3. Open `supabase/schema.sql` from this folder, copy the complete file contents, paste into SQL Editor, and click **Run**.
4. In Supabase, open **Project Settings → API** (or the API keys page).
5. Copy the Project URL and the publishable/anon key. Never use the `service_role` key in a browser app.

## 3. Configure environment variables

In CMD, from the project folder:

```bat
copy .env.example .env.local
notepad .env.local
```

Replace the placeholders with your own values:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Save and close Notepad. Do not add quotes around the values.

## 4. Run locally

```bat
npm.cmd run dev
```

Open the local URL shown in CMD, usually http://localhost:5173.

Try making a gift. When Supabase is configured correctly, the app uploads the media and saves the gift record online. If Supabase is not configured, the app shows a preview-mode warning; preview links are only stored in that browser session and are not permanent.

Stop the dev server with `Ctrl + C`.

## 5. Build check

```bat
npm.cmd run build
```

A successful build creates the `dist` folder.

## 6. Deploy to Vercel

1. Create/sign in to https://vercel.com.
2. Create a new project and import the extracted project folder via GitHub, or use the Vercel CLI.
3. In Vercel project **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
4. Enable these variables for Production, Preview, and Development as appropriate.
5. Deploy/redeploy.

### Optional Windows CLI deployment

Install Git and make a GitHub repository, then push the project. Alternatively install Vercel CLI:

```bat
npm.cmd install -g vercel
vercel.cmd
vercel.cmd --prod
```

If `vercel.cmd` is not found, use `npx.cmd vercel` and `npx.cmd vercel --prod`.

## 7. Verify the live site

- Open the Vercel production URL in an incognito window.
- Create a test gift with a small image and a short message.
- Copy the gift link and open it in another browser/device.
- Check that the gift, image, audio, and video load.
- Check the Supabase `gifts` table and `gift-media` Storage bucket to verify data was saved.

## Troubleshooting

### “Supabase is not configured”
Check `.env.local` spelling, save the file, and restart `npm.cmd run dev`. Vite reads environment variables at startup.

### “Invalid API key”
Use the correct project URL and the project publishable/anon key. Do not use a key from another Supabase project.

### Storage upload fails
Confirm you ran all of `supabase/schema.sql` and that the `gift-media` bucket and policies exist. Check Supabase logs for policy errors.

### Gift opens but no photos appear
Check that the bucket is public and that uploaded file URLs open in a browser.

### Vercel still shows old content
Confirm environment variables are set in Vercel and redeploy the latest commit.

## Suggested next steps before a broad public launch

1. Add server-side password verification using a Supabase Edge Function; never treat the current plain-text password as secure.
2. Add an edit/delete token or account system so senders can manage gifts.
3. Add upload rate limits, abuse reporting, quotas, moderation, and privacy/deletion controls.
4. Add privacy-preserving analytics and custom social share preview metadata.
