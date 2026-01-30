# URL Shortener - Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A Supabase account

## Step-by-Step Setup Instructions

### 1. Install Dependencies
Open a terminal in the project directory and run:
```bash
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in your project details:
   - Project name: Choose any name (e.g., "url-shortener")
   - Database password: Create a strong password
   - Region: Choose the closest region to you
5. Wait for the project to be created (this may take a few minutes)

#### Get Your Supabase Credentials
1. Once your project is ready, go to Settings > API
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **Anon/Public Key** (under "Project API keys")

#### Create Database Tables
1. In your Supabase dashboard, go to the SQL Editor
2. Create the `urls` table by running this SQL:
```sql
CREATE TABLE urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT NOT NULL,
  original_url TEXT NOT NULL,
  custom_url TEXT UNIQUE,
  short_url TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr TEXT
);

-- Enable Row Level Security
ALTER TABLE urls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own URLs"
  ON urls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own URLs"
  ON urls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own URLs"
  ON urls FOR DELETE
  USING (auth.uid() = user_id);
```

3. Create the `clicks` table by running this SQL:
```sql
CREATE TABLE clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  url_id UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  city TEXT,
  country TEXT,
  device TEXT
);

-- Enable Row Level Security
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert clicks
CREATE POLICY "Anyone can create clicks"
  ON clicks FOR INSERT
  WITH CHECK (true);

-- Create policy for users to view clicks for their URLs
CREATE POLICY "Users can view clicks for their URLs"
  ON clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM urls
      WHERE urls.id = clicks.url_id
      AND urls.user_id = auth.uid()
    )
  );
```

#### Create Storage Buckets
1. In your Supabase dashboard, go to Storage
2. Create the first bucket:
   - Click "New Bucket"
   - **Bucket name:** `qrs`
   - **Public bucket:** Toggle ON (make it public)
   - Click "Create bucket"

3. Create the second bucket:
   - Click "New Bucket"
   - **Bucket name:** `profile_pic`
   - **Public bucket:** Toggle ON (make it public)
   - Click "Create bucket"

4. Set up storage policies:
   - Go to Storage > Policies
   - For the `qrs` bucket, click "New Policy" > "For full customization"
   - Create two policies:
     
     **Policy 1 - Allow uploads:**
     - Policy name: `Allow authenticated uploads to qrs`
     - Allowed operation: INSERT
     - Target roles: authenticated
     - WITH CHECK expression: `bucket_id = 'qrs'`
     - Click "Review" then "Save policy"
     
     **Policy 2 - Allow public reads:**
     - Policy name: `Allow public reads from qrs`
     - Allowed operation: SELECT
     - Target roles: public
     - USING expression: `bucket_id = 'qrs'`
     - Click "Review" then "Save policy"

   - For the `profile_pic` bucket, create similar policies:
     
     **Policy 1 - Allow uploads:**
     - Policy name: `Allow authenticated uploads to profile_pic`
     - Allowed operation: INSERT
     - Target roles: authenticated
     - WITH CHECK expression: `bucket_id = 'profile_pic'`
     - Click "Review" then "Save policy"
     
     **Policy 2 - Allow public reads:**
     - Policy name: `Allow public reads from profile_pic`
     - Allowed operation: SELECT
     - Target roles: public
     - USING expression: `bucket_id = 'profile_pic'`
     - Click "Review" then "Save policy"

**Alternative (Easier) Method - RECOMMENDED:**
If you encounter policy errors or "new row violates row-level security policy" during signup, use the SQL Editor to fix all policies at once:

```sql
-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to qrs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from qrs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to qrs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from qrs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to profile_pic" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from profile_pic" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to profile_pic" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from profile_pic" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to qrs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to profile_pic" ON storage.objects;

-- Ensure buckets exist and are public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qrs', 'qrs', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile_pic', 'profile_pic', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for qrs bucket (allow anyone to upload for authenticated and anon users)
CREATE POLICY "Anyone can upload to qrs"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'qrs');

CREATE POLICY "Allow public reads from qrs"
ON storage.objects FOR SELECT 
USING (bucket_id = 'qrs');

CREATE POLICY "Allow authenticated updates to qrs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'qrs');

CREATE POLICY "Allow authenticated deletes from qrs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'qrs');

-- Storage policies for profile_pic bucket (allow anyone to upload for signup)
CREATE POLICY "Anyone can upload to profile_pic"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'profile_pic');

CREATE POLICY "Allow public reads from profile_pic"
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile_pic');

CREATE POLICY "Allow authenticated updates to profile_pic"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile_pic');

CREATE POLICY "Allow authenticated deletes from profile_pic"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile_pic');
```

**IMPORTANT:** If you still get RLS errors during signup, also disable email confirmation:
1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth" section
3. Turn OFF "Enable Email Confirmations"
4. Click "Save"

**CRITICAL - After running the storage policies above, verify they were created:**
1. Go to Storage → Policies in Supabase
2. You should see 8 policies total (4 for qrs, 4 for profile_pic)
3. If any are missing, manually create them using the UI

**Check Browser Console for Errors:**
- Open browser Developer Tools (F12)
- Go to Console tab
- Try creating a short link
- If you see "new row violates row-level security policy" or similar errors, the database policies are the issue
- If you see storage errors (400/403), the storage policies need fixing

### 3. Configure Environment Variables
1. Open the `.env` file in the project root
2. Replace the placeholder values with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_KEY=your_supabase_anon_key_here
```

### 4. Add Logo and Banner Images
The project references two image files that you'll need to add:
1. Place a logo image at: `public/logo.png`
2. Place a banner image at: `public/banner.jpeg`

You can create these images or download them from the original repository.

### 5. Run the Development Server
```bash
npm run dev
```

The application should now be running at `http://localhost:5173`

## Usage

1. **Sign Up**: Create a new account with your email, password, name, and profile picture
2. **Create Short URLs**: Enter a long URL and optionally customize the short URL
3. **View Dashboard**: See all your shortened URLs with statistics
4. **Track Analytics**: View click statistics including location data and device information
5. **Download QR Codes**: Each shortened URL comes with a downloadable QR code

## Deployment

### Build for Production
```bash
npm run build
```

The built files will be in the `dist` folder, ready for deployment to any static hosting service (Vercel, Netlify, etc.)

### Deploy to Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add your environment variables in the Vercel dashboard

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Make sure you copied the correct Supabase URL and anon key
   - Check that there are no extra spaces in your `.env` file

2. **Database errors**
   - Ensure all tables are created with the correct schema
   - Check that Row Level Security policies are properly set up

3. **Image upload fails**
   - Verify that storage buckets are created and set to public
   - Check that storage policies allow authenticated users to upload

4. **Can't create account**
   - Go to Supabase dashboard > Authentication > Settings
   - Make sure "Enable Email Confirmations" is turned off for development
   - Or check your email for the confirmation link

5. **Create button not working / No shortened URL created**
   - Open browser console (F12) and check for errors
   - Common causes:
     - **Storage policy error**: QR code upload is blocked. Make sure you ran the storage policies SQL
     - **Database policy error**: Check that the `urls` table policies allow INSERT for authenticated users
     - **Missing user_id**: The user must be logged in. Check that `user?.id` exists
   - **Quick fix**: Run this SQL in Supabase SQL Editor:
     ```sql
     -- Verify and fix urls table policies
     DROP POLICY IF EXISTS "Users can create their own URLs" ON urls;
     
     CREATE POLICY "Users can create their own URLs"
       ON urls FOR INSERT
       WITH CHECK (auth.uid() = user_id);
     
     -- Verify RLS is enabled
     ALTER TABLE urls ENABLE ROW LEVEL SECURITY;
     ```
   - Check Supabase Logs (Dashboard → Logs) for detailed error messages

6. **QR Code not displaying or downloading**
   - Verify the `qrs` storage bucket exists and is public
   - Check that storage policies allow INSERT and SELECT operations
   - Inspect the Network tab in browser dev tools for failed requests

## Project Structure
```
url-shortener/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   └── ui/         # UI components (shadcn)
│   ├── db/             # Database API functions
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Layout components
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   ├── App.jsx         # Main app component
│   ├── context.jsx     # React context for auth
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── .env                # Environment variables
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Support
If you encounter any issues, please check:
- Supabase dashboard for any error logs
- Browser console for client-side errors
- Make sure all environment variables are set correctly
