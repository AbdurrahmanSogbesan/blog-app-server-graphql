const { buildSchema } = require("graphql");

// Similar to routes of RESTful APIs, defines structure

// Exclamation marks after type mean its required
// in the schema, use query for GETTING DATA, and mutation for working on data
// input key is a special type keyword for user inputs
// ID is a special type for ids
// Mutator methods accept an argument with parentheses and also include the return type
// i.e mutator(arg: ArgType): Returntype
module.exports = buildSchema(` 
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator : User!
        createdAt: String!
        updatedAt: String!
    }
    
    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    input UserInputData {
        email: String!,
        name: String!,
        password: String!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type PostData {
        posts:[Post!]
        totalPosts: Int!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts (page: Int): PostData!
        post (postId: ID!): Post!
        user: User!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(postId: ID!, postInput: PostInputData!): Post!
        deletePost(postId: ID!): Boolean
        updateStatus(status: String!): User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
