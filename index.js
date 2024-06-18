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
    if (!token) 
    {
        
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
        
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).send(
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
            
            return res.status(400).send('User not found');
        }

        // Compare the password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            
            return res.status(401).send('Invalid credentials');
        }

        // Generate JWT
        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});



app.post('/notes/create/createNew', authenticateToken, (req, res) => { 
    const username = req.user.username;
    
    const { title, description } = req.body;
    const id = v4();
    gun.get('notes').get(username).get(id).put({ id,title, description }, (ack) => {
        // res.json(ack);
        
    });

    gun.get('notesDetails').get(username).get(id).put({ id, title, description }, (ack) => {
        // res.json(ack);
        console.log(ack)
        
    });
    // const id = v4();
   
    res.json({ id });
});

app.get('/notes/all/allNotes', authenticateToken, async (req, res) => {
    const username = req.user.username;
    const allNotes = [];

    await new Promise((resolve) => {
        gun.get('notes').get(username).map().once((note) => {
            if (note) {
                const id = note['id']
                const title = note['title'];
                const description = note['description'];
                allNotes.push({ id, title, description });
            }
        }).then(resolve);
    });

    
    return res.status(200).json(allNotes);
});


app.post('/notes', authenticateToken, (req, res) => {
    const username = req.user.username;
    const { id, editor, drawing } = req.body;
    if (id === undefined || editor === undefined || drawing === undefined)
    {
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

   

    return res.status(200).json({ data});

});

app.listen(port, () => {
    
});
