const express = require('express');
const Tasks = require('../model/tasks');
const auth = require('../middleware/auth')

const router = new express.Router();

router.post('/tasks', auth, async (req, res) => { 
    // const task = new Tasks(req.body);
    const task = new Tasks({
        ...req.body,
        owner: req.user.id
    })

    try {
        const success = await task.save();
        res.status(201).send(success);
    } catch (e) { 
        res.status(400).send(e);
    }
})

// GET /tasks/?completed=true
// GET /tasks?limit=n&skip=n limit skip
// GET /tasks/?sortBy=createdAt:asc/desc

router.get('/tasks', auth, async (req, res) => { 
    const match = {}
    if (req.query.complete) { 
        match.complete = (req.query.complete == 'true');
    }

    const sort = {};
    if (req.query.sortBy) { 
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        const user = req.user;
        await user.populate({
            path: 'my_tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                // page = limit * (skip - 1), page_1 = 2 * (1 - 1)[no skip]
                skip: parseInt((req.query.page - 1) * req.query.limit),
                sort
            }
        }).execPopulate();

        if (!user.my_tasks) {
            return res.status(404).send();
        };

        res.status(200).send(user.my_tasks);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const task = await Tasks.findOne({ _id, owner: req.user._id });

        if (!task) { 
            res.status(404).send();
        }

        res.status(200).send(task);
    } catch (e) {
        res.status(500).send();
    }
});

router.patch('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;

    const body_keys = Object.keys(req.body);
    const allowed_updates = ['description', 'complete'];
    const is_update_valid = body_keys.every(key => allowed_updates.includes(key));

    if (!is_update_valid) { 
        return res.status(400).send();
    }

    try {
        // [BYPASS]: this function bypasses mongoose, so we need to use a mongoose traditional function which is save().
        // const success = await Tasks.findByIdAndUpdate(_id, req.body, { new: true, runValidators: true }); 
        const task = await Tasks.findOne({ _id, owner: req.user._id })
        
        if (!task) { 
            res.status(404).send();
        }
        
        body_keys.forEach((update_key) => {
            task[update_key] = req.body[update_key];
        });

        await task.save();
        
        res.status(200).send(task);
    } catch (e) {
        if (e.reason) { 
            return res.status(404).send(); // target not found   
        }

        res.status(500).send(e); // server err   
    }
});

router.delete('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const success = await Tasks.findOneAndDelete({ _id, owner: req.user._id });

        if (!success) { 
            return res.status(404).send();
        }

        return res.status(200).send(success);
        
    } catch (e) {
        return res.status(500).send(e);
    }
});

router.delete('/tasks', auth, async (req, res) => { 
    try {
        const success = await req.user.dropTasks();

        res.status(200).send(success);
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
})

module.exports = router;