const mongoose = require('mongoose');
const validator = require('validator');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tasks = require('./tasks');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        require: true,
        trim: true,
        lowercase: true,
        validate(value) { 
            if (!validator.isEmail(value)) { 
                throw new Error('Email not valid.');
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) { 
            if (value < 0) { 
                throw new Error('Age must be a positive number.');
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) { 
            if (value.toLowerCase().includes('password')) { 
                throw new Error(`password field value cant contain 'password'.`);
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
});

// [VIRTUAL DATA]
userSchema.virtual('my_tasks', {
    ref: 'Tasks',
    localField: '_id',
    foreignField: 'owner'

})

// [toJSON]:
userSchema.methods.toJSON = function () {
    const user = this;
    const public_profile = user.toObject()

    delete public_profile.password;
    delete public_profile.tokens;
    delete public_profile.avatar;

    return public_profile;
   
};

// [INSTANCE METHOD]
userSchema.methods.generateAuthToken = async function (){ 
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
}

userSchema.methods.dropTasks = async function () { 
    const user = this;

    await user.populate('my_tasks').execPopulate();
    const tasks = user.my_tasks;

    await Tasks.deleteMany({ owner: user._id });
 
    return tasks;
}

// [MODEL METHOD]
userSchema.statics.findByCredentials = async (email, password) => { 
    const user = await User.findOne({ email });

    if (!user) {  
        throw new Error('Unable to login.');
    }

    const isMatch = await bcryptjs.compare(password, user.password);

    if (!isMatch) { 
        throw new Error('Unable to login.')
    }

    return user;
};

// plaintext password hashing.
userSchema.pre('save', async function (next) { 
    const user = this;

    if (user.isModified('password')) { 
        user.password = await bcryptjs.hash(user.password, 8);
    }

    next();
}); 

const User = mongoose.model('Users', userSchema);

module.exports = User;