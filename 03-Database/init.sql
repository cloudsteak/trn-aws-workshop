-- =====================================================
-- Cloud Idézetek – Adatbázis inicializálás
-- AWS Workshop
-- =====================================================

CREATE DATABASE IF NOT EXISTS cloudquotes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cloudquotes;

CREATE TABLE IF NOT EXISTS quotes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    text       VARCHAR(500) NOT NULL,
    author     VARCHAR(100) NOT NULL,
    category   VARCHAR(50)  NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO quotes (text, author, category) VALUES
-- Tech
('A technológia akkor a legjobb, amikor összehoz embereket.', 'Matt Mullenweg', 'tech'),
('Az innováció különbözteti meg a vezetőt a követőtől.', 'Steve Jobs', 'tech'),
('A számítógép maga haszontalan. Csak válaszokat tud adni.', 'Pablo Picasso', 'tech'),
('A technológia nem más, mint eszköz. Az emberek együttműködése a lényeg.', 'Bill Gates', 'tech'),
('Az egyszerűség a végső kifinomultság.', 'Leonardo da Vinci', 'tech'),
-- Cloud
('A felhő nem egy hely, hanem egy módszer.', 'AWS', 'cloud'),
('Nincs felhő, csak más emberek számítógépei.', 'Ismeretlen', 'cloud'),
('A skálázhatóság nem opció, hanem elvárás.', 'Werner Vogels', 'cloud'),
('A jövő a szervermentes architektúráé.', 'AWS Lambda csapat', 'cloud'),
('Minden cég technológiai cég, csak még nem mindegyik tudja.', 'Watts S. Humphrey', 'cloud'),
-- Motivation
('A legjobb idő elkezdeni valamit 20 éve volt. A második legjobb idő most van.', 'Kínai közmondás', 'motivation'),
('Ne azt mérd, milyen messze vagy, hanem azt, honnan indultál.', 'Ismeretlen', 'motivation'),
('A kudarc nem az ellentéte a sikernek, hanem része annak.', 'Arianna Huffington', 'motivation'),
('Tedd a nehezet, amíg könnyű. Tedd a nagyot, amíg kicsi.', 'Lao-ce', 'motivation'),
('Nem azért tanulunk, hogy tudjunk, hanem azért, hogy csinálhassunk.', 'Ismeretlen', 'motivation');

-- Ellenőrzés
SELECT category, COUNT(*) AS darab FROM quotes GROUP BY category;
