const path = require('path')
const express = require('express')
const { engine } = require('express-handlebars')
const passport = require('passport')
const session = require('express-session')
const flash = require('connect-flash')
const googleAuthRouter = require('./routes/googleAuthRouter')

require('dotenv').config(); // Load biến môi trường từ file .env

const { initializePassport } = require('./middleware/auth'); // Cấu hình Passport với chiến lược tự xây dựng

const port = 3000
const app = express()

// Phục vụ tệp tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')))

// Middleware xử lý request
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(flash())
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

}))

// Khởi tạo Passport
app.use(passport.initialize())
app.use(passport.session())
initializePassport(passport)

// Cấu hình Template Engine (Handlebars)
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: {
    eq: (a, b) => a === b
  }
}))

app.use((req, res, next) => {
    res.locals.user = req.session?.user || null; // nếu dùng session
    next();
});


app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, 'views'))

// Định nghĩa Routers
const homeRouter = require('./routes/homeRouter')
const registerRouter = require('./routes/registerRouters')
const loginRouter = require('./routes/loginRouters')
const logoutRouter = require('./routes/logoutRouters')
const searchRouter = require('./routes/searchRouter/seachRouter')
const suggestRouter = require('./routes/searchRouter/suggestRouter')
const videoRouter = require('./routes/videoRouter/videoRouter')
const imageRouter = require('./routes/imageRouter')

// Sử dụng Routers
app.use(homeRouter)
app.use(registerRouter)
app.use(loginRouter)
app.use(logoutRouter)
app.use('/', googleAuthRouter)
app.use(searchRouter)
app.use(suggestRouter)
app.use(videoRouter)
app.use(imageRouter)

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`)
})