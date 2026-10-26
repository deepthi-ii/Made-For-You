import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT-REF") && !key.includes("YOUR_SUPABASE"));

export const supabase = supabaseConfigured ? createClient(url, key) : null;

export async function uploadGiftFile(file, giftId, folder = "media") {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${giftId}/${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("gift-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream"
  });
  if (error) throw error;
  const { data } = supabase.storage.from("gift-media").getPublicUrl(path);
  return { path, url: data.publicUrl };
}
