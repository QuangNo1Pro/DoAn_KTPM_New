const { checkAccountExists, addUser } = require('../models/connectDb');
const bcrypt = require('bcrypt');

// === Đăng ký người dùng mới ===
const register = async (req, res) => {
  const { tennguoidung, email, matkhau } = req.body;

  try {
    const userExists = await checkAccountExists(email);
    if (userExists) {
      return res.redirect('/register?message=' + encodeURIComponent('Email đã tồn tại, vui lòng nhập email mới!'));
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(matkhau, 10);

    // Thêm người dùng mới
    await addUser(tennguoidung, email, hashedPassword); // (tennguoidung, email, matkhau)

    return res.redirect('/login');
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    return res.redirect('/register?message=' + encodeURIComponent('Đã xảy ra lỗi, vui lòng thử lại.'));
  }
};

// === Kiểm tra email đã tồn tại chưa (AJAX) ===
const check_email = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await checkAccountExists(email);
    if (user) {
      return res.status(200).json({ exists: true, message: "Email đã tồn tại!" });
    }
    return res.status(200).json({ exists: false, message: "Email hợp lệ." });
  } catch (error) {
    console.error("Lỗi khi kiểm tra email:", error);
    return res.status(500).json({ exists: false, message: "Có lỗi xảy ra, vui lòng thử lại." });
  }
};

module.exports = { register, check_email };
