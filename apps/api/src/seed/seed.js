const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/Course');

dotenv.config();

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for seeding');

  // Remove existing demo course if exists
  await Course.deleteOne({ slug: 'demo-course' });

  const demo = new Course({
    title: 'Curso Demo Gratis',
    slug: 'demo-course',
    description: 'Curso de ejemplo con una o dos lecciones para pruebas',
    price: 0,
    public: true,
    lessons: [
      { title: 'Lección 1 - Introducción', description: 'Introducción al curso', muxPlaybackId: 'your_mux_playback_id_1' },
      { title: 'Lección 2 - Práctica', description: 'Segunda lección', muxPlaybackId: 'your_mux_playback_id_2' },
    ],
  });

  await demo.save();
  console.log('Seeded demo course');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
