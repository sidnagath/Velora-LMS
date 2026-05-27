const fs = require('fs');
const path = require('path');
const https = require('https');

const baseDir = path.join(__dirname, 'scripts', 'base_images');

if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

// 5 high-quality developer workspace photos
const images = [
    { name: 'base1.jpg', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80' },
    { name: 'base2.jpg', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80' },
    { name: 'base3.jpg', url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80' },
    { name: 'base4.jpg', url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80' },
    { name: 'base5.jpg', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80' }
];

async function download() {
    for (const img of images) {
        const dest = path.join(baseDir, img.name);
        if (fs.existsSync(dest)) {
            console.log(img.name + ' already exists. Skipping.');
            continue;
        }
        
        console.log('Downloading ' + img.name + '...');
        
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            https.get(img.url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        });
    }
    
    // Copy the two previously generated AI images over as well
    const ai1 = 'C:\\\\Users\\\\sidna\\\\.gemini\\\\antigravity\\\\brain\\\\0bcf523b-1c27-4ac8-ba7e-86d9bead40ab\\\\thumbnail_html_1779778612364.png';
    const ai2 = 'C:\\\\Users\\\\sidna\\\\.gemini\\\\antigravity\\\\brain\\\\0bcf523b-1c27-4ac8-ba7e-86d9bead40ab\\\\thumbnail_css_1779778642601.png';
    
    if (fs.existsSync(ai1)) fs.copyFileSync(ai1, path.join(baseDir, 'base6.png'));
    if (fs.existsSync(ai2)) fs.copyFileSync(ai2, path.join(baseDir, 'base7.png'));
    
    console.log("All base images are ready.");
}

download().catch(console.error);
