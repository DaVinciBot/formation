
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = `https://supa.davincibot.fr`;
const supabaseKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjczNzAxOTcsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.Wjq9SBB-CVUtItv1IzDBk7NKopA-OSd-VvNMQc6xpXU`;

export const supabase = createClient(supabaseUrl, supabaseKey);
        