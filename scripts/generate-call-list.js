#!/usr/bin/env node

/**
 * Generate call list HTML in standard format
 * Usage: node scripts/generate-call-list.js call-lists/my-data.json
 * Output: call-lists/my-list.html (based on filename field in JSON)
 */

const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const inputDir = path.dirname(process.argv[2]);
const filename = data.filename || 'call-list.html';
const output = process.argv[3] || path.join(inputDir, filename);

const template = (data) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #f8f8f8;
      color: #333;
      line-height: 1.5;
    }
    
    .header {
      background: white;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 1px solid #eee;
    }
    
    .header h1 {
      font-size: 26px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .header p {
      font-size: 12px;
      color: #999;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    
    .section {
      margin-bottom: 45px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 15px;
      font-weight: 600;
    }
    
    .section-header .emoji {
      font-size: 18px;
    }
    
    .section-header .count {
      margin-left: auto;
      font-size: 12px;
      color: #999;
      font-weight: normal;
    }
    
    .cards {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    
    .card {
      background: white;
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 16px;
      align-items: start;
    }
    
    .card:last-child {
      border-bottom: none;
    }
    
    .card-number {
      font-size: 18px;
      font-weight: 600;
      color: #999;
      min-width: 30px;
      padding-top: 2px;
    }
    
    .card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .card-name-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    
    .card-name {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .card-role {
      font-size: 12px;
      color: #888;
    }
    
    .card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #666;
    }
    
    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      background: #f5f5f5;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .meta-badge.hot { background: #ffebee; color: #d32f2f; }
    .meta-badge.warm { background: #fff3e0; color: #f57c00; }
    .meta-badge.cold { background: #e3f2fd; color: #1e5a96; }
    
    .card-wants {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    .card-wants strong {
      color: #333;
    }
    
    .card-note {
      font-size: 12px;
      color: #999;
      font-style: italic;
      margin-top: 2px;
    }
    
    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    
    .btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .btn:hover {
      background: #fafafa;
      border-color: #bbb;
    }
    
    .footer {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin-top: 40px;
      padding: 20px 0;
    }
    
    @media (max-width: 600px) {
      .card {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .card-number { order: -1; }
      .card-meta { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <p>${data.subtitle}</p>
  </div>
  
  <div class="container">
    ${data.sections.map(section => `
    <div class="section">
      <div class="section-header">
        <span class="emoji">${section.emoji}</span>
        <span>${section.title}</span>
        <span class="count">${section.contacts.length} contact${section.contacts.length === 1 ? '' : 's'}</span>
      </div>
      <div class="cards">
        ${section.contacts.map((contact, idx) => `
        <div class="card">
          <div class="card-number">${contact.number}</div>
          <div class="card-content">
            <div class="card-name-row">
              <span class="card-name">${contact.name}</span>
              <span class="card-role">${contact.role}</span>
            </div>
            <div class="card-meta">
              ${contact.phone ? `<span>${contact.phone}</span>` : ''}
              ${contact.email ? `<span>${contact.email}</span>` : ''}
              ${contact.overdue ? `<span class="meta-badge ${section.type}">⚡ ${contact.overdue}</span>` : ''}
              ${contact.location ? `<span class="meta-badge">${contact.location}</span>` : ''}
            </div>
            <div class="card-wants"><strong>Wants:</strong> ${contact.wants}</div>
            <div class="card-note">${contact.note}</div>
            <div class="card-actions">
              <button class="btn">Called</button>
              <button class="btn">Follow-up</button>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    `).join('')}
  </div>
  
  <div class="footer">
    ${data.footer}
  </div>
</body>
</html>`;

fs.writeFileSync(output, template(data));
const relPath = path.relative(process.cwd(), output);
console.log(`✅ Generated: ${relPath}`);
