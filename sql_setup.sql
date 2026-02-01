CREATE DATABASE IF NOT EXISTS exam_platform;
USE exam_platform;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    statement TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    pdf_page_ref INT DEFAULT 1,
    UNIQUE KEY unique_statement (statement(500)) -- Fix for duplicates
);

CREATE TABLE IF NOT EXISTS user_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    date_taken DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dados de Exemplo (Opcional - pode remover depois)
INSERT IGNORE INTO questions (statement, option_a, option_b, option_c, option_d, option_e, correct_option, pdf_page_ref) VALUES 
('Qual a capital do Brasil?', 'Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador', 'Recife', 'C', 1),
('Quanto é 2 + 2?', '3', '4', '5', '6', '22', 'B', 1);
