--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-07-12 23:09:11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 884 (class 1247 OID 19822)
-- Name: loaigiongdoc_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loaigiongdoc_enum AS ENUM (
    'nam',
    'nữ'
);


ALTER TYPE public.loaigiongdoc_enum OWNER TO postgres;

--
-- TOC entry 878 (class 1247 OID 19806)
-- Name: loaihieuung_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loaihieuung_enum AS ENUM (
    'am_nhac',
    'sticker',
    'bo_loc',
    'chu_dong'
);


ALTER TYPE public.loaihieuung_enum OWNER TO postgres;

--
-- TOC entry 881 (class 1247 OID 19816)
-- Name: loaihinhnen_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loaihinhnen_enum AS ENUM (
    'tinh',
    'dong'
);


ALTER TYPE public.loaihinhnen_enum OWNER TO postgres;

--
-- TOC entry 887 (class 1247 OID 19828)
-- Name: loailuutru_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loailuutru_enum AS ENUM (
    'nhap',
    'hoan_chinh'
);


ALTER TYPE public.loailuutru_enum OWNER TO postgres;

--
-- TOC entry 890 (class 1247 OID 19834)
-- Name: trangthai_luutru_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trangthai_luutru_enum AS ENUM (
    'cho_xu_ly',
    'thanh_cong',
    'that_bai'
);


ALTER TYPE public.trangthai_luutru_enum OWNER TO postgres;

--
-- TOC entry 875 (class 1247 OID 19799)
-- Name: trangthai_video; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trangthai_video AS ENUM (
    'nhap',
    'hoan_thanh',
    'da_xoa'
);


ALTER TYPE public.trangthai_video OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 19882)
-- Name: chude; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chude (
    id_tukhoa integer NOT NULL,
    tenchude character varying(255) NOT NULL,
    thoigiantao timestamp without time zone NOT NULL,
    id_chude integer NOT NULL
);


ALTER TABLE public.chude OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 19881)
-- Name: chude_id_chude_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chude_id_chude_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chude_id_chude_seq OWNER TO postgres;

--
-- TOC entry 5044 (class 0 OID 0)
-- Dependencies: 225
-- Name: chude_id_chude_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chude_id_chude_seq OWNED BY public.chude.id_chude;


--
-- TOC entry 234 (class 1259 OID 19910)
-- Name: giongdoc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.giongdoc (
    id_video integer,
    duongdan_giongdoc character varying(255) NOT NULL,
    loaigiongdoc public.loaigiongdoc_enum NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_giongdoc integer NOT NULL
);


ALTER TABLE public.giongdoc OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 19909)
-- Name: giongdoc_id_giongdoc_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.giongdoc_id_giongdoc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.giongdoc_id_giongdoc_seq OWNER TO postgres;

--
-- TOC entry 5045 (class 0 OID 0)
-- Dependencies: 233
-- Name: giongdoc_id_giongdoc_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.giongdoc_id_giongdoc_seq OWNED BY public.giongdoc.id_giongdoc;


--
-- TOC entry 228 (class 1259 OID 19889)
-- Name: hieuung; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hieuung (
    loaihieuung public.loaihieuung_enum NOT NULL,
    tenhieuung character varying(100) NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_video integer NOT NULL,
    id_hieuung integer NOT NULL
);


ALTER TABLE public.hieuung OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 19888)
-- Name: hieuung_id_hieuung_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hieuung_id_hieuung_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hieuung_id_hieuung_seq OWNER TO postgres;

--
-- TOC entry 5046 (class 0 OID 0)
-- Dependencies: 227
-- Name: hieuung_id_hieuung_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hieuung_id_hieuung_seq OWNED BY public.hieuung.id_hieuung;


--
-- TOC entry 232 (class 1259 OID 19903)
-- Name: hinhnen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hinhnen (
    id_video integer,
    duongdan_hinhnen character varying(255) NOT NULL,
    loaihinhnen public.loaihinhnen_enum NOT NULL,
    dophangiai character varying(50) NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_hinhnen integer NOT NULL
);


ALTER TABLE public.hinhnen OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 19902)
-- Name: hinhnen_id_hinhnen_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hinhnen_id_hinhnen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hinhnen_id_hinhnen_seq OWNER TO postgres;

--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 231
-- Name: hinhnen_id_hinhnen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hinhnen_id_hinhnen_seq OWNED BY public.hinhnen.id_hinhnen;


--
-- TOC entry 222 (class 1259 OID 19866)
-- Name: kichban; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kichban (
    id_video integer,
    noidung text NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_tukhoa integer,
    id_kichban integer NOT NULL
);


ALTER TABLE public.kichban OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 19865)
-- Name: kichban_id_kichban_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kichban_id_kichban_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kichban_id_kichban_seq OWNER TO postgres;

--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 221
-- Name: kichban_id_kichban_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kichban_id_kichban_seq OWNED BY public.kichban.id_kichban;


--
-- TOC entry 238 (class 1259 OID 19926)
-- Name: luutru; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.luutru (
    id_video integer,
    duongdanluutru character varying(255) NOT NULL,
    loailuutru public.loailuutru_enum NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    trangthai public.trangthai_luutru_enum NOT NULL,
    id_luutru integer NOT NULL
);


ALTER TABLE public.luutru OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 19925)
-- Name: luutru_id_luutru_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.luutru_id_luutru_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.luutru_id_luutru_seq OWNER TO postgres;

--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 237
-- Name: luutru_id_luutru_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.luutru_id_luutru_seq OWNED BY public.luutru.id_luutru;


--
-- TOC entry 218 (class 1259 OID 19842)
-- Name: nguoi_dung; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nguoi_dung (
    tennguoidung character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    matkhau character varying(255),
    google_id character varying(255),
    ngaytao timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    thoigiancapnhat timestamp without time zone,
    id_nguoidung integer NOT NULL,
    CONSTRAINT nguoi_dung_check CHECK (((matkhau IS NOT NULL) OR (google_id IS NOT NULL)))
);


ALTER TABLE public.nguoi_dung OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 19841)
-- Name: nguoi_dung_id_nguoidung_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nguoi_dung_id_nguoidung_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.nguoi_dung_id_nguoidung_seq OWNER TO postgres;

--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 217
-- Name: nguoi_dung_id_nguoidung_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nguoi_dung_id_nguoidung_seq OWNED BY public.nguoi_dung.id_nguoidung;


--
-- TOC entry 240 (class 1259 OID 19933)
-- Name: nhacnen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nhacnen (
    id_video integer,
    tennhacnen character varying(100) NOT NULL,
    thoiluong integer NOT NULL,
    loainhacnen character varying(100) NOT NULL,
    id_nhacnen integer NOT NULL
);


ALTER TABLE public.nhacnen OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 19932)
-- Name: nhacnen_id_nhacnen_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nhacnen_id_nhacnen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.nhacnen_id_nhacnen_seq OWNER TO postgres;

--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 239
-- Name: nhacnen_id_nhacnen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nhacnen_id_nhacnen_seq OWNED BY public.nhacnen.id_nhacnen;


--
-- TOC entry 236 (class 1259 OID 19917)
-- Name: phude; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phude (
    id_video integer,
    noidung text NOT NULL,
    thoigian_batdau integer NOT NULL,
    thoigian_ketthuc integer NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_phude integer NOT NULL
);


ALTER TABLE public.phude OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 19916)
-- Name: phude_id_phude_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.phude_id_phude_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.phude_id_phude_seq OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 235
-- Name: phude_id_phude_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.phude_id_phude_seq OWNED BY public.phude.id_phude;


--
-- TOC entry 224 (class 1259 OID 19875)
-- Name: tukhoa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tukhoa (
    id_nguoidung integer NOT NULL,
    tukhoa character varying(100) NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    hople boolean NOT NULL,
    id_tukhoa integer NOT NULL
);


ALTER TABLE public.tukhoa OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 19874)
-- Name: tukhoa_id_tukhoa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tukhoa_id_tukhoa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tukhoa_id_tukhoa_seq OWNER TO postgres;

--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 223
-- Name: tukhoa_id_tukhoa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tukhoa_id_tukhoa_seq OWNED BY public.tukhoa.id_tukhoa;


--
-- TOC entry 220 (class 1259 OID 19859)
-- Name: video; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video (
    id_nguoidung integer NOT NULL,
    tieude character varying(255) NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    trangthai public.trangthai_video NOT NULL,
    thoiluong integer NOT NULL,
    giongai integer NOT NULL,
    kichban integer NOT NULL,
    hinhnen integer NOT NULL,
    hieuung integer NOT NULL,
    id_video integer NOT NULL
);


ALTER TABLE public.video OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 19896)
-- Name: video_hieuung; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_hieuung (
    id_video integer NOT NULL,
    id_hieuung integer NOT NULL,
    thoigianbatdau timestamp without time zone NOT NULL,
    ngaytao timestamp without time zone NOT NULL,
    id_video_hieuung integer NOT NULL
);


ALTER TABLE public.video_hieuung OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 19895)
-- Name: video_hieuung_id_video_hieuung_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_hieuung_id_video_hieuung_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_hieuung_id_video_hieuung_seq OWNER TO postgres;

--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 229
-- Name: video_hieuung_id_video_hieuung_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_hieuung_id_video_hieuung_seq OWNED BY public.video_hieuung.id_video_hieuung;


--
-- TOC entry 219 (class 1259 OID 19858)
-- Name: video_id_video_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_id_video_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_id_video_seq OWNER TO postgres;

--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 219
-- Name: video_id_video_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_id_video_seq OWNED BY public.video.id_video;


--
-- TOC entry 246 (class 1259 OID 20092)
-- Name: video_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_likes (
    id integer NOT NULL,
    video_id integer NOT NULL,
    user_id integer NOT NULL,
    liked_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.video_likes OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 20091)
-- Name: video_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_likes_id_seq OWNER TO postgres;

--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 245
-- Name: video_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_likes_id_seq OWNED BY public.video_likes.id;


--
-- TOC entry 244 (class 1259 OID 20072)
-- Name: video_statistics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_statistics (
    id integer NOT NULL,
    video_id integer NOT NULL,
    user_id integer NOT NULL,
    watched_at timestamp without time zone DEFAULT now(),
    duration_watched integer,
    is_completed boolean DEFAULT false,
    CONSTRAINT video_statistics_duration_watched_check CHECK ((duration_watched >= 0))
);


ALTER TABLE public.video_statistics OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 20071)
-- Name: video_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_statistics_id_seq OWNER TO postgres;

--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 243
-- Name: video_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_statistics_id_seq OWNED BY public.video_statistics.id;


--
-- TOC entry 242 (class 1259 OID 20005)
-- Name: videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.videos (
    id integer NOT NULL,
    filename text NOT NULL,
    firebase_key text NOT NULL,
    public_url text NOT NULL,
    size_mb numeric(10,2),
    title text,
    script text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    id_nguoidung integer NOT NULL,
    youtube_id character varying(255)
);


ALTER TABLE public.videos OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 20004)
-- Name: videos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.videos_id_seq OWNER TO postgres;

--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 241
-- Name: videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.videos_id_seq OWNED BY public.videos.id;


--
-- TOC entry 4788 (class 2604 OID 19885)
-- Name: chude id_chude; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chude ALTER COLUMN id_chude SET DEFAULT nextval('public.chude_id_chude_seq'::regclass);


--
-- TOC entry 4792 (class 2604 OID 19913)
-- Name: giongdoc id_giongdoc; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giongdoc ALTER COLUMN id_giongdoc SET DEFAULT nextval('public.giongdoc_id_giongdoc_seq'::regclass);


--
-- TOC entry 4789 (class 2604 OID 19892)
-- Name: hieuung id_hieuung; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hieuung ALTER COLUMN id_hieuung SET DEFAULT nextval('public.hieuung_id_hieuung_seq'::regclass);


--
-- TOC entry 4791 (class 2604 OID 19906)
-- Name: hinhnen id_hinhnen; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hinhnen ALTER COLUMN id_hinhnen SET DEFAULT nextval('public.hinhnen_id_hinhnen_seq'::regclass);


--
-- TOC entry 4786 (class 2604 OID 19869)
-- Name: kichban id_kichban; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kichban ALTER COLUMN id_kichban SET DEFAULT nextval('public.kichban_id_kichban_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 19929)
-- Name: luutru id_luutru; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.luutru ALTER COLUMN id_luutru SET DEFAULT nextval('public.luutru_id_luutru_seq'::regclass);


--
-- TOC entry 4784 (class 2604 OID 19846)
-- Name: nguoi_dung id_nguoidung; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nguoi_dung ALTER COLUMN id_nguoidung SET DEFAULT nextval('public.nguoi_dung_id_nguoidung_seq'::regclass);


--
-- TOC entry 4795 (class 2604 OID 19936)
-- Name: nhacnen id_nhacnen; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nhacnen ALTER COLUMN id_nhacnen SET DEFAULT nextval('public.nhacnen_id_nhacnen_seq'::regclass);


--
-- TOC entry 4793 (class 2604 OID 19920)
-- Name: phude id_phude; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phude ALTER COLUMN id_phude SET DEFAULT nextval('public.phude_id_phude_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 19878)
-- Name: tukhoa id_tukhoa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tukhoa ALTER COLUMN id_tukhoa SET DEFAULT nextval('public.tukhoa_id_tukhoa_seq'::regclass);


--
-- TOC entry 4785 (class 2604 OID 19862)
-- Name: video id_video; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video ALTER COLUMN id_video SET DEFAULT nextval('public.video_id_video_seq'::regclass);


--
-- TOC entry 4790 (class 2604 OID 19899)
-- Name: video_hieuung id_video_hieuung; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_hieuung ALTER COLUMN id_video_hieuung SET DEFAULT nextval('public.video_hieuung_id_video_hieuung_seq'::regclass);


--
-- TOC entry 4802 (class 2604 OID 20095)
-- Name: video_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_likes ALTER COLUMN id SET DEFAULT nextval('public.video_likes_id_seq'::regclass);


--
-- TOC entry 4799 (class 2604 OID 20075)
-- Name: video_statistics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_statistics ALTER COLUMN id SET DEFAULT nextval('public.video_statistics_id_seq'::regclass);


--
-- TOC entry 4796 (class 2604 OID 20008)
-- Name: videos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos ALTER COLUMN id SET DEFAULT nextval('public.videos_id_seq'::regclass);


--
-- TOC entry 5018 (class 0 OID 19882)
-- Dependencies: 226
-- Data for Name: chude; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chude (id_tukhoa, tenchude, thoigiantao, id_chude) FROM stdin;
\.


--
-- TOC entry 5026 (class 0 OID 19910)
-- Dependencies: 234
-- Data for Name: giongdoc; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.giongdoc (id_video, duongdan_giongdoc, loaigiongdoc, ngaytao, id_giongdoc) FROM stdin;
\.


--
-- TOC entry 5020 (class 0 OID 19889)
-- Dependencies: 228
-- Data for Name: hieuung; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hieuung (loaihieuung, tenhieuung, ngaytao, id_video, id_hieuung) FROM stdin;
\.


--
-- TOC entry 5024 (class 0 OID 19903)
-- Dependencies: 232
-- Data for Name: hinhnen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hinhnen (id_video, duongdan_hinhnen, loaihinhnen, dophangiai, ngaytao, id_hinhnen) FROM stdin;
\.


--
-- TOC entry 5014 (class 0 OID 19866)
-- Dependencies: 222
-- Data for Name: kichban; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kichban (id_video, noidung, ngaytao, id_tukhoa, id_kichban) FROM stdin;
\.


--
-- TOC entry 5030 (class 0 OID 19926)
-- Dependencies: 238
-- Data for Name: luutru; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.luutru (id_video, duongdanluutru, loailuutru, ngaytao, trangthai, id_luutru) FROM stdin;
\.


--
-- TOC entry 5010 (class 0 OID 19842)
-- Dependencies: 218
-- Data for Name: nguoi_dung; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nguoi_dung (tennguoidung, email, matkhau, google_id, ngaytao, thoigiancapnhat, id_nguoidung) FROM stdin;
p	b@gmail.com	$2b$10$F0qNlLwnZm7byDxcunOfhekqXAfCI1.FJRwGgooYZXWdnv.3AFuES	\N	2025-05-30 10:53:14.295715	\N	1
Phước Nguyễn	kaiphuocnguyen1906@gmail.com	\N	116885384796658686478	2025-05-30 11:10:27.429233	\N	2
Trần Bảo 	tranbao2025@gmail.com	$2b$10$ZU3Ou/fDxKeQwxFJVux6Dur7/Q7q2gwYUoWPnV3AwbsEXqzgxNnQy	\N	2025-07-10 23:46:48.504204	\N	3
minh đặng	minhdang@gmail.com	$2b$10$2zDDkcMFUVAMgVfKX5kRDOjCLd7C4UyQIEx56xXjrACgaeprEM/KS	\N	2025-07-11 10:58:00.73292	\N	4
\.


--
-- TOC entry 5032 (class 0 OID 19933)
-- Dependencies: 240
-- Data for Name: nhacnen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nhacnen (id_video, tennhacnen, thoiluong, loainhacnen, id_nhacnen) FROM stdin;
\.


--
-- TOC entry 5028 (class 0 OID 19917)
-- Dependencies: 236
-- Data for Name: phude; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.phude (id_video, noidung, thoigian_batdau, thoigian_ketthuc, ngaytao, id_phude) FROM stdin;
\.


--
-- TOC entry 5016 (class 0 OID 19875)
-- Dependencies: 224
-- Data for Name: tukhoa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tukhoa (id_nguoidung, tukhoa, ngaytao, hople, id_tukhoa) FROM stdin;
\.


--
-- TOC entry 5012 (class 0 OID 19859)
-- Dependencies: 220
-- Data for Name: video; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video (id_nguoidung, tieude, ngaytao, trangthai, thoiluong, giongai, kichban, hinhnen, hieuung, id_video) FROM stdin;
\.


--
-- TOC entry 5022 (class 0 OID 19896)
-- Dependencies: 230
-- Data for Name: video_hieuung; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video_hieuung (id_video, id_hieuung, thoigianbatdau, ngaytao, id_video_hieuung) FROM stdin;
\.


--
-- TOC entry 5038 (class 0 OID 20092)
-- Dependencies: 246
-- Data for Name: video_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video_likes (id, video_id, user_id, liked_at) FROM stdin;
\.


--
-- TOC entry 5036 (class 0 OID 20072)
-- Dependencies: 244
-- Data for Name: video_statistics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video_statistics (id, video_id, user_id, watched_at, duration_watched, is_completed) FROM stdin;
\.


--
-- TOC entry 5034 (class 0 OID 20005)
-- Dependencies: 242
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.videos (id, filename, firebase_key, public_url, size_mb, title, script, created_at, updated_at, id_nguoidung, youtube_id) FROM stdin;
1	edited_video_1752082706887.mp4	videos/edited_video_1752082706887.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752082706887.mp4	2.42	Video không tiêu đề	\N	2025-07-10 00:38:50.970042	2025-07-10 00:38:50.970042	2	E50Ci6yNIds
2	edited_video_1752083787009.mp4	videos/edited_video_1752083787009.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752083787009.mp4	2.08	Video không tiêu đề	\N	2025-07-10 00:56:48.600779	2025-07-10 00:56:48.600779	2	e5oxcBvoayk
4	edited_video_1752114324687.mp4	videos/edited_video_1752114324687.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752114324687.mp4	2.03	Video không tiêu đề	\N	2025-07-10 09:25:45.362727	2025-07-10 09:25:45.362727	2	\N
5	edited_video_1752130327442.mp4	videos/edited_video_1752130327442.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752130327442.mp4	2.82	Video không tiêu đề	\N	2025-07-10 13:52:40.701878	2025-07-10 13:52:40.701878	2	\N
6	edited_video_1752153657255.mp4	videos/edited_video_1752153657255.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752153657255.mp4	2.79	Video không tiêu đề	\N	2025-07-10 20:21:22.175841	2025-07-10 20:21:22.175841	2	\N
7	edited_video_1752155102755.mp4	videos/edited_video_1752155102755.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752155102755.mp4	2.63	Video không tiêu đề	\N	2025-07-10 20:45:26.756021	2025-07-10 20:45:26.756021	2	\N
8	edited_video_1752205217362.mp4	videos/edited_video_1752205217362.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752205217362.mp4	1.35	Video không tiêu đề	\N	2025-07-11 10:40:30.274223	2025-07-11 10:40:30.274223	2	\N
9	edited_video_1752307380268.mp4	videos/edited_video_1752307380268.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752307380268.mp4	3.71	Video không tiêu đề	\N	2025-07-12 15:03:23.488	2025-07-12 15:03:23.488	2	\N
10	edited_video_1752309055097.mp4	videos/edited_video_1752309055097.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752309055097.mp4	4.25	Video không tiêu đề	\N	2025-07-12 15:31:18.63788	2025-07-12 15:31:18.63788	2	\N
11	edited_video_1752319674828.mp4	videos/edited_video_1752319674828.mp4	https://storage.googleapis.com/doanktpmnew.firebasestorage.app/videos/edited_video_1752319674828.mp4	5.13	CABYBARA ĂN TRỘM ĐỒ ĂN MÈO XÁM BỊ BẮT GẶP VÀ CUỘC RƯỢT ĐUỔI KỊCH TÍNH	\N	2025-07-12 18:29:00.061981	2025-07-12 18:29:00.061981	2	lq18da96Rco
\.


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 225
-- Name: chude_id_chude_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chude_id_chude_seq', 1, false);


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 233
-- Name: giongdoc_id_giongdoc_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.giongdoc_id_giongdoc_seq', 1, false);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 227
-- Name: hieuung_id_hieuung_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hieuung_id_hieuung_seq', 1, false);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 231
-- Name: hinhnen_id_hinhnen_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hinhnen_id_hinhnen_seq', 1, false);


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 221
-- Name: kichban_id_kichban_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kichban_id_kichban_seq', 1, false);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 237
-- Name: luutru_id_luutru_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.luutru_id_luutru_seq', 1, false);


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 217
-- Name: nguoi_dung_id_nguoidung_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nguoi_dung_id_nguoidung_seq', 4, true);


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 239
-- Name: nhacnen_id_nhacnen_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nhacnen_id_nhacnen_seq', 1, false);


--
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 235
-- Name: phude_id_phude_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phude_id_phude_seq', 1, false);


--
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 223
-- Name: tukhoa_id_tukhoa_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tukhoa_id_tukhoa_seq', 1, false);


--
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 229
-- Name: video_hieuung_id_video_hieuung_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.video_hieuung_id_video_hieuung_seq', 1, false);


--
-- TOC entry 5070 (class 0 OID 0)
-- Dependencies: 219
-- Name: video_id_video_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.video_id_video_seq', 1, false);


--
-- TOC entry 5071 (class 0 OID 0)
-- Dependencies: 245
-- Name: video_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.video_likes_id_seq', 1, false);


--
-- TOC entry 5072 (class 0 OID 0)
-- Dependencies: 243
-- Name: video_statistics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.video_statistics_id_seq', 1, false);


--
-- TOC entry 5073 (class 0 OID 0)
-- Dependencies: 241
-- Name: videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.videos_id_seq', 11, true);


--
-- TOC entry 4821 (class 2606 OID 19887)
-- Name: chude chude_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chude
    ADD CONSTRAINT chude_pkey PRIMARY KEY (id_chude);


--
-- TOC entry 4829 (class 2606 OID 19915)
-- Name: giongdoc giongdoc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giongdoc
    ADD CONSTRAINT giongdoc_pkey PRIMARY KEY (id_giongdoc);


--
-- TOC entry 4823 (class 2606 OID 19894)
-- Name: hieuung hieuung_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hieuung
    ADD CONSTRAINT hieuung_pkey PRIMARY KEY (id_hieuung);


--
-- TOC entry 4827 (class 2606 OID 19908)
-- Name: hinhnen hinhnen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hinhnen
    ADD CONSTRAINT hinhnen_pkey PRIMARY KEY (id_hinhnen);


--
-- TOC entry 4817 (class 2606 OID 19873)
-- Name: kichban kichban_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kichban
    ADD CONSTRAINT kichban_pkey PRIMARY KEY (id_kichban);


--
-- TOC entry 4833 (class 2606 OID 19931)
-- Name: luutru luutru_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.luutru
    ADD CONSTRAINT luutru_pkey PRIMARY KEY (id_luutru);


--
-- TOC entry 4807 (class 2606 OID 19855)
-- Name: nguoi_dung nguoi_dung_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_email_key UNIQUE (email);


--
-- TOC entry 4809 (class 2606 OID 19857)
-- Name: nguoi_dung nguoi_dung_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_google_id_key UNIQUE (google_id);


--
-- TOC entry 4811 (class 2606 OID 19851)
-- Name: nguoi_dung nguoi_dung_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_pkey PRIMARY KEY (id_nguoidung);


--
-- TOC entry 4813 (class 2606 OID 19853)
-- Name: nguoi_dung nguoi_dung_tennguoidung_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_tennguoidung_key UNIQUE (tennguoidung);


--
-- TOC entry 4835 (class 2606 OID 19938)
-- Name: nhacnen nhacnen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nhacnen
    ADD CONSTRAINT nhacnen_pkey PRIMARY KEY (id_nhacnen);


--
-- TOC entry 4831 (class 2606 OID 19924)
-- Name: phude phude_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phude
    ADD CONSTRAINT phude_pkey PRIMARY KEY (id_phude);


--
-- TOC entry 4819 (class 2606 OID 19880)
-- Name: tukhoa tukhoa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tukhoa
    ADD CONSTRAINT tukhoa_pkey PRIMARY KEY (id_tukhoa);


--
-- TOC entry 4825 (class 2606 OID 19901)
-- Name: video_hieuung video_hieuung_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_hieuung
    ADD CONSTRAINT video_hieuung_pkey PRIMARY KEY (id_video_hieuung);


--
-- TOC entry 4843 (class 2606 OID 20098)
-- Name: video_likes video_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_pkey PRIMARY KEY (id);


--
-- TOC entry 4845 (class 2606 OID 20100)
-- Name: video_likes video_likes_video_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_video_id_user_id_key UNIQUE (video_id, user_id);


--
-- TOC entry 4815 (class 2606 OID 19864)
-- Name: video video_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video
    ADD CONSTRAINT video_pkey PRIMARY KEY (id_video);


--
-- TOC entry 4841 (class 2606 OID 20080)
-- Name: video_statistics video_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_statistics
    ADD CONSTRAINT video_statistics_pkey PRIMARY KEY (id);


--
-- TOC entry 4837 (class 2606 OID 20016)
-- Name: videos videos_firebase_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_firebase_key_key UNIQUE (firebase_key);


--
-- TOC entry 4839 (class 2606 OID 20014)
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- TOC entry 4850 (class 2606 OID 19959)
-- Name: chude chude_id_tukhoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chude
    ADD CONSTRAINT chude_id_tukhoa_fkey FOREIGN KEY (id_tukhoa) REFERENCES public.tukhoa(id_tukhoa);


--
-- TOC entry 4859 (class 2606 OID 20066)
-- Name: videos fk_videos_nguoidung; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT fk_videos_nguoidung FOREIGN KEY (id_nguoidung) REFERENCES public.nguoi_dung(id_nguoidung) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4855 (class 2606 OID 19984)
-- Name: giongdoc giongdoc_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giongdoc
    ADD CONSTRAINT giongdoc_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4851 (class 2606 OID 19964)
-- Name: hieuung hieuung_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hieuung
    ADD CONSTRAINT hieuung_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4854 (class 2606 OID 19979)
-- Name: hinhnen hinhnen_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hinhnen
    ADD CONSTRAINT hinhnen_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4847 (class 2606 OID 19949)
-- Name: kichban kichban_id_tukhoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kichban
    ADD CONSTRAINT kichban_id_tukhoa_fkey FOREIGN KEY (id_tukhoa) REFERENCES public.tukhoa(id_tukhoa);


--
-- TOC entry 4848 (class 2606 OID 19944)
-- Name: kichban kichban_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kichban
    ADD CONSTRAINT kichban_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4857 (class 2606 OID 19994)
-- Name: luutru luutru_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.luutru
    ADD CONSTRAINT luutru_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4858 (class 2606 OID 19999)
-- Name: nhacnen nhacnen_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nhacnen
    ADD CONSTRAINT nhacnen_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4856 (class 2606 OID 19989)
-- Name: phude phude_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phude
    ADD CONSTRAINT phude_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4849 (class 2606 OID 19954)
-- Name: tukhoa tukhoa_id_nguoidung_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tukhoa
    ADD CONSTRAINT tukhoa_id_nguoidung_fkey FOREIGN KEY (id_nguoidung) REFERENCES public.nguoi_dung(id_nguoidung);


--
-- TOC entry 4852 (class 2606 OID 19974)
-- Name: video_hieuung video_hieuung_id_hieuung_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_hieuung
    ADD CONSTRAINT video_hieuung_id_hieuung_fkey FOREIGN KEY (id_hieuung) REFERENCES public.hieuung(id_hieuung);


--
-- TOC entry 4853 (class 2606 OID 19969)
-- Name: video_hieuung video_hieuung_id_video_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_hieuung
    ADD CONSTRAINT video_hieuung_id_video_fkey FOREIGN KEY (id_video) REFERENCES public.video(id_video);


--
-- TOC entry 4846 (class 2606 OID 19939)
-- Name: video video_id_nguoidung_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video
    ADD CONSTRAINT video_id_nguoidung_fkey FOREIGN KEY (id_nguoidung) REFERENCES public.nguoi_dung(id_nguoidung);


--
-- TOC entry 4862 (class 2606 OID 20106)
-- Name: video_likes video_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nguoi_dung(id_nguoidung) ON DELETE CASCADE;


--
-- TOC entry 4863 (class 2606 OID 20101)
-- Name: video_likes video_likes_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- TOC entry 4860 (class 2606 OID 20086)
-- Name: video_statistics video_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_statistics
    ADD CONSTRAINT video_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nguoi_dung(id_nguoidung) ON DELETE CASCADE;


--
-- TOC entry 4861 (class 2606 OID 20081)
-- Name: video_statistics video_statistics_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_statistics
    ADD CONSTRAINT video_statistics_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


-- Completed on 2025-07-12 23:09:11

--
-- PostgreSQL database dump complete
--

