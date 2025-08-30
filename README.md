# OpenLibro Backend

This repository contains the backend source code for **OpenLibro**, a book discovery and management platform. The API is built with Node.js and Express, and connects to a MySQL database for data persistence.

## 🚀 Key Features

- **User Authentication**: Secure registration and login system using JSON Web Tokens (JWT) and password hashing with Bcrypt.
- **Book Management**: API for searching, filtering, and retrieving book details.
- **OpenLibrary Sync**: A script that populates the database with book and genre information from the OpenLibrary API.
- **User Interactions**: Authenticated users can mark books as favorites and like them.

- **Profiles and Statistics**: Endpoints for users to view their profile and to obtain general platform statistics (most popular books, total users, etc.).
- **Static File Server**: The backend also serves the application's frontend.

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JSON Web Tokens (`jsonwebtoken`)
- **Security**: `bcrypt` for password hashing
- **Environment Management**: `dotenv`
- **HTTP Client**: `axios` to consume external APIs
- **CORS**: `cors` to enable requests from other sources

## 🗄️ Database

The complete database schema is located in the `public/script.sql` file. This script will create all the necessary tables, relationships, and initial data.

**Main tables**: `users`, `roles`, `books`, `genres`, `institutions`.
**Relationship and interaction tables**: `books_genres`, `book_metrics`, `users_books`, `books_reactions`.

## ⚙️ Installation and Startup Guide

Follow these steps to deploy the project in your local environment.

### Prerequisites

- Node.js (v18 or higher)
- NPM
- A working MySQL server

### Steps

1. Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd <DIRECTORY_NAME>
```

2. Install dependencies:
```bash
npm install
```

3. Configure the database:

- Open your MySQL client.
- Run the `public/script.sql` script to create the `openbook` database and all its tables.

```sql
-- Example using the mysql command line client
mysql -u your_username -p < public/script.sql
```

4. **Configure the environment variables:**
- Create a copy of the `.env.example` file I created in the project root and rename it to `.env`.
```bash
cp .env.example .env
```
- Open the `.env` file and fill in the corresponding values, especially those for the database (`DB_USER`, `DB_PASSWORD`) and the `JWT_SECRET`.

5. **Start the server:**
```bash
npm start
```
The server should be running on `http://localhost:3000` (or whatever port you configured in your `.env` file).

## 📡 API Endpoints

Here's a summary of the most important endpoints.

| Verb | Path | Description | Authentication |
| :----- | :-------------------------- | :---------------------------------------------- | :------------ |
| `GET` | `/api/books` | Gets a list of books. Accepts filters. | No |
| `GET` | `/api/books/:id` | Gets details about a specific book. | No |
| `GET` | `/api/genres` | Gets a list of all genres. | No |
| `GET` | `/api/stats` | Gets general platform statistics. | No |
| `POST` | `/api/auth/register` | Registers a new user. | No |
| `POST` | `/api/auth/login` | Logs in and returns a JWT. | No |
| `GET` | `/api/user/profile` | Gets the authenticated user's profile. | **Yes** |
| `POST` | `/api/books/:id/like` | Likes/unlikes a book. | **Yes** |
| `POST` | `/api/books/:id/favorite` | Adds/removes a book from favorites. | **Yes** |
| `GET` | `/api/user/favorites` | Gets the user's list of favorite books. | **Yes** |

## 🚧 Suggestions and Next Steps

This is a working backend, but here are some key areas to improve it and make it more robust and scalable:

- **🧪 Implement Testing**:
- **Unit Tests**: For business logic in services (e.g., `auth.js`).
- **Integration Testing**: For API endpoints, verifying that routes, middleware, and controllers work together correctly.
- *Suggested tools: Jest, Supertest.*

- **📄 API Documentation**:
- Generate docs