// Run: node tests/builder.test.js. Exercises model generation, not ServiceNow UI.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const context = {Class: {create: () => function () {this.initialize.apply(this, arguments);}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../script-includes/ScriptedFormBuilder.js'), 'utf8'), context);
const Builder = context.ScriptedFormBuilder;
const b = new Builder();
b.singleLineText('before', 'Before')
 .containerStart('details', 'Details', {displayTitle: true, hashKey: 'section-key'})
 .multiLineText('description', 'Description')
 .checkbox('approved', 'Approved', {mandatory: true, hashKey: 'checkbox-key'})
 .containerSplit({hashKey: 'column-key'})
 .selectBox('priority', 'Priority', {value: '1', choices: [{label: 'High', value: '1', hashKey: 'choice-key'}]})
 .containerEnd().reference('owner', 'Owner', {reference: 'sys_user'});
const m = b.build();
assert.equal(m._sections.length, 3);
assert.equal(m._sections[1].columns.length, 2);
assert.equal(m._sections[1].hashKey, 'section-key');
assert.equal(m._sections[1].columns[1].hashKey, 'column-key');
assert.equal(m._fields.priority.choices[0].hashKey, 'choice-key');
assert.equal(m._fields.approved._parent, 'checkbox_group_approved');
assert.equal(m._fields.checkbox_group_approved._parent, 'details');
assert.deepEqual(Array.from(m._fields.details._children), ['description', 'checkbox_group_approved', 'priority']);
assert.equal(m._view[1].variables[1].variables[0].name, 'approved');
assert.equal(m._fields.priority.displayValue, 'High');
assert.equal(m._fields.owner.ed.reference, 'sys_user');
assert(!JSON.stringify(m).includes('sys_id')); // Table option names excluded in this fixture.
m._fields.before.value = 'changed';
assert.equal(b.build()._fields.before.value, '');
assert.throws(() => b.singleLineText('before', 'Duplicate'));
assert.throws(() => new Builder().containerSplit());
assert.throws(() => new Builder().containerEnd());
assert.throws(() => new Builder().containerStart('open', 'Open').build());
assert.throws(() => new Builder().containerStart('outer', '').containerStart('inner', ''));
assert.throws(() => new Builder().attachment('file', 'File'));
assert.equal(typeof Builder.prototype.uiPage, 'undefined');
assert.equal(typeof Builder.prototype.tableName, 'undefined');
assert.throws(() => new Builder().numericScale('bad', 'Bad', {min: 5, max: 1}));
assert.throws(() => new Builder().multipleChoice('bad', '', {value: 'x', choices: []}));
const all = new Builder();
for (const method of ['wideSingleLineText', 'html', 'richTextLabel', 'ipAddress', 'date', 'dateTime', 'duration', 'url', 'email', 'label', 'breakField', 'masked', 'numericScale', 'yesNo']) {
 all[method](method.replace(/[A-Z]/g, c => '_' + c.toLowerCase()), method);
}
all.listCollector('users', 'Users', {reference: 'sys_user'})
 .requestedFor('requested_for', 'Requested For')
 .lookupSelectBox('lookup', 'Lookup', {lookup_table: 'sys_user', choices: [{label: 'Example', value: 'example'}]})
 .lookupMultipleChoice('lookup_radio', 'Lookup radio', {choices: []})
 .multipleChoice('radio', 'Radio', {choices: []})
 .custom('custom', '', {widget: {template: '<p>Custom</p>', data: {}}})
 .customWithLabel('custom_label', 'Custom', {widget: {template: '<p>Custom</p>', data: {}}});
assert.equal(all.build()._fields.requested_for.validate_on_change, false);
const attachment = new Builder({attachmentGuid: 'temporary-target'}).attachment('file', 'File').build();
assert.equal(attachment._attachmentGUID, 'temporary-target');
assert.equal(attachment._fields.file.attributes.max_file_size, '20');
console.log('Builder generation checks passed: renderers, layout, checkbox hierarchy, choices, identities, copies, and invalid inputs.');

context.data = {};
context.gs = {generateGUID: () => "0123456789abcdef0123456789abcdef"};
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../widget/server.js'), 'utf8'), context);
assert(context.data.myForm._fields.single_line_text);
assert.equal(context.data.myForm._sections[1].columns.length, 2);
console.log('Widget example generates successfully.');

assert.equal(context.data.myForm._fields.attachment.type, "sc_attachment");
assert.equal(context.data.myForm._attachmentGUID, context.gs.generateGUID());
