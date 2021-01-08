const express = require('express');
const User = require('../model/users');
const auth = require('../middleware/auth')
const multer = require('multer');
const sharp = require('sharp');

const router = new express.Router();

router.post('/users', async (req, res) => {
    const user = new User(req.body);

    try {
        const token = await user.generateAuthToken();

        res.status(201).send({ user, token });
    } catch (e) { 
        res.status(400).send(e);
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();

        res.status(200).send({ user, token });
    } catch (e) {
        res.status(400).send(e);
    }
});

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => { 
            return token.token !== req.token
        })
        req.user.save();
        res.status(200).send();
    } catch (e) {
        res.status(500).send();
    }
});

router.post('/users/logoutAll', auth, async (req, res) => { 
    try {
        req.user.tokens = [];
        req.user.save();

        res.status(200).send();
    } catch (e) {
        res.status(500).send();

    }
})

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
    const body_keys = Object.keys(req.body);
    const allowed_updates = ['age', 'name', 'email', 'password'];
    const is_body_valid = body_keys.every(key => allowed_updates.includes(key));

    if (!is_body_valid) {
        return res.status(400).send()
    };

    try {
        // [BYPASS]: this function bypasses mongoose, so we need to use a mongoose traditional function which is save()(hashing passW.).
        // const success = await User.findByIdAndUpdate(_id, req.body, { new: true, runValidators: true });
        const user = req.user;
        
        body_keys.forEach((update_key) => {
            user[update_key] = req.body[update_key];
        });
        
        await user.save();
        
        res.status(200).send(user);
    } catch (e) {
        if (e.errors) {
            return res.status(400).send(e); // validator
        } 

        res.status(500).send(e); // server err
    }

});

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.dropTasks();
        await req.user.remove();

        res.status(200).send(req.user);
    } catch (e) {
        res.status(500).send(e); // server err
    }
});

const upload = multer({
    limits: {
        fileSize: 1000000 // 1MB
    },
    fileFilter(req, file, cb) { 
        // red
        if (!file.originalname.match(/\.(jpg|png|jpeg)$/)) { 
            return cb(new Error('User avatar must be a valid photo.'))
        }
        // green
        cb(undefined, true);
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => { 
    try {
        if (!req.file) { 
            throw new Error('You must provide a image')
        }
        const buffer = await sharp(req.file.buffer).resize({
            width: 250,
            height: 250
        }).png().toBuffer();
    
        req.user.avatar = buffer;
        await req.user.save();
        res.send();
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
}, (error, req, res, next) => { 
    res.status(400).send({ error: error.message })
})

router.delete('/users/me/avatar', auth,  async (req, res) => { 
    req.user.avatar = undefined;
    await req.user.save();
    res.status(200).send();
})

router.get('/users/me/avatar', auth, async (req, res) => {
    try {
        // const user = await User.findById(req.para)
        const user = req.user;
        if (!user || !user.avatar) { 
            throw new Error();
        }

        res.set('Content-Type', 'image/png');
        res.status(200).send(user.avatar);
    } catch (e) {
        res.status(404).send();
    }
})



module.exports = router;