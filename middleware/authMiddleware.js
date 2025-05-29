function isAuthenticated (req, res, next) {
  if (req.session && req.session.user) {
    // Người dùng đã đăng nhập
    next()
  } else {
    // Người dùng chưa đăng nhập, chuyển về trang đăng nhập
    res.redirect('/login')
  }
}

module.exports = isAuthenticated
