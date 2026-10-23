const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function element(tag) {
 const result = {tagName: tag, listeners: {}, children: [], style: {}, attributes: {},
  addEventListener(name, fn) {this.listeners[name] = fn;},
  appendChild(child) {this.children.push(child);},
  getAttribute(name) {return this.attributes[name];},
  setAttribute(name, value) {this.attributes[name] = value; this.setCount = (this.setCount || 0) + 1;}};
 Object.defineProperty(result, 'textContent', {get() {return this.text || '';}, set(value) {this.text = value; this.children = [];}});
 return result;
}
const ids = {};
for (const id of ['source-data', 'builder-status', 'preview-form', 'form-preview', 'source-summary', 'input-form-title', 'generated-definition', 'form-canvas', 'form-layout', 'selected-count', 'preview-placeholder']) ids[id] = element();
function walk(node, predicate) {
 if (predicate(node)) return node;
 for (const child of node.children || []) {const result = walk(child, predicate); if (result) return result;}
}
function find(id) {return ids[id] || walk(ids['form-canvas'], n => n.id === id);}
function action(root, text) {const button = walk(root, n => n.tagName === 'button' && n.textContent === text); assert(button, text); return button;}
function click(button) {assert(!button.disabled); button.listeners.click();}
function change(id, value, event = 'change') {const node = find(id); assert(node, id); node.value = value; node.listeners[event]();}
function card(id) {return walk(ids['form-canvas'], n => n.attributes && n.attributes['data-question-id'] === id);}
function generated() {return JSON.parse(ids['generated-definition'].textContent);}
ids['source-data'].value = encodeURIComponent(JSON.stringify({taskId: 'task-id', taskNumber: 'TASK001', questions: [
 {id: 'a'.repeat(32), supported: true, label: 'Summary', fieldType: 'singleLineText', options: {}},
 {id: 'b'.repeat(32), supported: false, label: 'Unsupported', fieldType: '', reason: 'Not supported'}
]}));
ids['form-preview'].attributes['data-src'] = '/esc?id=newpage&table=incident&sys_id=task-id&sysparm_scripted_preview=true';
const sent = [];
ids['form-preview'].contentWindow = {postMessage: message => sent.push(message)};
const win = {location: {origin: 'https://instance.example'}, addEventListener(name, fn) {this[name] = fn;}, removeEventListener(name) {delete this[name];}};
const context = {window: win, document: {readyState: 'complete', getElementById: find,
 createElement: element, createTextNode: text => ({text})}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../ui-pages/request-input-builder/client.js'), 'utf8'), context);
const frame = ids['form-preview'];
assert.equal(frame.attributes.src, undefined);
assert.equal(ids['form-canvas'].children.length, 1);
assert(ids['preview-form'].disabled);
click(action(ids['form-canvas'], '+ Add question'));
click(action(ids['form-canvas'], 'New question'));
assert(card('question_1'));
assert(ids['preview-form'].disabled);
change('question_1-label', 'New summary', 'input');
assert(!ids['preview-form'].disabled);
assert.equal(frame.attributes.src, undefined);
change('form-layout', '2');
assert.equal(ids['form-canvas'].children.length, 2);
click(action(ids['form-canvas'].children[1], '+ Add question'));
click(action(ids['form-canvas'].children[1], 'From variable'));
assert(card('question_2'));
assert(ids['preview-form'].disabled);
change('question_2-source', 'a'.repeat(32));
assert(!ids['preview-form'].disabled);
assert.equal(generated().elements[0].columns[1].elements[0].id, 'source-' + 'a'.repeat(32));
click(action(card('question_1'), 'Move right'));
assert.equal(generated().elements[0].columns[0].elements.length, 0);
assert.equal(generated().elements[0].columns[1].elements.length, 2);
click(action(card('question_1'), 'Move up'));
assert.equal(generated().elements[0].columns[1].elements[0].id, 'question_1');
change('form-layout', '1');
assert.equal(generated().elements[0].columns.length, 1);
assert.equal(generated().elements[0].columns[0].elements.length, 2);
// Configure a new choice question and require complete labels before preview.
change('question_1-type', 'selectBox');
assert(ids['preview-form'].disabled);
click(action(card('question_1'), '+ Add choice'));
change('question_1-choice_1', 'First', 'input');
assert(!ids['preview-form'].disabled);
assert.equal(generated().elements[0].columns[0].elements[0].options.choices[0].value, 'choice_1');
click(ids['preview-form']);
assert.equal(frame.attributes.src, frame.attributes['data-src']);
assert.equal(sent.length, 0);
frame.listeners.load(); assert.equal(sent[0].type, 'scripted-input-preview-ping');
win.message({origin: win.location.origin, source: frame.contentWindow, data: {type: 'scripted-input-preview-ready'}});
assert.equal(sent[1].type, 'scripted-input-preview');
assert.equal(sent[1].definition.elements[0].columns.length, 1);
assert.equal(sent[1].taskId, 'task-id');
click(ids['preview-form']);
assert.equal(frame.setCount, 1);
click(action(card('question_1'), 'Remove'));
assert(!card('question_1'));
assert.equal(generated().elements[0].columns[0].elements.length, 1);
assert.equal(frame.setCount, 1);
// Advanced output/counter may be omitted in a customized modal template.
delete ids['generated-definition'];
delete ids['selected-count'];
click(action(ids['form-canvas'], '+ Add question'));
click(action(ids['form-canvas'], 'New question'));
change('question_3-label', 'Still editable without optional outputs', 'input');
assert(!ids['preview-form'].disabled);
click(ids['preview-form']);
assert.equal(sent[sent.length - 1].definition.elements[0].columns[0].elements[1].label,
 'Still editable without optional outputs');
win.scriptedInputBuilderCleanup();
assert.equal(win.message, undefined);
console.log('Canvas UI checks passed: skeleton, add panel, new/source cards, configuration, columns, movement, merge, removal, on-demand preview, and cleanup.');
