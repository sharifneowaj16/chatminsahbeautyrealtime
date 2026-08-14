import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const evidence=fs.readFileSync('evidence/phase31-meta-social-crm/06-instagram-legacy-audit.md','utf8');
const files=fs.readdirSync('lib/meta/instagram').filter((f)=>f.endsWith('.ts'));
test('every Instagram legacy module is represented by the audit',()=>{ for(const file of files) assert.match(evidence,new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))); });
test('audit maps all production provider calls',()=>{ assert.match(evidence,/profiles\.ts/); assert.match(evidence,/sendProviderReply/); assert.match(evidence,/private_replies/); assert.match(evidence,/messages/); });
test('audit freezes 5.6 through 5.9 responsibilities',()=>{ for(const item of ['5.6','5.7','5.8','5.9']) assert.match(evidence,new RegExp(`\\*\\*${item}:`)); });
test('audit records duplicate side-effect and whitespace gaps',()=>{ assert.match(evidence,/duplicate receipt can therefore revisit side effects/); assert.match(evidence,/whitespace rejection/); });
