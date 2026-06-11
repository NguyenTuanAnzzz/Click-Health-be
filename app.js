require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force IPv4 resolution first to avoid ENETUNREACH IPv6 connection failures on Render
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const usersRoutes = require('./routes/user.route');
const placesRoutes = require('./routes/place.route');
const befastHistoryRoutes = require('./routes/befast-history.route');
const vnpayRoutes = require('./routes/vnpay.route');
const videoRoutes = require('./routes/video.route');


const HttpError = require('./models/http-error.model');

const app = express();

app.use(bodyParser.json());
app.use('/uploads/images', express.static(path.join('uploads', 'images')));


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

app.use('/api/users', usersRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/history', befastHistoryRoutes);
app.use('/api/payment', vnpayRoutes);
app.use('/api/videos', videoRoutes);

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
    const PORT = process.env.PORT || 9999;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.log(err); 
  });

  mongoose.connection.on('connected', () => {
  console.log('Connected to DB:', mongoose.connection.name);
  
  // Khởi động cronjob nhắc nhở người dùng
  require('./services/cron.service');
});

