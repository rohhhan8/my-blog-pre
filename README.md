# BlogHub - Full-Stack Blog Application

A modern, responsive blog application built with React, Django, Firebase Authentication, and MongoDB.

## Deployed Application

- Frontend: [https://my-blog-pre01.vercel.app](https://my-blog-pre01.vercel.app)
- Backend: [https://my-blog-pre.onrender.com](https://my-blog-pre.onrender.com)

## Features

- User authentication with Firebase (signup, login, logout)
- Create, read, update, and delete blog posts
- Responsive design using Tailwind CSS
- RESTful API with Django Rest Framework
- MongoDB database for storing blog data
- Protected routes for authenticated users
- Clean, modern UI

## Tech Stack

### Frontend
- React.js
- React Router for navigation
- Tailwind CSS for styling
- Firebase Authentication
- Axios for API requests

### Backend
- Django
- Django REST Framework
- Firebase Admin SDK for token verification
- MongoDB via djongo
- CORS support

## Project Structure

```
project/
├── client/                  # React frontend
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── BlogCard.jsx
│       │   └── ProtectedRoute.jsx
│       ├── context/
│       │   └── AuthContext.js
│       ├── firebase/
│       │   └── firebaseConfig.js
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   ├── BlogList.jsx
│       │   ├── BlogDetail.jsx
│       │   ├── CreateBlog.jsx
│       │   └── EditBlog.jsx
│       ├── services/
│       │   └── apiService.js
│       ├── App.jsx
│       └── main.jsx
├── server/                  # Django backend
│   ├── blog_project/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── blog_app/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── permissions.py
│   │   ├── urls.py
│   │   └── firebase_auth.py
│   ├── firebase/
│   │   └── serviceAccountKey.json
│   ├── requirements.txt
│   └── manage.py
└── README.md
```

## Setup and Installation

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB
- Firebase account

## Usage

- Anyone can view the list of blogs and individual blog posts
- Create an account or log in to create/edit/delete your own blog posts
- Access protected routes like `/create` and `/edit/:id` once authenticated

## License

MIT
