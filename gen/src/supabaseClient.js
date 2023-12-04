import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const insertAccount = async (accountNumber) => {
  const { data, error } = await supabase
    .from('accounts')
    .insert([{ account_number: accountNumber }]);

  if (error) throw error;
  return data;
};

export const insertVoucher = async (voucherCode) => {
  const { data, error } = await supabase
    .from('voucher_codes')
    .insert([{ voucher_number: voucherCode }]);

  if (error) throw error;
  return data;
};

export const checkVoucherExists = async (voucherCode) => {
  const { data, error } = await supabase
    .from('voucher_codes')
    .select('voucher_number', { count: 'exact' }) // Count the number of matches
    .eq('voucher_number', voucherCode);

  if (error) throw error;
  return data.length > 0; // true if any rows exist
};

export const checkAccountExists = async (accountNumber) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('account_number', { count: 'exact' }) // Count the number of matches
    .eq('account_number', accountNumber);

  if (error) throw error;
  return data.length > 0; // true if any rows exist
};
