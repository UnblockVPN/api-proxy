//generate_codes.js
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const voucherTable = 'vouchers';

// Function to generate a random voucher code
function generateRandomVoucherCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    return code;
  }
  
  // Function to insert voucher codes
  async function insertVoucherCodes() {
    try {
      const voucherCodes = [];
      const numberOfCodesToGenerate = 10000; // Change this to the desired number of codes
  
      for (let i = 0; i < numberOfCodesToGenerate; i++) {
        const voucherCode = generateRandomVoucherCode();
        voucherCodes.push({ code: voucherCode, duration_months: 3 }); // Set the duration as needed
      }
  
      const { data, error } = await supabase
        .from(voucherTable)
        .upsert(voucherCodes, { onConflict: ['code'], returning: ['code'] });
  
      if (error) {
        console.error('Error inserting voucher codes:', error);
      } else {
        console.log('Successfully inserted voucher codes:', data);
      }
    } catch (error) {
      console.error('Error inserting voucher codes:', error.message);
    }
  }
  
  insertVoucherCodes();