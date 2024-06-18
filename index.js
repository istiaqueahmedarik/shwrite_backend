// server.js
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Gun = require('gun');
const v4 = require('uuid').v4;

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(Gun.serve);

const JWT_SECRET = process.env.secret || 'secret';
const server = require('http').createServer(app);
// Create a Gun instance
const gun = Gun({
    web: server
});

// Middleware to check JWT
const authenticateToken = (req, res, next) => {

    const token = req.headers['authorization'].split(' ')[1];
    if (!token) {

        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {

            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// User registration endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    // Check if user already exists
    gun.get('users').get(username).once(async (user) => {
        if (user) {

            return res.status(400).send('User already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        gun.get('users').get(username).put({ username, password: hashedPassword });

        const id = v4();
        gun.get('notes').get(username).get(id).put({ id, title: 'Welcome to Notes', description: 'Create a new note to get started', time: new Date().getTime() }, (ack) => { });
        gun.get('notesDetails').get(username).get(id).put({ id, editor: "[]", drawing: "{}" }, (ack) => { });

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).send(
            {
                token,
                username
            }
        );
    });

});

// User login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }


    // Retrieve the user
    gun.get('users').get(username).once(async (user) => {
        if (!user) {

            console.log('User not found')
            return res.status(400).send('User not found');
        }

        // Compare the password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {

            console.log('Invalid credentials')

            return res.status(401).send('Invalid credentials');
        }

        console.log('User logged in')

        // Generate JWT
        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, username: user.username });
    });
});



app.post('/notes/create/createNew', authenticateToken, (req, res) => {
    const username = req.user.username;

    const { title, description } = req.body;
    const id = v4();
    const time = new Date().getTime();
    gun.get('notes').get(username).get(id).put({ id, title, description, time }, (ack) => {
        // res.json(ack);

    });

    gun.get('notesDetails').get(username).get(id).put({ id, title, description, time }, (ack) => {
        // res.json(ack);
        console.log(ack)

    });
    // const id = v4();

    res.json({ id });
});

app.get('/notes/all/allNotes', authenticateToken, async (req, res) => {
    const username = req.user.username;
    console.log(username)
    const allNotes = [];
    try {

        await new Promise((resolve) => {
            gun.get('notes').get(username).map().once((note) => {
                if (note) {
                    const id = note['id']
                    const title = note['title'];
                    const description = note['description'];
                    const time = note['time'];
                    console.log(id, title, description, time)
                    allNotes.push({ id, title, description, time });
                }
                else {
                    console.log('No notes found')
                }
            }).then(resolve);
        });
    }
    catch (e) {
        console.log(e)
    }
    console.log(allNotes)
    if (allNotes.length) {
        allNotes.sort((a, b) => b.time - a.time);
        return res.status(200).json(allNotes);
    }
    else {
        allNotes = [{ id: '1', title: 'Welcome to Notes', description: 'Create a new note to get started', time: new Date().getTime() }];
        return res.status(200).json(allNotes);
    }


});


app.post('/notes', authenticateToken, (req, res) => {
    const username = req.user.username;
    const { id, editor, drawing } = req.body;
    if (id === undefined || editor === undefined || drawing === undefined) {
        return res.status(400).send('Missing parameters');
    }
    console.log(id, editor, drawing);
    gun.get('notesDetails').get(username).get(id).put({ editor, drawing }, (ack) => {

    });
    return res.status(200).send('Note updated');
});

app.get('/notes/:id', authenticateToken, async (req, res) => {
    const username = req.user.username;
    const id = req.params.id;

    let data = null;
    await new Promise((resolve) => {
        gun.get('notesDetails').get(username).get(id).once((note) => {

            const editor = note['editor'];
            const drawing = note['drawing'];
            data = { editor, drawing };
        }).then(resolve);
    });



    return res.status(200).json({ data });

});

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
});
