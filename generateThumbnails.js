require("dotenv").config();
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Course = require("./models/courseModel");

const categories = {
  html: { color: '#ff4b1f', secondary: '#ff9068' },
  css: { color: '#3a7bd5', secondary: '#00d2ff' },
  javascript: { color: '#ffb347', secondary: '#f7df1e' },
  react: { color: '#00d8ff', secondary: '#0052d4' },
  python: { color: '#2ecc71', secondary: '#27ae60' },
  'node.js': { color: '#3c873a', secondary: '#1e521a' },
  django: { color: '#1abc9c', secondary: '#16a085' },
  default: { color: '#888888', secondary: '#555555' }
};

const baseDir = path.join(__dirname, 'scripts', 'base_images');
const targetDir = path.join(__dirname, 'public', 'uploads');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB: " + process.env.MONGODB_URI);
  
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const baseFiles = fs.readdirSync(baseDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  if (baseFiles.length === 0) {
      console.log("No base images found. Run downloadBaseImages.js first.");
      process.exit(1);
  }

  const courses = await Course.find();
  console.log("Found " + courses.length + " courses.");

  for (const course of courses) {
    const catKey = course.category ? course.category.toLowerCase() : 'default';
    const cat = categories[catKey] || categories.default;
    
    // Pick a random base image using course ID as a seed so it's consistent but varied
    const hash = crypto.createHash('md5').update(course._id.toString()).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);
    
    const baseFile = baseFiles[hashNum % baseFiles.length];
    const basePath = path.join(baseDir, baseFile);
    
    // Generate an abstract SVG overlay (NO TEXT, NO LABELS)
    // Uses the category colors to create a cinematic glow, tech grids, and geometry
    
    // Randomize the glow positions based on hash
    const cx1 = (hashNum % 100) + "%";
    const cy1 = ((hashNum >> 2) % 100) + "%";
    const cx2 = ((hashNum >> 4) % 100) + "%";
    const cy2 = ((hashNum >> 6) % 100) + "%";

    const svg = `
      <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="glow1" cx="${cx1}" cy="${cy1}" r="60%">
            <stop offset="0%" stop-color="${cat.color}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${cat.color}" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="glow2" cx="${cx2}" cy="${cy2}" r="70%">
            <stop offset="0%" stop-color="${cat.secondary}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${cat.secondary}" stop-opacity="0"/>
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${cat.color}" stroke-width="0.5" opacity="0.3"/>
          </pattern>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="${cat.secondary}" opacity="0.4"/>
          </pattern>
        </defs>
        
        <!-- Deep color tint overlay to establish mood -->
        <rect width="800" height="450" fill="${cat.color}" opacity="0.3"/>
        <rect width="800" height="450" fill="#000000" opacity="0.2"/>
        
        <!-- Glowing cinematic lights -->
        <rect width="800" height="450" fill="url(#glow1)" style="mix-blend-mode: screen;"/>
        <rect width="800" height="450" fill="url(#glow2)" style="mix-blend-mode: screen;"/>
        
        <!-- Tech Overlays / UI Holograms (Abstract) -->
        <rect width="800" height="450" fill="url(#grid)"/>
        
        <!-- Random geometry based on hash to make it unique -->
        <rect x="${(hashNum % 700)}" y="${((hashNum >> 3) % 350)}" width="150" height="4" fill="${cat.secondary}" opacity="0.8"/>
        <rect x="${((hashNum >> 1) % 700)}" y="${((hashNum >> 4) % 350)}" width="80" height="4" fill="${cat.color}" opacity="0.8"/>
        <circle cx="${((hashNum >> 5) % 800)}" cy="${((hashNum >> 2) % 450)}" r="100" fill="none" stroke="${cat.secondary}" stroke-width="2" stroke-dasharray="10 5" opacity="0.5"/>
        <circle cx="${((hashNum >> 5) % 800)}" cy="${((hashNum >> 2) % 450)}" r="80" fill="none" stroke="${cat.color}" stroke-width="1" opacity="0.3"/>
        
        <!-- Faint dot pattern block -->
        <rect x="${((hashNum >> 6) % 600)}" y="${((hashNum >> 7) % 300)}" width="200" height="150" fill="url(#dots)"/>
        
        <!-- Glassmorphism abstract pane to add depth -->
        <rect x="50" y="300" width="700" height="100" rx="15" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <rect x="70" y="340" width="200" height="6" rx="3" fill="white" opacity="0.2"/>
        <rect x="70" y="360" width="400" height="4" rx="2" fill="white" opacity="0.1"/>
      </svg>
    `;
    
    const slug = slugify(course.title);
    const fileName = slug + '-' + Date.now() + '.png';
    const outPath = path.join(targetDir, fileName);
    
    // We compose the base image with the SVG
    await sharp(basePath)
      .resize(800, 450, { 
          fit: 'cover',
          position: ['entropy', 'attention', 'center'][hashNum % 3] // randomize focal point crop!
      })
      .modulate({
          brightness: 0.8, // Slightly darken the base for glowing overlays to pop
          saturation: 0.5  // Desaturate slightly so the category tint is prominent
      })
      .composite([{ input: Buffer.from(svg) }])
      .png()
      .toFile(outPath);
      
    console.log("Generated " + outPath);
    
    // Update DB
    course.thumbnail = '/uploads/' + fileName;
    await course.save();
    console.log("Updated DB for: " + course.title);
  }
  
  console.log("Hybrid Generation Complete.");
  mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    mongoose.disconnect();
});
