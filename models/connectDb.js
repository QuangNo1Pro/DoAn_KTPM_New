require('dotenv').config();
const pgp = require('pg-promise')({ capSQL: true });

const dbConfig = {
    user: 'postgres',
    password: '123456789',
    host: 'localhost',
    port: 5432,
    database: 'AI Video',
};
const db = pgp(dbConfig);
// Lấy tất cả người dùng
const all = async () => {
    try {
        const data = await db.query(`SELECT * FROM "nguoi_dung"`);
        return data;
    } catch (e) {
        throw e;
    }
};

// Kiểm tra tài khoản theo email
const checkAccountExists = async (email) => {
    try {
        const result = await db.oneOrNone('SELECT * FROM "nguoi_dung" WHERE "email" = $1', [email]);
        return !!result;
    } catch (e) {
        throw e;
    }
};

// Lấy người dùng theo email
const getUserByEmail = async (email) => {
    const res = await db.query('SELECT * FROM "nguoi_dung" WHERE "email" = $1', [email]);
    return res[0];
};

// Lấy người dùng theo ID
const getUserById = async (id) => {
    const res = await db.query('SELECT * FROM "nguoi_dung" WHERE "id_nguoidung" = $1', [id]);
    return res[0];
};

// Thêm người dùng mới (thường)
const addUser = async (tennguoidung, email, matkhau) => {
    try {
        await db.none(
            'INSERT INTO "nguoi_dung" ("tennguoidung", "email", "matkhau") VALUES ($1, $2, $3)',
            [tennguoidung, email, matkhau]
        );
        console.log('Thêm tài khoản thành công!');
    } catch (e) {
        throw e;
    }
};

// Kiểm tra đăng nhập
const checkLogin = async (email, matkhau) => {
    if (!email || !matkhau) {
        throw new Error("Email hoặc mật khẩu bị thiếu");
    }
    try {
        const user = await db.oneOrNone(
            'SELECT * FROM "nguoi_dung" WHERE "email" = $1 AND "matkhau" = $2',
            [email, matkhau]
        );
        return user;
    } catch (e) {
        throw e;
    }
};

// Đăng nhập bằng Google - tìm theo google_id
const getUserByGoogleId = async (googleId) => {
    try {
        const res = await db.query('SELECT * FROM "nguoi_dung" WHERE "google_id" = $1', [googleId]);
        return res[0];
    } catch (e) {
        throw e;
    }
};

// Tạo người dùng mới qua Google
const createGoogleUser = async (googleId, tennguoidung, email) => {
    try {
        const existingUser = await db.oneOrNone('SELECT * FROM "nguoi_dung" WHERE "email" = $1', [email]);
        if (existingUser) {
            console.log('Email đã tồn tại, không tạo mới.');
            return existingUser;
        }

        const result = await db.one(
            'INSERT INTO "nguoi_dung" ("google_id", "tennguoidung", "email") VALUES ($1, $2, $3) RETURNING *',
            [googleId, tennguoidung, email]
        );
        return result;
    } catch (e) {
        throw e;
    }
};
module.exports = {
    all,
    checkAccountExists,
    getUserByEmail,
    getUserById,
    addUser,
    checkLogin,
    getUserByGoogleId,
    createGoogleUser
};

