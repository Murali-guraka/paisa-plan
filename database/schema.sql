-- Optional: Hibernate creates these tables automatically (ddl-auto=update).
CREATE DATABASE IF NOT EXISTS finance_planner;
USE finance_planner;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type ENUM('INCOME','EXPENSE') NOT NULL,
  category VARCHAR(60) NOT NULL,
  tx_date DATE NOT NULL,
  note VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(60) NOT NULL UNIQUE,
  limit_amount DECIMAL(12,2) NOT NULL
);

-- Sample data (change the dates to the current month)
INSERT INTO budgets (category, limit_amount) VALUES ('Food', 6000), ('Transport', 2500), ('Entertainment', 2000);
INSERT INTO transactions (title, amount, type, category, tx_date, note) VALUES
 ('Monthly stipend', 25000, 'INCOME', 'Salary', CURDATE(), NULL),
 ('Groceries', 1850, 'EXPENSE', 'Food', CURDATE(), 'Weekly market'),
 ('Bus pass', 900, 'EXPENSE', 'Transport', CURDATE(), NULL),
 ('Movie night', 650, 'EXPENSE', 'Entertainment', CURDATE(), NULL);
