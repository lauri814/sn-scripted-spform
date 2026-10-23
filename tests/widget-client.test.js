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
