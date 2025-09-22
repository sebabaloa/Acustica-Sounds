const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser')
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
// Models
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const bcrypt = require('bcryptjs');

// Conexión a MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err);
  });

// Ruta de prueba
app.get("/ping", (req, res) => {
  res.json({ ok: true });
});

// Auth: signup
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = new User({ name, email, passwordHash: hash });
    await user.save();
    return res.json({ ok: true, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Auth: login (returns simple user object if ok)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    return res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

const jwt = require('jsonwebtoken')
const SESSION_COOKIE = 'acustica_session'
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change'

// Auth: signin and set httpOnly cookie
app.post('/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ id: user._id.toString(), email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' })

    // set cookie (httpOnly)
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
})

// Auth: get session from cookie
app.get('/auth/session', async (req, res) => {
  try {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return res.json({ ok: true, session: null });
    try {
      const data = jwt.verify(token, JWT_SECRET);
      return res.json({ ok: true, session: { user: data } });
    } catch (err) {
      return res.json({ ok: true, session: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
})

// Auth: sign out (clear cookie)
app.post('/auth/signout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
})

// Courses list
app.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find({ public: true }).select('title slug description price');
    res.json({ ok: true, courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Course detail by slug
app.get('/courses/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Enroll in a course
app.post('/enrollments', async (req, res) => {
  try {
    const { userId, courseSlug } = req.body || {}
    if (!userId || !courseSlug) return res.status(400).json({ error: 'userId and courseSlug required' })

    // verify course exists
    const course = await Course.findOne({ slug: courseSlug })
    if (!course) return res.status(404).json({ error: 'course not found' })

    // Optional: verify JWT cookie if provided
    const token = req.cookies[SESSION_COOKIE]
    if (token) {
      try {
        const data = jwt.verify(token, JWT_SECRET)
        if (data.id !== userId) return res.status(401).json({ error: 'invalid user' })
      } catch (err) {
        return res.status(401).json({ error: 'invalid session' })
      }
    } else {
      // If no JWT cookie, require next-auth session cookie presence for now
      if (!req.cookies['next-auth.session-token'] && !req.cookies['next-auth.session-token.sig']) {
        return res.status(401).json({ error: 'not authenticated' })
      }
    }

    const Enrollment = require('./models/Enrollment')
    const enrollment = new Enrollment({ user: userId, course: course._id })
    await enrollment.save()
    return res.json({ ok: true, enrollmentId: enrollment._id })
  } catch (err) {
    console.error(err)
    if (err && err.code === 11000) return res.status(409).json({ error: 'already enrolled' })
    res.status(500).json({ error: 'server error' })
  }
})

// List enrollments for a user
app.get('/enrollments/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const Enrollment = require('./models/Enrollment')
    const enrollments = await Enrollment.find({ user: userId }).populate('course', 'slug title').lean()
    res.json({ ok: true, enrollments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
