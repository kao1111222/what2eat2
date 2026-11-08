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

DROP DATABASE what_to_eat;

CREATE DATABASE what_to_eat WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Thai_Thailand.1252';

ALTER DATABASE what_to_eat OWNER TO postgres;

\unrestrict (null)
\connect what_to_eat
\restrict (null)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    slug character varying(100) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    image_url character varying(500) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.categories OWNER TO postgres;

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;

CREATE TABLE public.comments (
    id integer NOT NULL,
    review_id integer NOT NULL,
    user_id integer NOT NULL,
    comment_text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.comments OWNER TO postgres;

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;

CREATE TABLE public.contact_messages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(190) NOT NULL,
    subject character varying(180) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contact_messages_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'read'::character varying, 'replied'::character varying, 'closed'::character varying])::text[])))
);

ALTER TABLE public.contact_messages OWNER TO postgres;

CREATE SEQUENCE public.contact_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.contact_messages_id_seq OWNER TO postgres;

ALTER SEQUENCE public.contact_messages_id_seq OWNED BY public.contact_messages.id;

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.contacts OWNER TO postgres;

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    review_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.favorites OWNER TO postgres;

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.favorites_id_seq OWNER TO postgres;

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;

CREATE TABLE public.restaurants (
    id integer NOT NULL,
    name character varying(180) NOT NULL,
    address character varying(500) DEFAULT NULL::character varying,
    district character varying(120) DEFAULT NULL::character varying,
    province character varying(120) DEFAULT NULL::character varying,
    phone character varying(30) DEFAULT NULL::character varying,
    price_level character varying(20) DEFAULT 'ปานกลาง'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT restaurants_price_level_check CHECK (((price_level)::text = ANY ((ARRAY['ประหยัด'::character varying, 'ปานกลาง'::character varying, 'พรีเมียม'::character varying])::text[])))
);

ALTER TABLE public.restaurants OWNER TO postgres;

CREATE SEQUENCE public.restaurants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.restaurants_id_seq OWNER TO postgres;

ALTER SEQUENCE public.restaurants_id_seq OWNED BY public.restaurants.id;

CREATE TABLE public.review_likes (
    id integer NOT NULL,
    review_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.review_likes OWNER TO postgres;

CREATE SEQUENCE public.review_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.review_likes_id_seq OWNER TO postgres;

ALTER SEQUENCE public.review_likes_id_seq OWNED BY public.review_likes.id;

CREATE TABLE public.reviews (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(180) NOT NULL,
    restaurant character varying(180) NOT NULL,
    location character varying(180) DEFAULT ''::character varying,
    category character varying(80) DEFAULT 'อื่น ๆ'::character varying,
    rating smallint NOT NULL,
    body text NOT NULL,
    image_url character varying(500) DEFAULT NULL::character varying,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author character varying(255),
    like_count integer DEFAULT 0,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

ALTER TABLE public.reviews OWNER TO postgres;

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(190) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(10) DEFAULT 'user'::character varying NOT NULL,
    avatar_url character varying(500) DEFAULT NULL::character varying,
    bio character varying(500) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);

ALTER TABLE public.users OWNER TO postgres;

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);

ALTER TABLE ONLY public.contact_messages ALTER COLUMN id SET DEFAULT nextval('public.contact_messages_id_seq'::regclass);

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);

ALTER TABLE ONLY public.restaurants ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq'::regclass);

ALTER TABLE ONLY public.review_likes ALTER COLUMN id SET DEFAULT nextval('public.review_likes_id_seq'::regclass);

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

COPY public.categories (id, name, slug, description, image_url, is_active, created_at) FROM stdin;
\.
COPY public.categories (id, name, slug, description, image_url, is_active, created_at) FROM '$$PATH$$/5135.dat';

COPY public.comments (id, review_id, user_id, comment_text, created_at) FROM stdin;
\.
COPY public.comments (id, review_id, user_id, comment_text, created_at) FROM '$$PATH$$/5139.dat';

COPY public.contact_messages (id, name, email, subject, message, status, created_at) FROM stdin;
\.
COPY public.contact_messages (id, name, email, subject, message, status, created_at) FROM '$$PATH$$/5145.dat';

COPY public.contacts (id, name, email, type, subject, message, created_at) FROM stdin;
\.
COPY public.contacts (id, name, email, type, subject, message, created_at) FROM '$$PATH$$/5147.dat';

COPY public.favorites (id, user_id, review_id, created_at) FROM stdin;
\.
COPY public.favorites (id, user_id, review_id, created_at) FROM '$$PATH$$/5143.dat';

COPY public.restaurants (id, name, address, district, province, phone, price_level, created_at) FROM stdin;
\.
COPY public.restaurants (id, name, address, district, province, phone, price_level, created_at) FROM '$$PATH$$/5137.dat';

COPY public.review_likes (id, review_id, user_id, created_at) FROM stdin;
\.
COPY public.review_likes (id, review_id, user_id, created_at) FROM '$$PATH$$/5141.dat';

COPY public.reviews (id, user_id, title, restaurant, location, category, rating, body, image_url, view_count, created_at, updated_at, author, like_count) FROM stdin;
\.
COPY public.reviews (id, user_id, title, restaurant, location, category, rating, body, image_url, view_count, created_at, updated_at, author, like_count) FROM '$$PATH$$/5133.dat';

COPY public.users (id, name, email, password_hash, role, avatar_url, bio, created_at, updated_at) FROM stdin;
\.
COPY public.users (id, name, email, password_hash, role, avatar_url, bio, created_at, updated_at) FROM '$$PATH$$/5131.dat';

SELECT pg_catalog.setval('public.categories_id_seq', 12, true);

SELECT pg_catalog.setval('public.comments_id_seq', 1, false);

SELECT pg_catalog.setval('public.contact_messages_id_seq', 1, true);

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);

SELECT pg_catalog.setval('public.favorites_id_seq', 14, true);

SELECT pg_catalog.setval('public.restaurants_id_seq', 1, false);

SELECT pg_catalog.setval('public.review_likes_id_seq', 14, true);

SELECT pg_catalog.setval('public.reviews_id_seq', 18, true);

SELECT pg_catalog.setval('public.users_id_seq', 14, true);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uq_favorite_user_review UNIQUE (user_id, review_id);

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT uq_like_user_review UNIQUE (user_id, review_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_comments_review ON public.comments USING btree (review_id, created_at);

CREATE INDEX idx_contact_status ON public.contact_messages USING btree (status, created_at);

CREATE INDEX idx_favorites_user ON public.favorites USING btree (user_id);

CREATE INDEX idx_likes_review ON public.review_likes USING btree (review_id);

CREATE INDEX idx_restaurants_name ON public.restaurants USING btree (name);

CREATE INDEX idx_restaurants_province ON public.restaurants USING btree (province);

CREATE INDEX idx_reviews_category ON public.reviews USING btree (category);

CREATE INDEX idx_reviews_created ON public.reviews USING btree (created_at);

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);

CREATE INDEX idx_reviews_restaurant ON public.reviews USING btree (restaurant);

CREATE INDEX idx_users_role ON public.users USING btree (role);

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;