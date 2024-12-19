// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Pass Supabase client to the controller
router.post('/signup', (req, res, next) => {
  req.supabase = res.locals.supabase;  // Make Supabase client available to controller
  next();
}, authController.signup);

router.post('/login', (req, res, next) => {
  req.supabase = res.locals.supabase;  // Make Supabase client available to controller
  next();
}, authController.login);

router.post('/logout', (req, res, next) => {
  req.supabase = res.locals.supabase;  // Make Supabase client available to controller
  next();
}, authController.logout);

router.get('/activities', (req, res, next) => {
  req.supabase = res.locals.supabase;
  next();
}, authController.getActivities);
// ... existing routes ...

router.get('/activities', (req, res, next) => {
  req.supabase = res.locals.supabase;
  next();
}, authController.getActivities);

module.exports = router;
module.exports = router;



