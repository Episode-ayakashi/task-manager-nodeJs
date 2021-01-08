const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true,
    },
    complete: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'User'
    },
    img: {
        type: Buffer
    }
}, {
    timestamps: true
});

const Tasks = mongoose.model('Tasks', taskSchema);

module.exports = Tasks; 