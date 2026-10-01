const { port } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server');
    console.error(err.message);
    process.exit(1);
  });
