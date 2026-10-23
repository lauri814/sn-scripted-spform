const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function element() {
 return {listeners: {}, children: [], style: {}, attributes: {},
  addEventListener(name, fn) {this.listeners[name] = fn;},
  appendChild(child) {this.children.push(child);},
  getAttribute(name) {return this.attributes[name];},
  setAttribute(name, value) {this.attributes[name] = value; this.setCount = (this.setCount || 0) + 1;}};
}
const ids = {};
for (const id of ['source-data', 'builder-status', 'available-variables', 'preview-form', 'form-preview', 'source-summary', 'input-form-title', 'generated-definition']) ids[id] = element();
ids['source-data'].value = encodeURIComponent(JSON.stringify({taskId: 'task-id', taskNumber: 'TASK001', questions: [
 {id: 'question-id', supported: true, label: 'Summary', fieldType: 'singleLineText', options: {}}
]}));
ids['form-preview'].attributes['data-src'] = '/esc?id=newpage&table=incident&sys_id=task-id&sysparm_scripted_preview=true';
const sent = [];
ids['form-preview'].contentWindow = {postMessage: message => sent.push(message)};
const win = {location: {origin: 'https://instance.example'}, addEventListener(name, fn) {this[name] = fn;}};
const context = {window: win, document: {readyState: 'complete', getElementById: id => ids[id],
 createElement: element, createTextNode: text => ({text})}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../ui-pages/request-input-builder/client.js'), 'utf8'), context);
const frame = ids['form-preview'];
assert.equal(frame.attributes.src, undefined);
frame.listeners.load(); assert.equal(sent.length, 0);
const checkbox = ids['available-variables'].children[0].children[0].children[0];
checkbox.checked = true; checkbox.listeners.change();
assert.equal(frame.attributes.src, undefined);
ids['preview-form'].listeners.click();
assert.equal(frame.attributes.src, frame.attributes['data-src']);
assert.equal(frame.style.display, 'block');
assert.equal(sent.length, 0);
frame.listeners.load(); assert.equal(sent[0].type, 'scripted-input-preview-ping');
win.message({origin: win.location.origin, source: frame.contentWindow, data: {type: 'scripted-input-preview-ready'}});
assert.equal(sent[1].type, 'scripted-input-preview');
assert.equal(sent[1].taskId, 'task-id');
ids['preview-form'].listeners.click();
assert.equal(frame.setCount, 1);
assert.equal(sent[2].type, 'scripted-input-preview');
console.log('UI Page checks passed: no initial portal load, selection-only isolation, on-demand load, handshake, and iframe reuse.');
