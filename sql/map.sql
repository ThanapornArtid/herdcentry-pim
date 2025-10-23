DROP DATABASE IF EXISTS map;
CREATE DATABASE map;
USE animals;
Use map;

CREATE TABLE Locations (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    animal_id INT NOT NULL,
    location_timestamp DATETIME NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    speed DECIMAL(5, 2) NOT NULL,   
    location_status ENUM('normal', 'inactive', 'running', 'abnormal','unknow') DEFAULT 'normal' NOT NULL,
    FOREIGN KEY (animal_id) REFERENCES animals.Animals(animal_id)
);

CREATE TABLE Alerts (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    animal_id INT NOT NULL,
    alert_time DATETIME NOT NULL,
    behavior_type VARCHAR(100) NOT NULL,
    location_id INT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
    notes VARCHAR(500),
    
    FOREIGN KEY (animal_id) REFERENCES animals.Animals(animal_id),
    FOREIGN KEY (location_id) REFERENCES map.Locations(location_id)
);