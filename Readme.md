# Shwrite_b

This is a simple note-taking application built with Node.js, Express, and GunDB.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- npm

### Installing

1. Clone the repository
2. Install the dependencies with `npm install`
3. Start the server with `node index.js`

## Usage

The application provides the following endpoints:

- User registration: `POST /register`
- User login: `POST /login`
- Create a new note: `POST /notes/create/createNew`
- Get all notes: `GET /notes/all/allNotes`
- Update a note: `POST /notes`

## Built With

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [GunDB](https://gun.eco/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
- [uuid](https://www.npmjs.com/package/uuid)

## License

This project is licensed under the ISC License.