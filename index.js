const path = require('path');
const express = require('express');
const { engine } = require('express-handlebars');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config(); // Load biến môi trường từ file .env
const helpers = require('./helper/handlebars'); // Nạp file helper

const port = 3000;
const app = express();

// Đăng ký toàn bộ helper từ file handlebars.js
const hbs = require('handlebars');
for (let helper in helpers) {
  hbs.registerHelper(helper, helpers[helper]);
}

// Đăng ký helper bổ sung, bao gồm eq
hbs.registerHelper({
  eq: (a, b) => a === b, // Đảm bảo helper eq được đăng ký
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  not: v => !v,
  or: (...args) => {
    const options = args.pop(); // remove object cuối
    return args.some(Boolean);
  },
  and: (...args) => {
    const options = args.pop();
    return args.every(Boolean);
  },
  between: (n, a, b) => n >= a && n <= b,
  set: function(ctx, key, val) { // MUST dùng function
    ctx[key] = val;
  }
});

// Cấu hình Template Engine (Handlebars)
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: helpers // Sử dụng toàn bộ helper từ file handlebars.js
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Phục vụ tệp tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware xử lý request
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true khi deploy, false khi local
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Khởi tạo Passport
app.use(passport.initialize());
app.use(passport.session());
require('./middleware/auth').initializePassport(passport); // Sử dụng trực tiếp từ middleware/auth

// Middleware truyền user vào res.locals
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null; // nếu dùng session
  next();
});

// Định nghĩa Routers
const homeRouter = require('./routes/homeRouter');
const registerRouter = require('./routes/registerRouters');
const loginRouter = require('./routes/loginRouters');
const logoutRouter = require('./routes/logoutRouters');
const searchRouter = require('./routes/searchRouter/seachRouter');
const suggestRouter = require('./routes/searchRouter/suggestRouter');
const videoRouter = require('./routes/videoRouter/videoRouter');
const imageRouter = require('./routes/imageRouter');
const videoAdminRouter = require('./routes/videoAdminRouter');
const uploadYoutube = require('./routes/videoRouter/upLoadYoutubeRouter');
const thongke = require('./routes/ThongkeRouter/thongkeRouter');

// Sử dụng Routers
app.use(homeRouter);
app.use(registerRouter);
app.use(loginRouter);
app.use(logoutRouter);
app.use(searchRouter);
app.use(suggestRouter);
app.use(videoRouter);
app.use(imageRouter);
app.use('/', videoAdminRouter);
app.use(uploadYoutube);
app.use(thongke);

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});