// middleware/auth.js
const passport = require('passport');
const bcrypt = require('bcrypt');
const { getUserByEmail, getUserById, createGoogleUser } = require('../models/connectDb');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// === Custom Strategy để xác thực bằng email + mật khẩu ===
class CustomStrategy extends passport.Strategy {
  constructor(options = {}, verify) {
    super();
    this.name = options.name || 'custom';
    this.verify = verify;
  }

  authenticate(req, options) {
    const { email, password } = req.body;
    this.verify(email, password, (err, user, info) => {
      if (err) return this.error(err);
      if (!user) return this.fail(info || { message: 'Xác thực thất bại.' });

      return this.success(user);
    });
  }
}

// === Hàm xác thực người dùng thông thường (email + mật khẩu) ===
const verify = async (email, password, done) => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return done(null, false, { message: 'Email không tồn tại.' });
    }

    const match = await bcrypt.compare(password, user.matkhau);
    if (!match) {
      return done(null, false, { message: 'Mật khẩu không đúng.' });
    }

    return done(null, {
      id_nguoidung: user.id_nguoidung,
      tennguoidung: user.tennguoidung,
      email: user.email
    });
  } catch (err) {
    return done(err);
  }
};

// === Sử dụng CustomStrategy ===
passport.use(new CustomStrategy({}, verify));

// === Cấu hình Google OAuth2 ===
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  accessType: 'offline',
  prompt: 'consent',
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const name = profile.displayName || 'No Name';
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

    if (!email) {
      return done(null, false, { message: 'Không tìm thấy email trong profile.' });
    }

    const user = await createGoogleUser(googleId, name, email);
    user.googleAccessToken = accessToken;
    user.googleRefreshToken = refreshToken;

    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// === Lưu user vào session ===
passport.serializeUser((user, done) => {
  done(null, {
    id_nguoidung: user.id_nguoidung,
    googleAccessToken: user.googleAccessToken,
    googleRefreshToken: user.googleRefreshToken
  });
});

// === Lấy user từ session ===
passport.deserializeUser(async (sessionUser, done) => {
  try {
    const user = await getUserById(sessionUser.id_nguoidung);
    if (!user) {
      return done(null, false);
    }
    user.googleAccessToken = sessionUser.googleAccessToken;
    user.googleRefreshToken = sessionUser.googleRefreshToken;
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// === Middleware kiểm tra xác thực ===
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id_nguoidung) {
    return res.status(401).json({
      success: false,
      error: 'Yêu cầu đăng nhập để thực hiện thao tác này'
    });
  }
  req.authUserId = req.user.id_nguoidung; // Lưu id_nguoidung để sử dụng trong controller
  next();
};

// Hàm khởi tạo Passport
function initializePassport(passportInstance) {
  passportInstance.use(new CustomStrategy({}, verify));
}

module.exports = { initializePassport, requireAuth };