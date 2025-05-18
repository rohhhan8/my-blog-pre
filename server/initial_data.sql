-- MongoDB equivalent SQL script for initial data
-- Note: For MongoDB, this would typically be done using MongoDB commands or
-- a script that uses pymongo, but this serves as a reference

-- Create initial admin user if using Django's auth system
INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined, first_name, last_name)
VALUES 
('admin', 'admin@example.com', 'pbkdf2_sha256$260000$randomhash', true, true, true, NOW(), 'Admin', 'User');

-- Create some initial blog posts
INSERT INTO blog_app_blog (title, content, author_id, created_at, updated_at)
VALUES 
('Welcome to BlogHub', 'This is our first blog post! We''re excited to launch this platform for sharing ideas and stories.', 1, NOW(), NOW()),
('Getting Started with React and Django', 'In this tutorial, we''ll walk through how to set up a full-stack application using React on the frontend and Django on the backend...', 1, NOW(), NOW()),
('Best Practices for API Design', 'When designing APIs, it''s important to consider several factors: consistency, usability, security, and performance...', 1, NOW(), NOW());