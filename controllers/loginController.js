const passport = require('passport');
const { db } = require('../models/connectDb');

// === Render trang đăng nhập ===
const renderLogin = async (req, res) => {
  const message = req.query.message;
  res.render('login', { message });
};

// === Xử lý đăng nhập bằng Custom Strategy (email + password) ===
const login = async (req, res, next) => {
  passport.authenticate('custom', async (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info ? info.message : 'Xác thực thất bại.' });
    }

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Lưu thông tin vào session
      req.session.user_id = user.id_nguoidung;
      req.session.name = user.tennguoidung;

      // Chuyển hướng hoặc trả về thông tin
        return res.render('dashboard');
    });
  })(req, res, next);
};

// === Điều hướng sang trang đăng nhập Google ===
const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

// === Xử lý callback từ Google OAuth ===
const googleCallback = async (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
      if (err) {
        console.error('Google OAuth Error:', err);
        return next(err);
      }
  
      if (!user) {
        console.warn('Google OAuth Failed - No user returned');
        console.warn('Info:', info);
        return res.redirect('/login?message=' + encodeURIComponent(info?.message || 'Đăng nhập bằng Google thất bại.'));
      }
  
      req.logIn(user, async (err) => {
        if (err) {
          console.error('Login session error after Google auth:', err);
          return next(err);
        }
  
        // Lưu thông tin vào session
        req.session.user_id = user.id_nguoidung;
        req.session.name = user.tennguoidung;
  
        console.log('Google login successful:', {
          id: user.id_nguoidung,
          name: user.tennguoidung,
          email: user.email
        });
  
        return res.render('dashboard');
      });
    })(req, res, next);
  };
  

module.exports = {
  renderLogin,
  login,
  googleAuth,
  googleCallback,
};
