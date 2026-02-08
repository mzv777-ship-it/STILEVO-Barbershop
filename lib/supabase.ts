
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myueurracohkcwzuqxso.supabase.co';
const supabaseKey = 'sb_publishable_MkeR1MeIA0Z_wwjk5vlbJA_mK36XrQR';

export const supabase = createClient(supabaseUrl, supabaseKey);
