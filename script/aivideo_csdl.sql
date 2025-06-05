-- ENUM cho trạng thái video
CREATE TYPE trangthai_video AS ENUM ('nhap', 'hoan_thanh', 'da_xoa');

-- ENUM cho loại hiệu ứng
CREATE TYPE loaihieuung_enum AS ENUM ('am_nhac', 'sticker', 'bo_loc', 'chu_dong');

-- ENUM cho loại hình nền
CREATE TYPE loaihinhnen_enum AS ENUM ('tinh', 'dong');

-- ENUM cho loại giọng đọc
CREATE TYPE loaigiongdoc_enum AS ENUM ('nam', 'nữ');

-- ENUM cho loại lưu trữ
CREATE TYPE loailuutru_enum AS ENUM ('nhap', 'hoan_chinh');

-- ENUM cho trạng thái lưu trữ
CREATE TYPE trangthai_luutru_enum AS ENUM ('cho_xu_ly', 'thanh_cong', 'that_bai');

CREATE TABLE nguoi_dung (
    tennguoidung VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    matkhau VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    ngaytao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoigiancapnhat TIMESTAMP,
    CHECK (matkhau IS NOT NULL OR google_id IS NOT NULL),
    id_nguoidung SERIAL PRIMARY KEY
);

CREATE TABLE video (
    id_nguoidung INT NOT NULL,
    tieude VARCHAR(255) NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    trangthai trangthai_video NOT NULL,
    thoiluong INT NOT NULL,
    giongAI INT NOT NULL,
    kichban INT NOT NULL,
    hinhnen INT NOT NULL,
    hieuung INT NOT NULL,
    id_video SERIAL PRIMARY KEY
);

CREATE TABLE kichban (
    id_video INT,
    noidung TEXT NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_tukhoa INT,
    id_kichban SERIAL PRIMARY KEY
);

CREATE TABLE tukhoa (
    id_nguoidung INT NOT NULL,
    tukhoa VARCHAR(100) NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    hople BOOLEAN NOT NULL,
    id_tukhoa SERIAL PRIMARY KEY
);

CREATE TABLE chude (
    id_tukhoa INT NOT NULL,
    tenchude VARCHAR(255) NOT NULL,
    thoigiantao TIMESTAMP NOT NULL,
    id_chude SERIAL PRIMARY KEY
);

CREATE TABLE hieuung (
    loaihieuung loaihieuung_enum NOT NULL,
    tenhieuung VARCHAR(100) NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_video INT NOT NULL,
    id_hieuung SERIAL PRIMARY KEY
);

CREATE TABLE video_hieuung (
    id_video INT NOT NULL,
    id_hieuung INT NOT NULL,
    thoigianbatdau TIMESTAMP NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_video_hieuung SERIAL PRIMARY KEY
);

CREATE TABLE hinhnen (
    id_video INT,
    duongdan_hinhnen VARCHAR(255) NOT NULL,
    loaihinhnen loaihinhnen_enum NOT NULL,
    dophangiai VARCHAR(50) NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_hinhnen SERIAL PRIMARY KEY
);

CREATE TABLE giongdoc (
    id_video INT,
    duongdan_giongdoc VARCHAR(255) NOT NULL,
    loaigiongdoc loaigiongdoc_enum NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_giongdoc SERIAL PRIMARY KEY
);

CREATE TABLE phude (
    id_video INT,
    noidung TEXT NOT NULL,
    thoigian_batdau INT NOT NULL,
    thoigian_ketthuc INT NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    id_phude SERIAL PRIMARY KEY
);

CREATE TABLE luutru (
    id_video INT,
    duongdanluutru VARCHAR(255) NOT NULL,
    loailuutru loailuutru_enum NOT NULL,
    ngaytao TIMESTAMP NOT NULL,
    trangthai trangthai_luutru_enum NOT NULL,
    id_luutru SERIAL PRIMARY KEY
);

CREATE TABLE nhacnen (
    id_video INT,
    tennhacnen VARCHAR(100) NOT NULL,
    thoiluong INT NOT NULL,
    loainhacnen VARCHAR(100) NOT NULL,
    id_nhacnen SERIAL PRIMARY KEY
);
-- video
ALTER TABLE video ADD FOREIGN KEY (id_nguoidung) REFERENCES nguoi_dung(id_nguoidung);

-- kichban
ALTER TABLE kichban ADD FOREIGN KEY (id_video) REFERENCES video(id_video);
ALTER TABLE kichban ADD FOREIGN KEY (id_tukhoa) REFERENCES tukhoa(id_tukhoa);

-- tukhoa
ALTER TABLE tukhoa ADD FOREIGN KEY (id_nguoidung) REFERENCES nguoi_dung(id_nguoidung);

-- chude
ALTER TABLE chude ADD FOREIGN KEY (id_tukhoa) REFERENCES tukhoa(id_tukhoa);

-- hieuung
ALTER TABLE hieuung ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

-- video_hieuung
ALTER TABLE video_hieuung ADD FOREIGN KEY (id_video) REFERENCES video(id_video);
ALTER TABLE video_hieuung ADD FOREIGN KEY (id_hieuung) REFERENCES hieuung(id_hieuung);

-- hinhnen
ALTER TABLE hinhnen ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

-- giongdoc
ALTER TABLE giongdoc ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

-- phude
ALTER TABLE phude ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

-- luutru
ALTER TABLE luutru ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

-- nhacnen
ALTER TABLE nhacnen ADD FOREIGN KEY (id_video) REFERENCES video(id_video);

