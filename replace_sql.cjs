const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldQuery = `SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC`;

const newQuery = `SELECT 
            s.email, 
            COALESCE((SELECT MAX(timestamp) FROM support_chat WHERE email = s.email), s.lastUpdated) as lastUpdated, 
            (SELECT text FROM support_chat WHERE email = s.email ORDER BY timestamp DESC LIMIT 1) as lastMessage, 
            s.status 
          FROM chat_sessions s 
          ORDER BY lastUpdated DESC`;

code = code.replaceAll(oldQuery, newQuery);
fs.writeFileSync('server.ts', code);
console.log('Done!');
