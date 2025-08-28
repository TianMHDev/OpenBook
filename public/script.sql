-- ==================================================
-- DATABASE CREATION
-- ==================================================
DROP DATABASE IF EXISTS openbook;
CREATE DATABASE openbook;
USE openbook;

-- ==================================================
-- BASE TABLES
-- ==================================================
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    role_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_name ENUM("maestro","estudiante") NOT NULL UNIQUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS institutions;
CREATE TABLE institutions (
    institution_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    institution_name VARCHAR(100) NOT NULL UNIQUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) UNIQUE NOT NULL,
    national_id VARCHAR (20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) UNIQUE NOT NULL,
    role_id INT DEFAULT NULL,
    institution_id INT DEFAULT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS genres;
CREATE TABLE genres(
    genre_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS books;
CREATE TABLE books (
    book_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cover_url VARCHAR(255) NOT NULL,
    published_year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================================================
-- RELATIONAL TABLES
-- ==================================================
DROP TABLE IF EXISTS books_genres;
CREATE TABLE books_genres (
    book_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (book_id, genre_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================================================
-- BOOK METRICS
-- ==================================================
DROP TABLE IF EXISTS book_metrics;
CREATE TABLE book_metrics (
    metric_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL UNIQUE,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    favorites BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ==================================================
-- USER–BOOK INTERACTIONS
-- ==================================================
DROP TABLE IF EXISTS users_books;
CREATE TABLE users_books (
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    status ENUM('leyendo','favoritos') NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS books_reactions;
CREATE TABLE books_reactions (
    reaction_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    reaction_type ENUM('like','favoritos','vista') NOT NULL,
    reacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
