import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import './styles.css';
import { ReactComponent as Logo } from './logo.svg';
import { insertVoucher, insertAccount, checkVoucherExists, checkAccountExists } from './supabaseClient';

function App() {
  const voucherPlaceholder = '0000-0000-0000-0000';
  const accountPlaceholder = '0000000000000000';
  const [voucher, setVoucher] = useState('');
  const [account, setAccount] = useState('');

  const generateVoucher = async () => {
    let result, voucherExists;
    do {
      result = '';
      const characters = '0123456789';
      const charactersLength = characters.length;
      for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        if ((i + 1) % 4 === 0 && i < 15) result += '-'; // Add dash after every 4 characters
      }
      voucherExists = await checkVoucherExists(result);
    } while (voucherExists);

    setVoucher(result);
    try {
      const newVoucherCode = result.replace(/-/g, ''); // Remove dashes
      await insertVoucher(newVoucherCode);
      console.log('Voucher inserted successfully');
    } catch (error) {
      console.error('Error inserting voucher:', error);
    }
  };

  const generateAccountNumber = async () => {
    let newAccountNumber, accountExists;
    do {
      newAccountNumber = '';
      const characters = '0123456789';
      const charactersLength = characters.length;
      for (let i = 0; i < 16; i++) {
        newAccountNumber += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      accountExists = await checkAccountExists(newAccountNumber);
    } while (accountExists);

    setAccount(newAccountNumber);
    try {
      await insertAccount(newAccountNumber);
      console.log('New account number added successfully');
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
