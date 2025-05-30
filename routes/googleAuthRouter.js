const express = require('express');
const passport = require('passport');
const router = express.Router();

// Trang chủ - link đăng nhập Google
router.get('/', (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

// ĐI TỚI GOOGLE LOGIN
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GOOGLE GỌI VỀ
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Đăng nhập thành công
    res.redirect('/dashboard');
  }
);

// DASHBOARD (yêu cầu login)
router.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  res.send(`Hello, ${req.user.displayName}! <a href="/logout">Logout</a>`);
});

// LOGOUT
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;
