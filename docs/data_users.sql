INSERT INTO users (full_name, national_id, email, password, role_id, institution_id) VALUES
('Sebastian Marriaga', '123456789', 'sebastian@maestro.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 1, 1),
('Ana González', '987654321', 'ana@maestro.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 1, 2);

-- Insertar usuarios de prueba (estudiantes)
INSERT INTO users (full_name, national_id, email, password, role_id, institution_id) VALUES
('Juan Pérez', '111222333', 'juan.perez@estudiante.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 2, 1),
('María López', '444555666', 'maria.lopez@estudiante.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 2, 1),
('Carlos Ruiz', '777888999', 'carlos.ruiz@estudiante.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 2, 1),
('Laura Torres', '123789456', 'laura.torres@estudiante.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 2, 2),
('Diego Morales', '456123789', 'diego.morales@estudiante.edu.co', '$2b$10$bepKJ6JBKPEaxQgCw0NtGu7Nznv8M8UbIR/qSM2nUjP.Q.qMkWbwy', 2, 2);

-- Obtener IDs de algunos libros existentes (ajustar según tus libros)
SET @libro1 = (SELECT book_id FROM books LIMIT 1);
SET @libro2 = (SELECT book_id FROM books LIMIT 1,1);
SET @libro3 = (SELECT book_id FROM books LIMIT 2,1);
SET @libro4 = (SELECT book_id FROM books LIMIT 3,1);
SET @libro5 = (SELECT book_id FROM books LIMIT 4,1);

-- Asignar estudiantes a profesores
INSERT INTO student_assignments (teacher_id, student_id) VALUES
(1, 3), -- Sebastian - Juan
(1, 4), -- Sebastian - María
(1, 5), -- Sebastian - Carlos
(2, 6), -- Ana - Laura
(2, 7); -- Ana - Diego

-- Asignar libros a estudiantes usando los IDs obtenidos
INSERT INTO book_assignments (student_id, book_id, status, progress) VALUES
(3, @libro1, 'in_progress', 65), -- Juan - Libro 1
(3, @libro2, 'completed', 100),  -- Juan - Libro 2
(4, @libro1, 'pending', 0),      -- María - Libro 1
(4, @libro3, 'in_progress', 45), -- María - Libro 3
(5, @libro2, 'overdue', 25),     -- Carlos - Libro 2
(6, @libro4, 'in_progress', 75), -- Laura - Libro 4
(7, @libro5, 'completed', 100);  -- Diego - Libro 5

-- Insertar algunas reacciones de usuarios
INSERT INTO books_reactions (user_id, book_id, reaction_type) VALUES
(3, @libro1, 'like'),
(3, @libro1, 'vista'),
(4, @libro3, 'vista'),
(5, @libro2, 'favoritos'),
(6, @libro4, 'like'),
(7, @libro5, 'favoritos');

-- Insertar registros en users_books
INSERT INTO users_books (user_id, book_id, status) VALUES
(3, @libro1, 'leyendo'),
(3, @libro2, 'favoritos'),
(4, @libro3, 'leyendo'),
(5, @libro2, 'favoritos'),
(6, @libro4, 'leyendo'),
(7, @libro5, 'favoritos');