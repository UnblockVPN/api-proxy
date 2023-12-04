import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import './styles.css';
import { ReactComponent as Logo } from './logo.svg';
import { insertVoucher, insertAccount } from './supabaseClient';

function App() {
  const voucherPlaceholder = '0000-0000-0000-0000';
  const accountPlaceholder = '0000-0000-0000-0000';
  const [voucher, setVoucher] = useState('');
  const [account, setAccount] = useState('');
  const generateVoucher = async () => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    setVoucher(result);
    try {
      const newVoucherCode = result.replace(/\s/g, ''); // Remove spaces
      await insertVoucher(newVoucherCode); // Send voucher code without spaces to Supabase
      console.log('Voucher inserted successfully');
    } catch (error) {
      console.error('Error inserting voucher:', error);
    }
  }
  const generateAccountNumber = async () => {
    let newAccountNumber = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      newAccountNumber += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    try {
      await insertAccount(newAccountNumber);
      console.log('New account number added successfully');
      setAccount(newAccountNumber); // Optionally display the new account number
    } catch (error) {
      console.error('Error inserting new account number:', error);
      alert('Failed to insert new account number.');
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="logo-container">
          <Logo />
        </div>
        <Typography variant="h4" className="title">
          Voucher & Account Management
        </Typography>
      </div>
      <div className="main-content">
        <div className="voucher-section">
          <Button variant="contained" onClick={generateVoucher} className="button">
            Generate Voucher Code
          </Button>
          <Typography className="result">
            {voucher || voucherPlaceholder}
          </Typography>
        </div>
        <div className="account-section">
          <Button variant="contained" onClick={generateAccountNumber} className="button">
            Add Account Number
          </Button>
          <Typography className="result">
            {account || accountPlaceholder}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export default App;