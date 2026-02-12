const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


const HttpError = require('./models/http-error');
require('dotenv').config();
const app = express();

app.use(bodyParser.json());


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});



app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500).json({
    message: error.message || 'Something went wrong!'
  });
});

mongoose
  .connect(
    process.env.DATABASE
  )
  .then(() => {
    app.listen(9999);
    console.log('Successful')
  })
  .catch(err => {
    console.log(err); 
  });

  mongoose.connection.on('connected', () => {
  console.log('Connected to DB:', mongoose.connection.name);
});

