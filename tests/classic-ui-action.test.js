const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let isNew = false, rendered = 0, opened, message;
const context = {
 g_form: {isNewRecord: () => isNew, getUniqueValue: () => 'a'.repeat(32), addInfoMessage: text => {message = text;}},
 GlideModal: function (page, readonly, width) {
  opened = {page, width, preferences: {}};
  this.setTitle = title => {opened.title = title;};
  this.setPreference = (name, value) => {opened.preferences[name] = value;};
  this.render = () => {rendered++;};
 }
};
vm.createContext(context);
const script = fs.readFileSync(require('path').join(__dirname, '../ui-actions/request-input.js'), 'utf8');
vm.runInContext(script, context);
vm.runInContext('openRequestInputBuilder();', context);
assert.equal(opened.page, 'request_input_builder');
assert.equal(opened.preferences.sysparm_task_id, 'a'.repeat(32));
assert.equal(rendered, 1);
isNew = true; context.openRequestInputBuilder();
assert.equal(rendered, 1);
assert(message.includes('Save the task'));
console.log('Classic UI Action checks passed: modal launch, task preference, and new-record guard.');
