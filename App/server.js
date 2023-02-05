const express = require('express');
var cookieParser = require('cookie-parser')
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios')
// app.use(cors())
// app.use(cors({ credentials: true, origin: 'http://localhost:3006' }));
app.use(cookieParser())

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }));
var jsonParser = bodyParser.json()
// app.use(jsonParser)
app.use(express.json({limit: "30mb",extended:true}));
app.use(express.urlencoded({limit: "30mb",extended:true}));
app.use(bodyParser.json({ limit: '50mb' }));
var urlencodedParser = bodyParser.urlencoded({ limit: '50mb', extended: true })

const mongoose = require('mongoose');
const fs = require('fs');
const Review = require('./client/models/review')
const catchAsync = require('./utils/catchAsync')
const isLoggedIn = require('./utils/isLoggedIn')
const ExpressError = require('./utils/ExpressError')

// const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://jingxianzhang:zjx123@cluster0.rhcpskm.mongodb.net/?retryWrites=true&w=majority";
// 'mongodb://localhost:27017/business-review'
mongoose.connect(uri, {
  useNewUrlParser: true,
  //useCreateIndex:true,
  useUnifiedTopology: true, //these are no longer support options since mongoose 6
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.use(express.static(path.join(__dirname, "./client/build")))

const session = require('express-session')
const sessionConfig = {
  secret: 'aaa',
  saveUninitialized: true,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: false,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}
const flash = require('connect-flash')

app.use(session(sessionConfig))
app.use(flash())

app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  next()
})

const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./client/models/user')

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.set('port', process.env.PORT || 8080);



// -app.get('/', function (req, res) {
//   +app.get('/*', function (req, res) {
//      res.sendFile(path.join(__dirname, 'build', 'index.html'));
//    });

// var cors = require('cors');    
// app.use(cors({ credentials: true, origin: 'http://localhost:3006' }));

app.get('/isLoggedIn', (req, res) => {
  console.log("isloggedin", req.user)
  console.log(req.isAuthenticated())
  if (!req.user) {
    res.send({ isLoggedIn: false })
  }
  else res.send({ isLoggedIn: true, username: req.user.username })
})



app.post('/register', async (req, res) => {
  try {
    console.log(req.body)
    const { email, username, password } = req.body;
    const user = new User({ email, username })
    const registeruser = await User.register(user, password)
    req.login(registeruser, err => {
      if (err) return console.log(err)
      // var redir = { redirect: "/" };
      // res.send(JSON.stringify(redir))
      // req.flash("success","Successfully login!")
      return res.redirect('/')
    })
  } catch (e) {
    return res.redirect('/register')
    // var redir = { redirect: "/login" };
    // console.log(e)

    // return res.send(JSON.stringify(redir))
  }
})

app.post('/login', passport.authenticate('local', {
  failureFlash: true,
  failureRedirect: '/login', failureMessage: true
}), (req, res) => {
  console.log("login")
  // req.flash('success','welcome back!')
  res.redirect('/')

  // res.send("success")

})

app.get('/logout', (req, res) => {
  req.logout(req.user, err => {
    console.log()
    if (err) return next(err);
    return res.send("success")
    // return res.redirect("/");
  });
})

app.post('/new', jsonParser, async (req, res, next) => {
  if (req.body) {
    let reviewData = req.body
    const review = new Review(reviewData);
    review.author = req.user._id
    await review.save()
    res.send(JSON.stringify({ "status": 200, "error": null, "response": null }));
  }
  //if(!req.body) throw new ExpressError('Invalid Campground Data', 400)
})

app.get('/reviews', catchAsync(async (req, res) => {
  const reviews = await Review.find({})
  res.send(JSON.stringify(reviews))
}))

app.get("/author", jsonParser, async (req, res) => {
  const tmpReview = await Review.findById(req.query.id) //notice:query, not body or data
  const authorId = tmpReview.author
  const author = await User.findById(authorId) //notice:query, not body or data
  const tmp = { review: tmpReview, author: author.username }
  res.send(tmp)
})

// app.get('/search', (req, res) => {
//   res.render()
// })

app.get('/autodetect', (req, res) => {
  axios.get("https://ipinfo.io?token=20b47985c1625f")
    .then(response => {
      res.send(response.data)
    })
})

// create a GET route
app.get('/geocoding', (req, res) => {
  axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.query.text}&key=AIzaSyAakOkX978ZyZRyGFox_SLcqI35gtbaXZY`)
    .then(response => {
      res.send(response.data) //谁请求的发给谁

    });
});

app.get('/yelpinfo', (req, res) => {
  axios.get("https://api.yelp.com/v3/businesses/search", {
    params: {
      term: req.query.term,
      latitude: req.query.latitude,
      longitude: req.query.longitude,
      categories: req.query.categories,
      radius: req.query.radius
    }, //这里逗号
    headers: {
      'Authorization': "Bearer oZOjIKk7IaSWd8sobt45_bYJybBXHCR2yVuVzR2nw68t5dCH9qyjG2HVToXJ0yW_g_HVNfrmZCAZyvTP1NGHxrZzyNSc_xu7ANfh3Dh8IHGnXlmlaxi4DxGBQItwY3Yx"
    } //key不要放在前端
  })
    .then(response => res.send(response.data))
});

app.get('/yelpautocomplete', (req, res) => {

  axios.get("https://api.yelp.com/v3/autocomplete", {
    params: {
      text: req.query.text
    }, //这里逗号
    headers: {
      accept: 'application/json',
      'Authorization': "Bearer oZOjIKk7IaSWd8sobt45_bYJybBXHCR2yVuVzR2nw68t5dCH9qyjG2HVToXJ0yW_g_HVNfrmZCAZyvTP1NGHxrZzyNSc_xu7ANfh3Dh8IHGnXlmlaxi4DxGBQItwY3Yx"
    } //key不要放在前端
  })
    .then(response => res.send(response.data))
});

app.get('/businessinfo', (req, res) => {
  console.log(req.query.id)
  axios.get(`https://api.yelp.com/v3/businesses/${req.query.id}`, {
    headers: {
      'Authorization': "Bearer oZOjIKk7IaSWd8sobt45_bYJybBXHCR2yVuVzR2nw68t5dCH9qyjG2HVToXJ0yW_g_HVNfrmZCAZyvTP1NGHxrZzyNSc_xu7ANfh3Dh8IHGnXlmlaxi4DxGBQItwY3Yx"
    }
  })
    .then((response) => {
      console.log("result", response.data)
      res.send(response.data)
    }) //带data
});

app.get('/login', (req, res) => {
  res.send('here is get /login')
})

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
})

app.get('/hello', (req, res) => {
  res.send("hello")
}); //想访问这个的话把port改成5000

app.listen(app.get('port'), () => {
  console.log("Server running on", app.get('port'));
});