const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let initialized;
const context = {api: {}, angular: {forEach: (obj, fn) => Object.keys(obj).forEach(k => fn(obj[k], k))}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../widget/client.js'), 'utf8'), context);
const controller = {data: {myForm: {_fields: {
 summary: {type: 'string'}, approved: {type: 'boolean'}, details: {type: 'container_start'},
 group: {type: 'checkbox_container'}, info: {type: 'rich_text_label'}
}}}};
context.api.controller.call(controller, {$on: (name, fn) => {
 assert.equal(name, 'spModel.gForm.initialized'); initialized = fn;
}});
controller.save();
assert.equal(controller.pendingResponse, undefined);
initialized({}, {getValue: name => ({summary: 'Need input', approved: 'false'})[name]});
controller.save();
assert.deepEqual(JSON.parse(JSON.stringify(controller.pendingResponse)), {
 schemaVersion: 1, answers: {summary: 'Need input', approved: 'false'}
});
assert(controller.saveStatus.includes('not connected'));
console.log('Widget save placeholder checks passed: readiness, answer collection, non-answer exclusion, no persistence dependency.');

let messageHandler, dispose;
const notifications = [], renders = [], timeouts = [];
const parent = {postMessage: (message, origin) => notifications.push({message, origin})};
const win = {parent, location: {origin: 'https://instance.example'},
 addEventListener: (name, fn) => {messageHandler = fn;},
 removeEventListener: (name, fn) => {assert.equal(fn, messageHandler); messageHandler = null;}};
const previewController = {data: {previewMode: true}, server: {get: request => {
 renders.push(request);
 return {then: success => success({data: {previewMode: true, myForm: {_fields: {summary: {type: 'string'}}}}})};
}}};
context.api.controller.call(previewController, {
 $on: (name, fn) => {if (name === '$destroy') dispose = fn;},
 $evalAsync: fn => fn()
}, win, fn => timeouts.push(fn));
assert.equal(notifications[0].message.type, 'scripted-input-preview-ready');
messageHandler({origin: 'https://other.example', source: parent, data: {type: 'scripted-input-preview'}});
assert.equal(renders.length, 0);
messageHandler({origin: win.location.origin, source: {}, data: {type: 'scripted-input-preview'}});
assert.equal(renders.length, 0);
messageHandler({origin: win.location.origin, source: parent, data: {
 type: 'scripted-input-preview', taskId: 'task-id', definition: {schemaVersion: 1}
}});
assert.equal(renders.length, 1);
assert.equal(renders[0].taskId, 'task-id');
assert.equal(previewController.render, false);
timeouts.shift()();
assert.equal(previewController.render, true);
previewController.save();
assert.equal(previewController.pendingResponse, null);
dispose(); assert.equal(messageHandler, null);
// Ordinary instances do not register a preview listener.
let ordinaryListeners = 0;
context.api.controller.call({data: {}}, {$on: () => {}}, {
 addEventListener: () => {ordinaryListeners++;}
}, () => {});
assert.equal(ordinaryListeners, 0);
console.log('Unified widget checks passed: preview mode, message origin/window, remount, disabled save, cleanup, and normal-mode isolation.');
