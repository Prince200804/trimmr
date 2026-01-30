import supabase, {supabaseUrl} from "./supabase";

export async function getUrls(user_id) {
  let {data, error} = await supabase
    .from("urls")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error(error.message);
    throw new Error("Unable to load Urls");
  }

  return data;
}

export async function deleteUrl(id) {
  const {data, error} = await supabase.from("urls").delete().eq("id", id);

  if (error) {
    console.error(error.message);
    throw new Error("Unable to delete Url");
  }

  return data;
}

export async function createUrl(
  {title, longUrl, customUrl, user_id},
  qrcode
) {
  console.log("createUrl called with:", {title, longUrl, customUrl, user_id});
  
  const short_url = Math.random().toString(36).substring(2, 6);
  const fileName = `qr-${short_url}`;
  console.log("Generated short_url:", short_url);

  console.log("Uploading QR code to storage...");
  const {error: storageError} = await supabase.storage
    .from("qrs")
    .upload(fileName, qrcode);

  if (storageError) {
    console.error("Storage error:", storageError);
    throw new Error(storageError.message);
  }
  console.log("QR code uploaded successfully");

  const qr = `${supabaseUrl}/storage/v1/object/public/qrs/${fileName}`;

  console.log("Inserting URL into database...");
  const {data, error} = await supabase
    .from("urls")
    .insert([
      {
        title,
        original_url: longUrl,
        custom_url: customUrl || null,
        user_id,
        short_url,
        qr,
      },
    ])
    .select();

  if (error) {
    console.error(error.message);
    throw new Error("Error creating short URL");
  }

  return data;
}

export async function getLongUrl(id) {
  let {data, error} = await supabase
    .from("urls")
    .select("id, original_url")
    .or(`short_url.eq.${id},custom_url.eq.${id}`)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error fetching short link");
  }

  return data;
}

export async function getUrl({id, user_id}) {
  const {data, error} = await supabase
    .from("urls")
    .select("*")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Short Url not found");
  }

  return data;
}
