DROP DATABASE IF EXISTS animals;
CREATE DATABASE animals;

USE animals;
-- 1. SPECIES
CREATE TABLE Species (
    species_id INT PRIMARY KEY AUTO_INCREMENT,
    species_name VARCHAR(200) NOT NULL UNIQUE,
    base_notes VARCHAR(500)
);

-- 2. DIETS
CREATE TABLE Diets (
    diet_id INT PRIMARY KEY AUTO_INCREMENT,
    diet_name VARCHAR(100) NOT NULL UNIQUE,
    total_ration_size_kg DECIMAL(5, 2) NOT NULL,
    ration_size_kg DECIMAL(5, 2) NOT NULL,
    feeding_frequency INT NOT NULL,
    notes TEXT
);

-- 3. ANIMALS
CREATE TABLE Animals (
    animal_id INT PRIMARY KEY AUTO_INCREMENT,
    animal_name VARCHAR(100) NOT NULL UNIQUE,
    birth_date DATE,
    gender ENUM('Male', 'Female', 'Unknown') NOT NULL,
    weight_kg DECIMAL(6, 2) NOT NULL,
    species_id INT NOT NULL,
    current_diet_id INT,

    -- Foreign Key Constraints
    FOREIGN KEY (species_id) REFERENCES Species(species_id),
    FOREIGN KEY (current_diet_id) REFERENCES Diets(diet_id)
);

-- 4. FEED_ITEMS
CREATE TABLE Feed_Items (
    feed_id INT PRIMARY KEY AUTO_INCREMENT,
    feed_name VARCHAR(100) NOT NULL UNIQUE,
    manufacturer VARCHAR(100),
    cost_per_kg DECIMAL(6, 2) NOT NULL,
    
    -- Nutritional Values
    calories_per_kg DECIMAL(8, 2),
    protein_percentage DECIMAL(5, 2),
    fat_percentage DECIMAL(5, 2),
    fiber_percentage DECIMAL(5, 2),
    calcium_mg_per_kg DECIMAL(8, 2)
);

-- 5. DIET_COMPONENTS
CREATE TABLE Diet_Components (
    diet_id INT NOT NULL,
    feed_id INT NOT NULL,
    percentage_in_diet DECIMAL(5, 2) NOT NULL,

    -- Composite Primary Key
    PRIMARY KEY (diet_id, feed_id),

    -- Foreign Key Constraints
    FOREIGN KEY (diet_id) REFERENCES Diets(diet_id),
    FOREIGN KEY (feed_id) REFERENCES Feed_Items(feed_id)
);

-- 6. FEEDINGS (
CREATE TABLE Feedings (
    feeding_id INT PRIMARY KEY AUTO_INCREMENT,
    animal_id INT NOT NULL,
    diet_id INT NOT NULL,
    feeding_date DATETIME NOT NULL,
    amount_fed_kg DECIMAL(6, 2) NOT NULL,
    notes TEXT,

    -- Foreign Key Constraints
    FOREIGN KEY (animal_id) REFERENCES Animals(animal_id),
    FOREIGN KEY (diet_id) REFERENCES Diets(diet_id)
);
