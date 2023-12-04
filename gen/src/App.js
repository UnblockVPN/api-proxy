import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import './styles.css';
import { ReactComponent as Logo } from './logo.svg';
import { insertVoucher } from './supabaseClient';

function App() {
  const [voucher, setVoucher] = useState('');

  const generateVoucher = async () => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    setVoucher(result);
    try {
      const voucherCodeWithoutSpaces = result.replace(/\s/g, ''); // Remove spaces
      await insertVoucher(voucherCodeWithoutSpaces); // Send voucher code without spaces to Supabase
      console.log('Voucher inserted successfully');
    } catch (error) {
      console.error('Error inserting voucher:', error);
    }
  };
  return (
    <div>
      <Logo className="logo" />
      <div style={{ textAlign: 'center', marginTop: '20px', padding: '20px' }}>
        <Typography variant="h4" style={{ marginBottom: '30px' }}>Generate Free Voucher Code</Typography>
        <Button variant="contained" onClick={generateVoucher} style={{ margin: '20px 0' }}>
          GENERATE
        </Button>
        {voucher && (
          <Typography style={{ marginTop: '20px', cursor: 'pointer' }}>
            {voucher}
          </Typography>
        )}
      </div>
    </div>
  );
}

export default App;