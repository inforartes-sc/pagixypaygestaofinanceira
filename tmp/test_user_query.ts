
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkUser(email: string) {
  try {
    const { data, error } = await (supabaseAdmin.auth.admin as any).getUserByEmail(email);
    console.log("Method getUserByEmail called.");
    console.log("Data:", data?.user?.id || 'User not found');
    if (error) console.error("Error:", error);
  } catch (e: any) {
    console.error("Check failed:", e.message);
  }
}

checkUser('negocionlinefree@gmail.com');
