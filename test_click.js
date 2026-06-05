const { JSDOM } = require('jsdom');
const fs = require('fs');

const content = fs.readFileSync('views/pages/admin/courses/modules.ejs', 'utf-8');
// Mock EJS values
let html = content
  .replace(/<%= course\._id %>/g, 'mock_course_id')
  .replace(/<%- include.*?%>/g, '');
  
// Strip all <% %> EJS logic blocks
html = html.replace(/<%[\s\S]*?%>/g, '');

const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, { runScripts: "dangerously" });
const window = dom.window;
const document = window.document;

setTimeout(() => {
  const btn = document.querySelector('button[onclick="openModulePanel()"]');
  if(btn) {
    console.log("Button found, clicking...");
    try {
      btn.click();
      console.log("Panel visibility:", document.getElementById('modulePanel').style.visibility);
      console.log("Backdrop visibility:", document.getElementById('slideOverBackdrop').style.visibility);
    } catch(e) {
      console.error("Error on click:", e);
    }
  } else {
    console.log("Button not found");
  }
}, 1000);
