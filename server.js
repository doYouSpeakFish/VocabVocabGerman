const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the public directory
app.use(express.static('dist'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 