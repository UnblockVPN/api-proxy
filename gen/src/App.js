import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import './styles.css';
import { ReactComponent as Logo } from './logo.svg';

function App() {
  const [voucher, setVoucher] = useState('');

  const generateVoucher = () => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      if ((i + 1) % 4 === 0 && i < 15) result += '-';
    }
    setVoucher(result);
  };

  const copyToClipboard = text => {
    const textToCopy = text.replace(/-/g, ''); // Remove dashes
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // You can display a message that copying was successful, if desired
        console.log('Text copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert(`Failed to copy text: ${err.message}`);

      });
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
          <Typography style={{ marginTop: '20px', cursor: 'pointer' }} onClick={() => copyToClipboard(voucher)}>
            {voucher}
          </Typography>
        )}
      </div>
    </div>
  );
}

export default App;
