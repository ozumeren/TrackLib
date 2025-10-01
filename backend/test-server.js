const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001; // Ana sunucuyla çakışmaması için farklı bir port kullanıyoruz

app.use(cors());
app.use(bodyParser.json());

app.post('/test-body', (req, res) => {
    console.log('--- TEST SUNUCUSU ---');
    console.log('>>> /test-body rotası BAŞARIYLA tetiklendi!');
    console.log('Gelen Veri:', req.body);
    console.log('-------------------');
    res.status(200).json({ status: 'success', receivedData: req.body });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test sunucusu http://localhost:${PORT} adresinde çalışıyor...`);
});
