# Blog App GraphQL API



## About
This API is built using Express and implements a GraphQL endpoint for a blog application. It provides functionality for user authentication, post management, and image uploading.

## Preview
<p float="middle">
  <img width="49%" alt="image" src="https://github.com/AbdurrahmanSogbesan/blog-app-server-graphql/assets/64173776/5c815ab3-36f0-4c96-87e7-d4b07057e0a8">
  <img width="49%" alt="image" src="https://github.com/AbdurrahmanSogbesan/blog-app-server-graphql/assets/64173776/5e12f2d5-5fcf-4151-8cef-198da094c33f">
</p>


## Prerequisites

- Node.js and npm installed on your system
- MongoDB database connection

## Getting Started

1. Clone the repository:

```shell
git clone <repository-url>
cd <repository-directory>
```

2. Install the dependencies:

```shell
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory and provide the following environment variables:

```
MONGO_USER=<your-mongodb-username>
MONGO_PASSWORD=<your-mongodb-password>
MONGO_DEFAULT_DB=<your-mongodb-default-database>
JWT_SECRET=<your-jwt-secret>
```

4. Start the server:

```shell
npm start
```

By default, the server will listen on port `8080` unless the `PORT` environment variable is set.

## Endpoints

### `POST /graphql`

This endpoint is used for all GraphQL requests. The GraphQL queries and mutations should be sent as a POST request to this endpoint. The API supports the following operations:

- `login`: Authenticates a user by email and password and returns a JSON web token.
- `createUser`: Creates a new user with the provided details.
- `createPost`: Creates a new post with the provided details.
- `updatePost`: Updates an existing post with the provided details.
- `deletePost`: Deletes a post with the given post ID.
- `updateStatus`: Updates the status of the logged-in user.
- `posts`: Retrieves a list of posts with pagination support.
- `post`: Retrieves a single post by post ID.
- `user`: Retrieves the details of the logged-in user.

### `PUT /post-image`

This endpoint is used to upload images for a post. It accepts a single image file in the `image` field of the multipart form-data. The request must include a valid authentication token in the `Authorization` header.

## Error Handling

The API handles errors gracefully and returns appropriate HTTP status codes and error messages. If an error occurs during the execution of a GraphQL operation, the error message and status code will be included in the response.

## Authorization

The API uses JSON Web Tokens (JWT) for user authentication. To access protected endpoints, include the generated JWT token in the `Authorization` header of the request.

## File Storage

The API stores uploaded images in the `images` directory. The images can be accessed using the `/images` route.

## CORS Configuration

The API includes appropriate CORS headers to allow cross-origin requests. The Access-Control-Allow-Origin header is set to `*`, allowing requests from any origin. The allowed methods include OPTIONS, GET, POST, PUT, PATCH, and DELETE. Custom headers such as Content-Type and Authorization are also allowed.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please create a GitHub issue or submit a pull request.
