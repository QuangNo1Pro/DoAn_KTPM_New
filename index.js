const path = require('path')
const express = require('express')
const { engine } = require('express-handlebars')
const passport = require('passport')
const session = require('express-session')
const flash = require('connect-flash')

require('dotenv').config(); // Load biến môi trường từ file .env

const { initializePassport } = require('./middleware/auth'); // Cấu hình Passport với chiến lược tự xây dựng

const port = 3000
const app = express()

// Middleware xử lý request
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true, // Đảm bảo dùng HTTPS
    httpOnly: true,
    sameSite: 'lax', // Cookie chỉ gửi khi điều hướng từ cùng domain
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
  }
}))

// Khởi tạo Passport
app.use(passport.initialize())
app.use(passport.session())
initializePassport(passport)

// Cấu hình Template Engine (Handlebars)
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts')
}))

app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, 'views'))

// Định nghĩa Routers
const homeRouter = require('./routes/homeRouter')
const registerRouter = require('./routes/registerRouters')
const loginRouter = require('./routes/loginRouters')
const logoutRouter = require('./routes/logoutRouters')
// Sử dụng Routers
app.use(homeRouter)
app.use(registerRouter)
app.use(loginRouter)
app.use(logoutRouter)

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`)
})
