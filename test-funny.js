//test.js
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const { getRandomFunnyWords } = require('./utils');


// Example usage:
const funnyWords = getRandomFunnyWords();
if (funnyWords) {
  console.log(funnyWords);
}