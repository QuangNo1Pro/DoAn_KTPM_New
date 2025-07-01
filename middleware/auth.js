const passport = require('passport');
const bcrypt = require('bcrypt');
const {getUserByEmail,getUserById,createGoogleUser} = require('../models/connectDb');
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
      //console.log(email, password);
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
     // console.log(user.matkhau);
    if (!user) {
      return done(null, false, { message: 'Email không tồn tại.' });
      }
     // console.log(password);

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
//console.log(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL)
// === Cấu hình Google OAuth2 ===
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  accessType: 'offline', // ⚠️ BẮT BUỘC để lấy refresh_token
  prompt: 'consent',      // ⚠️ Ép người dùng đồng ý lại lần nữa
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.upload'
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

    // Lưu accessToken và refreshToken vào user để serialize vào session
    user.googleAccessToken = accessToken;
    user.googleRefreshToken = refreshToken;

    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// === Lưu user vào session ===
passport.serializeUser((user, done) => {
  // Lưu cả token vào session
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
    // Gắn lại token vào user (nếu có)
    user.googleAccessToken = sessionUser.googleAccessToken;
    user.googleRefreshToken = sessionUser.googleRefreshToken;
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Hàm khởi tạo Passport
function initializePassport(passportInstance) {
  passportInstance.use(new CustomStrategy({}, verify));
}

module.exports = { initializePassport };
