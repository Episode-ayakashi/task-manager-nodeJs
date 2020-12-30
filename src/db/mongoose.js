const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

// const task_1 = new Tasks({
//     name: 'ames live'
// });

// task_1.save().then((result) => { 
//     console.log(result);
// }).catch((error) => { 
//     console.log(error);
// })

