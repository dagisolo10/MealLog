import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable_key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    return createBrowserClient(supabase_url!, publishable_key!);
}
