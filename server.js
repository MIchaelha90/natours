// have anything related to express in one file and then have everything related to server
// in another file. Where we start our server.
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// have uncaught exception before everything else, otherwise it won't catch
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception!! shutting down...');
  console.log(err);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

// Our database string in the config file
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Connect to database with string
mongoose
  .connect(DB, {
    // process.env.DATABASE_LOCAL --> for local connection
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection succesful');
  });

// require app / express after the config variables has been read
const app = require('./app');

//console.log(process.env);
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection !! shutting down...');
  // default properties that we have on all errors
  console.log(err.name, err.message);

  // We give the server time to finish the request that are still pending / handled
  // and only after that we close the server
  server.close(() => {
    // 0 success, 1 uncaught exception - Needs to get restarted with tool e.g. hosting
    process.exit(1);
  });
});
