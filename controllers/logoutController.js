// const { db}=require('../models/connectDatabase')
const logout = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Người dùng chưa đăng nhập
    return res.redirect('/login?message=Bạn chưa login')
  }
  req.logout((err) => {
    if (err) {
      return next(err); // Xử lý lỗi nếu logout thất bại
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err); // Xử lý lỗi nếu hủy session thất bại
      }
      // Thành công, chuyển hướng về trang chủ với thông báo
      return res.redirect('/?message=Bạn đã logout thành công')
    })
  })
}

module.exports = {
logout}
